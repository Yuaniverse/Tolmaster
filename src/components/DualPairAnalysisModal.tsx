"use client";

import React, { useState, useMemo } from 'react';
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

const cpkToSigma = (tolerance: number, cpk: number): number => {
    // σ = Tolerance / (3 × Cpk)
    if (cpk <= 0) return tolerance / 3;
    return tolerance / (3 * cpk);
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

            const h1Sigma = cpkToSigma(inputs.hole1Tol, inputs.hole1CP);
            const s1Sigma = cpkToSigma(inputs.shaft1Tol, inputs.shaft1CP);
            const h2Sigma = cpkToSigma(inputs.hole2Tol, inputs.hole2CP);
            const s2Sigma = cpkToSigma(inputs.shaft2Tol, inputs.shaft2CP);
            const paSigma = cpkToSigma(inputs.paTol, inputs.paCP);
            const pbSigma = cpkToSigma(inputs.pbTol, inputs.pbCP);

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[oklch(20%_0.01_240_/_0.52)] p-4 backdrop-blur-sm">
            <div className="hairline-card flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[10px]">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--surface-subtle)] p-4">
                    <div>
                        <div className="mono-label text-[var(--ink-3)]">Dual-pair interference solver</div>
                        <h2 className="mt-1 text-[15px] font-semibold text-[var(--ink-1)]">Dual-Pair Shared Clearance Analysis</h2>
                        <p className="mt-1 text-[12px] text-[var(--ink-2)]">Evaluate whether two hole-shaft fits can absorb pitch mismatch together.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="sunken inline-flex h-8 w-8 items-center justify-center text-[var(--ink-2)] transition-colors hover:border-[var(--accent-line)] hover:text-[var(--accent)]"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 space-y-4 overflow-y-auto bg-[var(--canvas)] p-4">

                    {/* Formula Reference */}
                    <div className="rounded-[10px] border border-[var(--accent-line)] bg-[var(--accent-soft)] p-3 text-[12px] text-[var(--ink-2)]">
                        <span className="mono-label mr-2 text-[var(--accent)]">Core formula</span>
                        Margin = (C1 + C2) / 2 − ΔP &nbsp;|&nbsp;
                        C = Hole − Shaft (diameter clearance) &nbsp;|&nbsp;
                        ΔP = |PA − PB| (pitch mismatch)
                    </div>

                    {/* Input Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                        {/* Pair 1 */}
                        <div className="hairline-card p-3">
                            <h3 className="border-b border-[var(--line)] pb-2 text-[13px] font-semibold text-[var(--ink-1)]">Hole-Shaft Pair #1</h3>
                            <div className="space-y-2">
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <span className="mono-label self-center text-[var(--ink-3)]">Hole1</span>
                                    <div>
                                        <label className="mono-label block text-[var(--ink-3)]">Mean</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            className="field-shell font-ui-mono w-full px-2 py-1 text-right text-[12px] outline-none"
                                            value={inputs.hole1Mean}
                                            onChange={(e) => updateInput('hole1Mean', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                    <div>
                                        <label className="mono-label block text-[var(--ink-3)]">Tol ±</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            className="field-shell font-ui-mono w-full px-2 py-1 text-right text-[12px] outline-none"
                                            value={inputs.hole1Tol}
                                            onChange={(e) => updateInput('hole1Tol', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <span></span>
                                    <div>
                                        <label className="mono-label block text-[var(--ink-3)]">Cp</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            className="field-shell font-ui-mono w-full bg-[var(--surface-subtle)] px-2 py-1 text-right text-[12px] outline-none"
                                            value={inputs.hole1CP}
                                            onChange={(e) => updateInput('hole1CP', parseFloat(e.target.value) || 1)}
                                        />
                                    </div>
                                    <span></span>
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-xs mt-2">
                                    <span className="mono-label self-center text-[var(--ink-3)]">Shaft1</span>
                                    <div>
                                        <label className="mono-label block text-[var(--ink-3)]">Mean</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            className="field-shell font-ui-mono w-full px-2 py-1 text-right text-[12px] outline-none"
                                            value={inputs.shaft1Mean}
                                            onChange={(e) => updateInput('shaft1Mean', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                    <div>
                                        <label className="mono-label block text-[var(--ink-3)]">Tol ±</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            className="field-shell font-ui-mono w-full px-2 py-1 text-right text-[12px] outline-none"
                                            value={inputs.shaft1Tol}
                                            onChange={(e) => updateInput('shaft1Tol', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <span></span>
                                    <div>
                                        <label className="mono-label block text-[var(--ink-3)]">Cp</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            className="field-shell font-ui-mono w-full bg-[var(--surface-subtle)] px-2 py-1 text-right text-[12px] outline-none"
                                            value={inputs.shaft1CP}
                                            onChange={(e) => updateInput('shaft1CP', parseFloat(e.target.value) || 1)}
                                        />
                                    </div>
                                    <span></span>
                                </div>
                            </div>
                        </div>

                        {/* Pair 2 */}
                        <div className="hairline-card p-3">
                            <h3 className="border-b border-[var(--line)] pb-2 text-[13px] font-semibold text-[var(--ink-1)]">Hole-Shaft Pair #2</h3>
                            <div className="space-y-2">
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <span className="mono-label self-center text-[var(--ink-3)]">Hole2</span>
                                    <div>
                                        <label className="mono-label block text-[var(--ink-3)]">Mean</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            className="field-shell font-ui-mono w-full px-2 py-1 text-right text-[12px] outline-none"
                                            value={inputs.hole2Mean}
                                            onChange={(e) => updateInput('hole2Mean', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                    <div>
                                        <label className="mono-label block text-[var(--ink-3)]">Tol ±</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            className="field-shell font-ui-mono w-full px-2 py-1 text-right text-[12px] outline-none"
                                            value={inputs.hole2Tol}
                                            onChange={(e) => updateInput('hole2Tol', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <span></span>
                                    <div>
                                        <label className="mono-label block text-[var(--ink-3)]">Cp</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            className="field-shell font-ui-mono w-full bg-[var(--surface-subtle)] px-2 py-1 text-right text-[12px] outline-none"
                                            value={inputs.hole2CP}
                                            onChange={(e) => updateInput('hole2CP', parseFloat(e.target.value) || 1)}
                                        />
                                    </div>
                                    <span></span>
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-xs mt-2">
                                    <span className="mono-label self-center text-[var(--ink-3)]">Shaft2</span>
                                    <div>
                                        <label className="mono-label block text-[var(--ink-3)]">Mean</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            className="field-shell font-ui-mono w-full px-2 py-1 text-right text-[12px] outline-none"
                                            value={inputs.shaft2Mean}
                                            onChange={(e) => updateInput('shaft2Mean', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                    <div>
                                        <label className="mono-label block text-[var(--ink-3)]">Tol ±</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            className="field-shell font-ui-mono w-full px-2 py-1 text-right text-[12px] outline-none"
                                            value={inputs.shaft2Tol}
                                            onChange={(e) => updateInput('shaft2Tol', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <span></span>
                                    <div>
                                        <label className="mono-label block text-[var(--ink-3)]">Cp</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            className="field-shell font-ui-mono w-full bg-[var(--surface-subtle)] px-2 py-1 text-right text-[12px] outline-none"
                                            value={inputs.shaft2CP}
                                            onChange={(e) => updateInput('shaft2CP', parseFloat(e.target.value) || 1)}
                                        />
                                    </div>
                                    <span></span>
                                </div>
                            </div>
                        </div>

                        {/* Pitch */}
                        <div className="rounded-[10px] border border-[var(--warning)]/35 bg-[var(--warning-soft)] p-3">
                            <h3 className="border-b border-[var(--warning)]/25 pb-2 text-[13px] font-semibold text-[var(--ink-1)]">Pitch Pair</h3>
                            <div className="space-y-2">
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <span className="mono-label self-center text-[var(--ink-2)]">PA</span>
                                    <div>
                                        <label className="mono-label block text-[var(--ink-3)]">Mean</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            className="field-shell font-ui-mono w-full px-2 py-1 text-right text-[12px] outline-none"
                                            value={inputs.paMean}
                                            onChange={(e) => updateInput('paMean', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                    <div>
                                        <label className="mono-label block text-[var(--ink-3)]">Tol ±</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            className="field-shell font-ui-mono w-full px-2 py-1 text-right text-[12px] outline-none"
                                            value={inputs.paTol}
                                            onChange={(e) => updateInput('paTol', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <span></span>
                                    <div>
                                        <label className="mono-label block text-[var(--ink-3)]">Cp</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            className="field-shell font-ui-mono w-full bg-[var(--surface-subtle)] px-2 py-1 text-right text-[12px] outline-none"
                                            value={inputs.paCP}
                                            onChange={(e) => updateInput('paCP', parseFloat(e.target.value) || 1)}
                                        />
                                    </div>
                                    <span></span>
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-xs mt-2">
                                    <span className="mono-label self-center text-[var(--ink-2)]">PB</span>
                                    <div>
                                        <label className="mono-label block text-[var(--ink-3)]">Mean</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            className="field-shell font-ui-mono w-full px-2 py-1 text-right text-[12px] outline-none"
                                            value={inputs.pbMean}
                                            onChange={(e) => updateInput('pbMean', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                    <div>
                                        <label className="mono-label block text-[var(--ink-3)]">Tol ±</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            className="field-shell font-ui-mono w-full px-2 py-1 text-right text-[12px] outline-none"
                                            value={inputs.pbTol}
                                            onChange={(e) => updateInput('pbTol', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <span></span>
                                    <div>
                                        <label className="mono-label block text-[var(--ink-3)]">Cp</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            className="field-shell font-ui-mono w-full bg-[var(--surface-subtle)] px-2 py-1 text-right text-[12px] outline-none"
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
                    <div className="hairline-card p-3">
                        <div className="mb-2 flex items-center justify-between">
                            <h3 className="flex items-center gap-2 text-[13px] font-semibold text-[var(--ink-1)]">
                                <Info className="h-4 w-4 text-[var(--ink-3)]" />
                                Worst Case Analysis (即時)
                            </h3>
                            {wcResult.isFeasible ? (
                                <span className="mono-label flex items-center gap-1 rounded-[999px] bg-[var(--success-soft)] px-2 py-1 text-[var(--success)]">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Feasible
                                </span>
                            ) : (
                                <span className="mono-label flex items-center gap-1 rounded-[999px] bg-[var(--danger-soft)] px-2 py-1 text-[var(--danger)]">
                                    <AlertTriangle className="w-3.5 h-3.5" /> Interference Risk
                                </span>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-[12px] md:grid-cols-4">
                            <div>
                                <span className="mono-label text-[var(--ink-3)]">C1 Range</span>
                                <div className="mt-1 font-ui-mono text-[var(--ink-1)]">[{wcResult.c1Min}, {wcResult.c1Max}]</div>
                            </div>
                            <div>
                                <span className="mono-label text-[var(--ink-3)]">C2 Range</span>
                                <div className="mt-1 font-ui-mono text-[var(--ink-1)]">[{wcResult.c2Min}, {wcResult.c2Max}]</div>
                            </div>
                            <div>
                                <span className="mono-label text-[var(--ink-3)]">ΔP Max</span>
                                <div className="mt-1 font-ui-mono text-[var(--warning)]">{wcResult.deltaPMax}</div>
                            </div>
                            <div>
                                <span className="mono-label text-[var(--ink-3)]">WC Margin</span>
                                <div className={`mt-1 font-ui-mono text-[15px] font-semibold ${parseFloat(wcResult.wcMargin) >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                                    {wcResult.wcMargin}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Run Button */}
                    <div className="flex justify-center">
                        <button
                            onClick={runMonteCarlo}
                            disabled={isRunning}
                            className="inline-flex items-center gap-2 rounded-[6px] bg-[var(--accent)] px-6 py-2.5 font-semibold text-[var(--chrome)] transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
                        >
                            {isRunning ? (
                                <>
                                    <div className="h-4 w-4 animate-spin rounded-[6px] border-2 border-[var(--chrome)] border-t-transparent" />
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
                            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                {mcResult && (() => {
                                    // Calculate Equiv CPK from pFailure
                                    const pFailDecimal = mcResult.pFailure / 100; // Convert % to decimal
                                    let equivCpk = 0;
                                    if (pFailDecimal < 1) {
                                        const z = normSInv(1 - pFailDecimal);
                                        equivCpk = z / 3;
                                    }

                                    // Determine background color based on CPK
                                    let bgColor, borderColor, textColor;
                                    if (equivCpk < 1.0) {
                                        bgColor = 'bg-[var(--danger-soft)]';
                                        borderColor = 'border-[var(--danger)]/35';
                                        textColor = 'text-[var(--danger)]';
                                    } else if (equivCpk < 1.33) {
                                        bgColor = 'bg-[var(--warning-soft)]';
                                        borderColor = 'border-[var(--warning)]/35';
                                        textColor = 'text-[var(--warning)]';
                                    } else {
                                        bgColor = 'bg-[var(--success-soft)]';
                                        borderColor = 'border-[var(--success)]/25';
                                        textColor = 'text-[var(--success)]';
                                    }

                                    return (
                                        <div className={`rounded-[10px] border p-3 ${bgColor} ${borderColor}`}>
                                            <div className="mono-label text-[var(--ink-3)]">P(Margin &lt; 0)</div>
                                            <div className={`mt-1 font-ui-mono text-[26px] font-semibold ${textColor}`}>
                                                {mcResult.pFailure.toFixed(4)}%
                                            </div>
                                            <div className="mt-0.5 font-ui-mono text-[11px] text-[var(--ink-3)]">
                                                Equiv. Cpk: {equivCpk.toFixed(2)}
                                            </div>
                                        </div>
                                    );
                                })()}
                                <div className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-3">
                                    <div className="mono-label text-[var(--ink-3)]">Mean Margin</div>
                                    <div className="mt-1 font-ui-mono text-[26px] font-semibold text-[var(--ink-1)]">{mcResult.meanMargin.toFixed(4)}</div>
                                </div>
                                <div className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-3">
                                    <div className="mono-label text-[var(--ink-3)]">Min Margin</div>
                                    <div className={`mt-1 font-ui-mono text-[26px] font-semibold ${mcResult.minMargin < 0 ? 'text-[var(--danger)]' : 'text-[var(--ink-1)]'}`}>
                                        {mcResult.minMargin.toFixed(4)}
                                    </div>
                                </div>
                                <div className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-3">
                                    <div className="mono-label text-[var(--ink-3)]">Max Margin</div>
                                    <div className="mt-1 font-ui-mono text-[26px] font-semibold text-[var(--ink-1)]">{mcResult.maxMargin.toFixed(4)}</div>
                                </div>
                            </div>

                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end border-t border-[var(--line)] bg-[var(--surface-subtle)] p-3">
                    <button
                        onClick={onClose}
                        className="sunken px-4 py-1.5 text-[12px] font-medium text-[var(--ink-2)] transition-colors hover:border-[var(--accent-line)] hover:text-[var(--accent)]"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
