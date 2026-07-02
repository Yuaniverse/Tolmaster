"use client";

import React, { useState, useMemo } from 'react';
import {
    CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { X, Play, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

// --- Types ---
interface DualPairInputs {
    // Pair 1
    hole1Mean: number;
    hole1Tol: number;
    hole1CP: number;
    shaft1Mean: number;
    shaft1Tol: number;
    shaft1CP: number;
    // Pair 2
    hole2Mean: number;
    hole2Tol: number;
    hole2CP: number;
    shaft2Mean: number;
    shaft2Tol: number;
    shaft2CP: number;
    // Pitch
    paMean: number;
    paTol: number;
    paCP: number;
    pbMean: number;
    pbTol: number;
    pbCP: number;
}

interface MonteCarloResult {
    meanMargin: number;
    minMargin: number;
    maxMargin: number;
    pFailure: number; // P(Margin < 0)
    samples: Float32Array;
}

interface DualPairAnalysisModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// --- Helper Functions ---
let _normalSpare: number | null = null;
const randomNormal = (mean: number, stdDev: number) => {
    if (_normalSpare !== null) {
        const val = mean + _normalSpare * stdDev;
        _normalSpare = null;
        return val;
    }
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    const mag = Math.sqrt(-2.0 * Math.log(u));
    _normalSpare = mag * Math.sin(2.0 * Math.PI * v);
    return mean + mag * Math.cos(2.0 * Math.PI * v) * stdDev;
};

// Convert a (two-sided, centered) process capability Cp to sigma.
// The UI collects "CP", and this formula σ = Tolerance / (3·Cp) is the Cp
// definition (no mean shift), NOT Cpk — hence the name.
const cpToSigma = (tolerance: number, cp: number): number => {
    if (cp <= 0) {
        // Non-positive Cp is undefined; fall back to Cp = 1 (σ = Tol/3).
        console.warn(`Invalid Cp (${cp}) treated as 1.0 (σ = Tol/3).`);
        return tolerance / 3;
    }
    return tolerance / (3 * cp);
};

// Inverse Standard Normal Distribution (for CPK calculation)
const normSInv = (p: number): number => {
    const a1 = -3.969683028665376e+01;
    const a2 = 2.209460984245205e+02;
    const a3 = -2.759285104469687e+02;
    const a4 = 1.383577518672690e+02;
    const a5 = -3.066479806614716e+01;
    const a6 = 2.506628277459239e+00;

    const b1 = -5.447609879822406e+01;
    const b2 = 1.615858368580409e+02;
    const b3 = -1.556989798598866e+02;
    const b4 = 6.680131188771972e+01;
    const b5 = -1.328068155288572e+01;

    const c1 = -7.784894002430293e-03;
    const c2 = -3.223964580411365e-01;
    const c3 = -2.400758277161838e+00;
    const c4 = -2.549732539343734e+00;
    const c5 = 4.374664141464968e+00;
    const c6 = 2.938163982698783e+00;

    const d1 = 7.784695709041462e-03;
    const d2 = 3.224671290700398e-01;
    const d3 = 2.445134137142996e+00;
    const d4 = 3.754408661907416e+00;

    const p_low = 0.02425;
    const p_high = 1 - p_low;
    let q, r;

    if (p < 0 || p > 1) {
        return NaN;
    } else if (p < p_low) {
        q = Math.sqrt(-2 * Math.log(p));
        return (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
            ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
    } else if (p <= p_high) {
        q = p - 0.5;
        r = q * q;
        return (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q /
            (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
    } else {
        q = Math.sqrt(-2 * Math.log(1 - p));
        return -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
            ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
    }
};

// --- Component ---
export default function DualPairAnalysisModal({ isOpen, onClose }: DualPairAnalysisModalProps) {
    const [inputs, setInputs] = useState<DualPairInputs>({
        // Pair 1 defaults
        hole1Mean: 10.0,
        hole1Tol: 0.05,
        hole1CP: 1.0,
        shaft1Mean: 9.95,
        shaft1Tol: 0.02,
        shaft1CP: 1.0,
        // Pair 2 defaults
        hole2Mean: 10.0,
        hole2Tol: 0.05,
        hole2CP: 1.0,
        shaft2Mean: 9.95,
        shaft2Tol: 0.02,
        shaft2CP: 1.0,
        // Pitch defaults
        paMean: 100.0,
        paTol: 0.02,
        paCP: 1.0,
        pbMean: 100.0,
        pbTol: 0.02,
        pbCP: 1.0,
    });

    const [mcResult, setMcResult] = useState<MonteCarloResult | null>(null);
    const [isRunning, setIsRunning] = useState(false);

    // --- Worst Case Calculation (Real-time) ---
    const wcResult = useMemo(() => {
        // C1_min = (Hole1_min - Shaft1_max)
        const hole1Min = inputs.hole1Mean - inputs.hole1Tol;
        const hole1Max = inputs.hole1Mean + inputs.hole1Tol;
        const shaft1Min = inputs.shaft1Mean - inputs.shaft1Tol;
        const shaft1Max = inputs.shaft1Mean + inputs.shaft1Tol;

        const c1Min = hole1Min - shaft1Max;
        const c1Max = hole1Max - shaft1Min;

        // C2
        const hole2Min = inputs.hole2Mean - inputs.hole2Tol;
        const hole2Max = inputs.hole2Mean + inputs.hole2Tol;
        const shaft2Min = inputs.shaft2Mean - inputs.shaft2Tol;
        const shaft2Max = inputs.shaft2Mean + inputs.shaft2Tol;

        const c2Min = hole2Min - shaft2Max;
        const c2Max = hole2Max - shaft2Min;

        // ΔP_max: worst case pitch mismatch
        const paMin = inputs.paMean - inputs.paTol;
        const paMax = inputs.paMean + inputs.paTol;
        const pbMin = inputs.pbMean - inputs.pbTol;
        const pbMax = inputs.pbMean + inputs.pbTol;

        // Maximum possible |PA - PB|
        const deltaPMax = Math.max(
            Math.abs(paMax - pbMin),
            Math.abs(paMin - pbMax)
        );

        // WC Margin (worst case uses minimum clearances and maximum pitch error)
        const wcMargin = (c1Min + c2Min) / 2 - deltaPMax;

        // Best case margin
        const bcMargin = (c1Max + c2Max) / 2 - 0; // Best case: zero pitch mismatch

        return {
            c1Min: c1Min.toFixed(4),
            c1Max: c1Max.toFixed(4),
            c2Min: c2Min.toFixed(4),
            c2Max: c2Max.toFixed(4),
            deltaPMax: deltaPMax.toFixed(4),
            wcMargin: wcMargin.toFixed(4),
            bcMargin: bcMargin.toFixed(4),
            isFeasible: wcMargin >= 0
        };
    }, [inputs]);

    // --- Monte Carlo Simulation ---
    const runMonteCarlo = () => {
        setIsRunning(true);

        // Use setTimeout to allow UI to update
        setTimeout(() => {
            const N = 5000000;
            const margins = new Float32Array(N);

            const h1Sigma = cpToSigma(inputs.hole1Tol, inputs.hole1CP);
            const s1Sigma = cpToSigma(inputs.shaft1Tol, inputs.shaft1CP);
            const h2Sigma = cpToSigma(inputs.hole2Tol, inputs.hole2CP);
            const s2Sigma = cpToSigma(inputs.shaft2Tol, inputs.shaft2CP);
            const paSigma = cpToSigma(inputs.paTol, inputs.paCP);
            const pbSigma = cpToSigma(inputs.pbTol, inputs.pbCP);

            let sum = 0;
            let min = Infinity;
            let max = -Infinity;
            let failCount = 0;

            for (let i = 0; i < N; i++) {
                // Sample Pair 1
                const hole1 = randomNormal(inputs.hole1Mean, h1Sigma);
                const shaft1 = randomNormal(inputs.shaft1Mean, s1Sigma);
                const c1 = hole1 - shaft1;

                // Sample Pair 2
                const hole2 = randomNormal(inputs.hole2Mean, h2Sigma);
                const shaft2 = randomNormal(inputs.shaft2Mean, s2Sigma);
                const c2 = hole2 - shaft2;

                // Sample Pitch
                const pa = randomNormal(inputs.paMean, paSigma);
                const pb = randomNormal(inputs.pbMean, pbSigma);
                const deltaP = Math.abs(pa - pb);

                // Calculate Margin
                const margin = (c1 + c2) / 2 - deltaP;
                margins[i] = margin;

                sum += margin;
                if (margin < min) min = margin;
                if (margin > max) max = margin;
                if (margin < 0) failCount++;
            }

            const meanMargin = sum / N;
            const pFailure = (failCount / N) * 100;

            setMcResult({
                meanMargin,
                minMargin: min,
                maxMargin: max,
                pFailure,
                samples: margins
            });

            setIsRunning(false);
        }, 50);
    };

    const updateInput = (field: keyof DualPairInputs, value: number) => {
        setInputs(prev => ({ ...prev, [field]: value }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Dual-Pair Shared Clearance Analysis</h2>
                        <p className="text-xs text-slate-500 mt-0.5">評估兩組孔-軸配合對共同吸收節距誤差的可行性</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-slate-200 rounded transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">

                    {/* Formula Reference */}
                    <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-800">
                        <strong>Core Formula:</strong> Margin = (C1 + C2) / 2 − ΔP &nbsp;|&nbsp;
                        C = Hole − Shaft (diameter clearance) &nbsp;|&nbsp;
                        ΔP = |PA − PB| (pitch mismatch)
                    </div>

                    {/* Input Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                        {/* Pair 1 */}
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                            <h3 className="font-semibold text-slate-700 mb-3 text-sm border-b pb-2">Hole–Shaft Pair #1</h3>
                            <div className="space-y-2">
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <span className="text-slate-500 self-center font-medium">Hole1</span>
                                    <div>
                                        <label className="text-slate-400 block">Mean</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            className="w-full border rounded px-2 py-1 text-sm"
                                            value={inputs.hole1Mean}
                                            onChange={(e) => updateInput('hole1Mean', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-slate-400 block">Tol (±)</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            className="w-full border rounded px-2 py-1 text-sm"
                                            value={inputs.hole1Tol}
                                            onChange={(e) => updateInput('hole1Tol', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <span></span>
                                    <div>
                                        <label className="text-slate-400 block">CP</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            className="w-full border rounded px-2 py-1 text-sm bg-blue-50"
                                            value={inputs.hole1CP}
                                            onChange={(e) => updateInput('hole1CP', parseFloat(e.target.value) || 1)}
                                        />
                                    </div>
                                    <span></span>
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-xs mt-2">
                                    <span className="text-slate-500 self-center font-medium">Shaft1</span>
                                    <div>
                                        <label className="text-slate-400 block">Mean</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            className="w-full border rounded px-2 py-1 text-sm"
                                            value={inputs.shaft1Mean}
                                            onChange={(e) => updateInput('shaft1Mean', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-slate-400 block">Tol (±)</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            className="w-full border rounded px-2 py-1 text-sm"
                                            value={inputs.shaft1Tol}
                                            onChange={(e) => updateInput('shaft1Tol', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <span></span>
                                    <div>
                                        <label className="text-slate-400 block">CP</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            className="w-full border rounded px-2 py-1 text-sm bg-blue-50"
                                            value={inputs.shaft1CP}
                                            onChange={(e) => updateInput('shaft1CP', parseFloat(e.target.value) || 1)}
                                        />
                                    </div>
                                    <span></span>
                                </div>
                            </div>
                        </div>

                        {/* Pair 2 */}
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                            <h3 className="font-semibold text-slate-700 mb-3 text-sm border-b pb-2">Hole–Shaft Pair #2</h3>
                            <div className="space-y-2">
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <span className="text-slate-500 self-center font-medium">Hole2</span>
                                    <div>
                                        <label className="text-slate-400 block">Mean</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            className="w-full border rounded px-2 py-1 text-sm"
                                            value={inputs.hole2Mean}
                                            onChange={(e) => updateInput('hole2Mean', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-slate-400 block">Tol (±)</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            className="w-full border rounded px-2 py-1 text-sm"
                                            value={inputs.hole2Tol}
                                            onChange={(e) => updateInput('hole2Tol', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <span></span>
                                    <div>
                                        <label className="text-slate-400 block">CP</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            className="w-full border rounded px-2 py-1 text-sm bg-blue-50"
                                            value={inputs.hole2CP}
                                            onChange={(e) => updateInput('hole2CP', parseFloat(e.target.value) || 1)}
                                        />
                                    </div>
                                    <span></span>
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-xs mt-2">
                                    <span className="text-slate-500 self-center font-medium">Shaft2</span>
                                    <div>
                                        <label className="text-slate-400 block">Mean</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            className="w-full border rounded px-2 py-1 text-sm"
                                            value={inputs.shaft2Mean}
                                            onChange={(e) => updateInput('shaft2Mean', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-slate-400 block">Tol (±)</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            className="w-full border rounded px-2 py-1 text-sm"
                                            value={inputs.shaft2Tol}
                                            onChange={(e) => updateInput('shaft2Tol', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <span></span>
                                    <div>
                                        <label className="text-slate-400 block">CP</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            className="w-full border rounded px-2 py-1 text-sm bg-blue-50"
                                            value={inputs.shaft2CP}
                                            onChange={(e) => updateInput('shaft2CP', parseFloat(e.target.value) || 1)}
                                        />
                                    </div>
                                    <span></span>
                                </div>
                            </div>
                        </div>

                        {/* Pitch */}
                        <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                            <h3 className="font-semibold text-amber-800 mb-3 text-sm border-b border-amber-200 pb-2">Pitch (節距)</h3>
                            <div className="space-y-2">
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <span className="text-amber-700 self-center font-medium">PA</span>
                                    <div>
                                        <label className="text-amber-600 block">Mean</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            className="w-full border border-amber-300 rounded px-2 py-1 text-sm"
                                            value={inputs.paMean}
                                            onChange={(e) => updateInput('paMean', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-amber-600 block">Tol (±)</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            className="w-full border border-amber-300 rounded px-2 py-1 text-sm"
                                            value={inputs.paTol}
                                            onChange={(e) => updateInput('paTol', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <span></span>
                                    <div>
                                        <label className="text-amber-600 block">CP</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            className="w-full border border-amber-300 rounded px-2 py-1 text-sm bg-amber-100"
                                            value={inputs.paCP}
                                            onChange={(e) => updateInput('paCP', parseFloat(e.target.value) || 1)}
                                        />
                                    </div>
                                    <span></span>
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-xs mt-2">
                                    <span className="text-amber-700 self-center font-medium">PB</span>
                                    <div>
                                        <label className="text-amber-600 block">Mean</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            className="w-full border border-amber-300 rounded px-2 py-1 text-sm"
                                            value={inputs.pbMean}
                                            onChange={(e) => updateInput('pbMean', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-amber-600 block">Tol (±)</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            className="w-full border border-amber-300 rounded px-2 py-1 text-sm"
                                            value={inputs.pbTol}
                                            onChange={(e) => updateInput('pbTol', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <span></span>
                                    <div>
                                        <label className="text-amber-600 block">CP</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            className="w-full border border-amber-300 rounded px-2 py-1 text-sm bg-amber-100"
                                            value={inputs.pbCP}
                                            onChange={(e) => updateInput('pbCP', parseFloat(e.target.value) || 1)}
                                        />
                                    </div>
                                    <span></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Worst Case Results */}
                    <div className="bg-slate-100 rounded-lg p-3 border border-slate-300">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
                                <Info className="w-4 h-4" />
                                Worst Case Analysis (即時)
                            </h3>
                            {wcResult.isFeasible ? (
                                <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium bg-emerald-100 px-2 py-0.5 rounded">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Feasible
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-red-600 text-xs font-medium bg-red-100 px-2 py-0.5 rounded">
                                    <AlertTriangle className="w-3.5 h-3.5" /> Interference Risk
                                </span>
                            )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                            <div>
                                <span className="text-slate-500">C1 Range:</span>
                                <span className="text-slate-800 font-medium ml-1">[{wcResult.c1Min}, {wcResult.c1Max}]</span>
                            </div>
                            <div>
                                <span className="text-slate-500">C2 Range:</span>
                                <span className="text-slate-800 font-medium ml-1">[{wcResult.c2Min}, {wcResult.c2Max}]</span>
                            </div>
                            <div>
                                <span className="text-slate-500">ΔP Max:</span>
                                <span className="text-amber-700 font-medium ml-1">{wcResult.deltaPMax}</span>
                            </div>
                            <div>
                                <span className="text-slate-500 font-semibold">WC Margin:</span>
                                <span className={`font-bold ml-1 ${parseFloat(wcResult.wcMargin) >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                    {wcResult.wcMargin}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Run Button */}
                    <div className="flex justify-center">
                        <button
                            onClick={runMonteCarlo}
                            disabled={isRunning}
                            className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-6 py-2.5 rounded-lg shadow-md flex items-center gap-2 font-medium transition-all"
                        >
                            {isRunning ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Running (5M iterations)...
                                </>
                            ) : (
                                <>
                                    <Play className="w-4 h-4 fill-current" />
                                    Run Monte Carlo Analysis
                                </>
                            )}
                        </button>
                    </div>

                    {/* Monte Carlo Results */}
                    {mcResult && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            {/* Key Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {mcResult && (() => {
                                    // Calculate Equiv CPK from pFailure
                                    const pFailDecimal = mcResult.pFailure / 100; // Convert % to decimal
                                    const N = mcResult.samples.length;
                                    let equivCpk = 0;
                                    let cpkIsBound = false;
                                    if (pFailDecimal <= 0) {
                                        // 0 observed interferences: the MC run cannot resolve the true
                                        // rate, so report the rule-of-three lower bound (p ≈ 3/N)
                                        // instead of normSInv(1) = +Infinity.
                                        equivCpk = Math.min(5.0, normSInv(1 - 3 / N) / 3);
                                        cpkIsBound = true;
                                    } else if (pFailDecimal < 1) {
                                        equivCpk = Math.min(5.0, normSInv(1 - pFailDecimal) / 3);
                                    }

                                    // Determine background color based on CPK
                                    let bgColor, borderColor, textColor;
                                    if (equivCpk < 1.0) {
                                        bgColor = 'bg-red-50';
                                        borderColor = 'border-red-200';
                                        textColor = 'text-red-700';
                                    } else if (equivCpk < 1.33) {
                                        bgColor = 'bg-blue-50';
                                        borderColor = 'border-blue-200';
                                        textColor = 'text-blue-700';
                                    } else {
                                        bgColor = 'bg-emerald-50';
                                        borderColor = 'border-emerald-200';
                                        textColor = 'text-emerald-700';
                                    }

                                    return (
                                        <div className={`p-3 rounded border ${bgColor} ${borderColor}`}>
                                            <div className="text-xs text-slate-500 uppercase font-semibold">P(Margin &lt; 0)</div>
                                            <div className={`text-2xl font-bold mt-1 ${textColor}`}>
                                                {mcResult.pFailure.toFixed(4)}%
                                            </div>
                                            <div className="text-xs text-slate-400 mt-0.5" title={cpkIsBound ? '0 個干涉觀察值：依 rule of three 顯示 95% 信賴下界 (p≈3/N)，實際 Cpk 可能更高。' : undefined}>
                                                Equiv. Cpk: {cpkIsBound ? '>' : ''}{equivCpk.toFixed(2)}
                                            </div>
                                        </div>
                                    );
                                })()}
                                <div className="p-3 rounded border bg-slate-50 border-slate-200">
                                    <div className="text-xs text-slate-500 uppercase font-semibold">Mean Margin</div>
                                    <div className="text-2xl font-bold mt-1 text-slate-700">{mcResult.meanMargin.toFixed(4)}</div>
                                </div>
                                <div className="p-3 rounded border bg-slate-50 border-slate-200">
                                    <div className="text-xs text-slate-500 uppercase font-semibold">Min Margin</div>
                                    <div className={`text-2xl font-bold mt-1 ${mcResult.minMargin < 0 ? 'text-red-600' : 'text-slate-700'}`}>
                                        {mcResult.minMargin.toFixed(4)}
                                    </div>
                                </div>
                                <div className="p-3 rounded border bg-slate-50 border-slate-200">
                                    <div className="text-xs text-slate-500 uppercase font-semibold">Max Margin</div>
                                    <div className="text-2xl font-bold mt-1 text-slate-700">{mcResult.maxMargin.toFixed(4)}</div>
                                </div>
                            </div>

                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-slate-200 bg-slate-50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
