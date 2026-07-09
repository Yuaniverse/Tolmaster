"use client";

import React, { useState, useMemo, useRef } from 'react';
import { X, Play, AlertTriangle, CheckCircle2 } from 'lucide-react';
import DualPairMCWorker from '../workers/dualPairMC.worker.ts?worker&inline';
import HelpTip from './HelpTip';
import { help } from '@/content/helpContent';

// --- Types ---
interface DualPairInputs {
    // Pair 1
    hole1Mean: number;
    hole1Tol: number;
    hole1Cp: number;
    shaft1Mean: number;
    shaft1Tol: number;
    shaft1Cp: number;
    // Pair 2
    hole2Mean: number;
    hole2Tol: number;
    hole2Cp: number;
    shaft2Mean: number;
    shaft2Tol: number;
    shaft2Cp: number;
    // Pitch
    paMean: number;
    paTol: number;
    paCp: number;
    pbMean: number;
    pbTol: number;
    pbCp: number;
}

interface MonteCarloResult {
    meanMargin: number;
    minMargin: number;
    maxMargin: number;
    pFailure: number; // P(Margin < 0)
}

interface DualPairAnalysisModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// --- Helper Functions ---

const cpToSigma = (tolerance: number, cp: number): number => {
    if (cp <= 0) return tolerance / 3;
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
        hole1Cp: 1.0,
        shaft1Mean: 9.95,
        shaft1Tol: 0.02,
        shaft1Cp: 1.0,
        // Pair 2 defaults
        hole2Mean: 10.0,
        hole2Tol: 0.05,
        hole2Cp: 1.0,
        shaft2Mean: 9.95,
        shaft2Tol: 0.02,
        shaft2Cp: 1.0,
        // Pitch defaults
        paMean: 100.0,
        paTol: 0.02,
        paCp: 1.0,
        pbMean: 100.0,
        pbTol: 0.02,
        pbCp: 1.0,
    });

    const [mcResult, setMcResult] = useState<MonteCarloResult | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const workerRef = useRef<Worker | null>(null);

    // --- Worst Case Calculation (Real-time) ---
    const wcResult = useMemo(() => {
        const c1Min = (inputs.hole1Mean - inputs.hole1Tol) - (inputs.shaft1Mean + inputs.shaft1Tol);
        const c1Max = (inputs.hole1Mean + inputs.hole1Tol) - (inputs.shaft1Mean - inputs.shaft1Tol);

        const c2Min = (inputs.hole2Mean - inputs.hole2Tol) - (inputs.shaft2Mean + inputs.shaft2Tol);
        const c2Max = (inputs.hole2Mean + inputs.hole2Tol) - (inputs.shaft2Mean - inputs.shaft2Tol);

        // Max |PA − PB| = |μA − μB| + tolA + tolB
        const deltaPMax = Math.abs(inputs.paMean - inputs.pbMean) + inputs.paTol + inputs.pbTol;

        // WC Margin (最保守：間隙最小 + 節距誤差最大)
        const wcMargin = (c1Min + c2Min) / 2 - deltaPMax;

        // 過盈判定
        const hasInterference = c1Min < 0 || c2Min < 0;

        return {
            c1Min: c1Min.toFixed(4),
            c1Max: c1Max.toFixed(4),
            c2Min: c2Min.toFixed(4),
            c2Max: c2Max.toFixed(4),
            deltaPMax: deltaPMax.toFixed(4),
            wcMargin: wcMargin.toFixed(4),
            isFeasible: wcMargin >= 0 && !hasInterference,
            hasInterference,
        };
    }, [inputs]);

    // --- Monte Carlo Simulation (Web Worker) ---
    const runMonteCarlo = () => {
        setIsRunning(true);
        workerRef.current?.terminate();

        const worker = new DualPairMCWorker();
        workerRef.current = worker;

        const N = 5_000_000;
        worker.onmessage = (e: MessageEvent<MonteCarloResult>) => {
            setMcResult(e.data);
            setIsRunning(false);
            worker.terminate();
        };
        worker.onerror = () => {
            setIsRunning(false);
            worker.terminate();
        };

        worker.postMessage({
            N,
            hole1Mean: inputs.hole1Mean, h1Sigma: cpToSigma(inputs.hole1Tol, inputs.hole1Cp),
            shaft1Mean: inputs.shaft1Mean, s1Sigma: cpToSigma(inputs.shaft1Tol, inputs.shaft1Cp),
            hole2Mean: inputs.hole2Mean, h2Sigma: cpToSigma(inputs.hole2Tol, inputs.hole2Cp),
            shaft2Mean: inputs.shaft2Mean, s2Sigma: cpToSigma(inputs.shaft2Tol, inputs.shaft2Cp),
            paMean: inputs.paMean, paSigma: cpToSigma(inputs.paTol, inputs.paCp),
            pbMean: inputs.pbMean, pbSigma: cpToSigma(inputs.pbTol, inputs.pbCp),
        });
    };

    const updateInput = (field: keyof DualPairInputs, value: number) => {
        setInputs(prev => ({ ...prev, [field]: value }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="card flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--surface-subtle)] p-4">
                    <div>
                        <div className="mono-label text-[var(--ink-3)]">Dual-pair interference solver</div>
                        <h2 className="mt-1 text-[15px] font-semibold text-[var(--ink-1)] inline-flex items-center gap-1.5">
                            Dual-Pair Shared Clearance Analysis
                            <HelpTip content={help['dp.overview']} maxWidth={300} />
                        </h2>
                        <p className="mt-1 text-[12px] text-[var(--ink-2)]">Evaluate whether two hole-shaft fits can absorb pitch mismatch together.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="iconbtn ghost"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 space-y-4 overflow-y-auto bg-[var(--canvas)] p-4">

                    {/* Formula Reference */}
                    <div className="card pad text-[12px] text-[var(--ink-2)]">
                        <span className="label mr-2">Core formula</span>
                        Margin = (C1 + C2) / 2 − ΔP &nbsp;|&nbsp;
                        C = Hole − Shaft (diameter clearance) &nbsp;|&nbsp;
                        ΔP = |PA − PB| (pitch mismatch)
                    </div>

                    {/* Input Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                        {/* Pair 1 */}
                        <div className="card pad">
                            <h3 className="border-b border-[var(--line)] pb-2 text-[13px] font-semibold text-[var(--ink-1)]">Hole-Shaft Pair #1</h3>
                            <div className="space-y-2">
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <span className="mono-label self-center text-[var(--ink-3)]">Hole1</span>
                                    <div>
                                        <label className="mono-label block text-[var(--ink-3)]">Mean</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            className="input right w-full"
                                            value={inputs.hole1Mean}
                                            onChange={(e) => updateInput('hole1Mean', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                    <div>
                                        <label className="mono-label block text-[var(--ink-3)]">Tol ±</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            className="input right w-full"
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
                                            className="input right w-full"
                                            value={inputs.hole1Cp}
                                            onChange={(e) => updateInput('hole1Cp', parseFloat(e.target.value) || 1)}
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
                                            className="input right w-full"
                                            value={inputs.shaft1Mean}
                                            onChange={(e) => updateInput('shaft1Mean', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                    <div>
                                        <label className="mono-label block text-[var(--ink-3)]">Tol ±</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            className="input right w-full"
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
                                            className="input right w-full"
                                            value={inputs.shaft1Cp}
                                            onChange={(e) => updateInput('shaft1Cp', parseFloat(e.target.value) || 1)}
                                        />
                                    </div>
                                    <span></span>
                                </div>
                            </div>
                        </div>

                        {/* Pair 2 */}
                        <div className="card pad">
                            <h3 className="border-b border-[var(--line)] pb-2 text-[13px] font-semibold text-[var(--ink-1)]">Hole-Shaft Pair #2</h3>
                            <div className="space-y-2">
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <span className="mono-label self-center text-[var(--ink-3)]">Hole2</span>
                                    <div>
                                        <label className="mono-label block text-[var(--ink-3)]">Mean</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            className="input right w-full"
                                            value={inputs.hole2Mean}
                                            onChange={(e) => updateInput('hole2Mean', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                    <div>
                                        <label className="mono-label block text-[var(--ink-3)]">Tol ±</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            className="input right w-full"
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
                                            className="input right w-full"
                                            value={inputs.hole2Cp}
                                            onChange={(e) => updateInput('hole2Cp', parseFloat(e.target.value) || 1)}
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
                                            className="input right w-full"
                                            value={inputs.shaft2Mean}
                                            onChange={(e) => updateInput('shaft2Mean', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                    <div>
                                        <label className="mono-label block text-[var(--ink-3)]">Tol ±</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            className="input right w-full"
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
                                            className="input right w-full"
                                            value={inputs.shaft2Cp}
                                            onChange={(e) => updateInput('shaft2Cp', parseFloat(e.target.value) || 1)}
                                        />
                                    </div>
                                    <span></span>
                                </div>
                            </div>
                        </div>

                        {/* Pitch */}
                        <div className="card pad bg-[var(--warning-soft)] border-[var(--warning-line)]">
                            <h3 className="border-b border-[var(--warning)]/25 pb-2 text-[13px] font-semibold text-[var(--ink-1)]">Pitch Pair</h3>
                            <div className="space-y-2">
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <span className="mono-label self-center text-[var(--ink-2)]">PA</span>
                                    <div>
                                        <label className="mono-label block text-[var(--ink-3)]">Mean</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            className="input right w-full"
                                            value={inputs.paMean}
                                            onChange={(e) => updateInput('paMean', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                    <div>
                                        <label className="mono-label block text-[var(--ink-3)]">Tol ±</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            className="input right w-full"
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
                                            className="input right w-full"
                                            value={inputs.paCp}
                                            onChange={(e) => updateInput('paCp', parseFloat(e.target.value) || 1)}
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
                                            className="input right w-full"
                                            value={inputs.pbMean}
                                            onChange={(e) => updateInput('pbMean', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                    <div>
                                        <label className="mono-label block text-[var(--ink-3)]">Tol ±</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            className="input right w-full"
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
                                            className="input right w-full"
                                            value={inputs.pbCp}
                                            onChange={(e) => updateInput('pbCp', parseFloat(e.target.value) || 1)}
                                        />
                                    </div>
                                    <span></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Worst Case Results */}
                    <div className="card pad">
                        <div className="mb-2 flex items-center justify-between">
                            <h3 className="flex items-center gap-2 text-[13px] font-semibold text-[var(--ink-1)]">
                                Worst Case Analysis (即時)
                            </h3>
                            {wcResult.isFeasible ? (
                                <span className="badge badge--success">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Feasible
                                </span>
                            ) : wcResult.hasInterference ? (
                                <span className="badge badge--danger">
                                    <AlertTriangle className="w-3.5 h-3.5" /> Direct Interference
                                </span>
                            ) : (
                                <span className="badge badge--danger">
                                    <AlertTriangle className="w-3.5 h-3.5" /> Pitch Interference
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
                                <span className="mono-label text-[var(--ink-3)] inline-flex items-center gap-1">
                                    ΔP Max
                                    <HelpTip content={help['dp.deltaPMax']} maxWidth={240} iconClassName="h-3 w-3 opacity-50" />
                                </span>
                                <div className="mt-1 font-ui-mono text-[var(--warning)]">{wcResult.deltaPMax}</div>
                            </div>
                            <div>
                                <span className="mono-label text-[var(--ink-3)] inline-flex items-center gap-1">
                                    WC Margin
                                    <HelpTip content={help['dp.wcMargin']} maxWidth={260} iconClassName="h-3 w-3 opacity-50" />
                                </span>
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
                            className="btn btn--primary disabled:cursor-not-allowed disabled:opacity-45"
                        >
                            {isRunning ? (
                                <>
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
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
                                    const N_MC = 5_000_000;
                                    const pFailDecimal = mcResult.pFailure / 100;
                                    const pClamped = Math.max(0.5 / N_MC, Math.min(1 - 0.5 / N_MC, pFailDecimal));
                                    const z = normSInv(1 - pClamped);
                                    const equivCpk = z / 3;

                                    // Determine status based on CPK
                                    let stripeClass, textColor;
                                    if (equivCpk < 1.0) {
                                        stripeClass = 'danger';
                                        textColor = 'text-[var(--danger)]';
                                    } else if (equivCpk < 1.33) {
                                        stripeClass = 'warning';
                                        textColor = 'text-[var(--warning)]';
                                    } else {
                                        stripeClass = 'success';
                                        textColor = 'text-[var(--success)]';
                                    }

                                    return (
                                        <div className="card stat">
                                            <div className={`stripe ${stripeClass}`} />
                                            <div className="mono-label text-[var(--ink-3)] inline-flex items-center gap-1">
                                                P(Margin &lt; 0)
                                                <HelpTip content={help['dp.pMarginFail']} maxWidth={260} iconClassName="h-3 w-3 opacity-50" />
                                            </div>
                                            <div className={`mt-1 font-ui-mono text-[26px] font-semibold ${textColor}`}>
                                                {mcResult.pFailure.toFixed(4)}%
                                            </div>
                                            <div className="mt-0.5 font-ui-mono text-[11px] text-[var(--ink-3)]">
                                                Equiv. Cpk: {equivCpk > 6 ? '>6.00' : equivCpk.toFixed(2)}
                                            </div>
                                        </div>
                                    );
                                })()}
                                <div className="card pad">
                                    <div className="mono-label text-[var(--ink-3)] inline-flex items-center gap-1">Mean Margin <HelpTip content={help['dp.margins']} maxWidth={260} iconClassName="h-3 w-3 opacity-50" /></div>
                                    <div className="mt-1 font-ui-mono text-[26px] font-semibold text-[var(--ink-1)]">{mcResult.meanMargin.toFixed(4)}</div>
                                </div>
                                <div className="card pad">
                                    <div className="mono-label text-[var(--ink-3)]">Min Margin</div>
                                    <div className={`mt-1 font-ui-mono text-[26px] font-semibold ${mcResult.minMargin < 0 ? 'text-[var(--danger)]' : 'text-[var(--ink-1)]'}`}>
                                        {mcResult.minMargin.toFixed(4)}
                                    </div>
                                </div>
                                <div className="card pad">
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
                        className="btn btn--secondary"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
