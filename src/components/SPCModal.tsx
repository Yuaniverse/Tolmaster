import React, { useState, useMemo, useEffect } from 'react';
import {
    ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line,
    ScatterChart, Scatter, ReferenceLine
} from 'recharts';
import { Info, Calculator, ChevronRight, AlertTriangle } from 'lucide-react';

interface SPCModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: {
        id: string;
        name: string;
        nominal: number;
        tolPlus: number;
        tolMinus: number;
        cp?: number;
        isSymmetric: boolean;
        distribution: string; // Needed for initial state
        empiricalModel?: {    // Needed for restoring data
            samples: Float32Array;
            mean: number;
            std: number;
            n: number;
            rawInput?: string;
        };
    };
    onApply: (results: {
        nominal: number;
        cp: number;
        useEmpirical?: boolean;
        empiricalModel?: {
            samples: Float32Array;
            mean: number;
            std: number;
            n: number;
            rawInput?: string;
        };
    }) => void;
}

// --- Statistical Utilities ---

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
const mean = (arr: number[]) => sum(arr) / arr.length;
const stdDev = (arr: number[], mu?: number) => {
    const m = mu ?? mean(arr);
    const sqDiffs = arr.map(x => Math.pow(x - m, 2));
    return Math.sqrt(sum(sqDiffs) / (arr.length - 1));
};

// Normal PDF
const pdf = (x: number, mu: number, sigma: number) => {
    if (sigma <= 0) return 0;
    return (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mu) / sigma, 2));
};

// Standard Normal CDF (Error function approximation)
const stdNormCDF = (z: number) => {
    const b1 = 0.319381530;
    const b2 = -0.356563782;
    const b3 = 1.781477937;
    const b4 = -1.821255978;
    const b5 = 1.330274429;
    const p = 0.2316419;
    const t = 1.0 / (1.0 + p * Math.abs(z));
    const Z = (1.0 / Math.sqrt(2 * Math.PI)) * Math.exp(-z * z / 2);
    const prob = 1.0 - Z * (b1 * t + b2 * t * t + b3 * t * t * t + b4 * t * t * t * t + b5 * t * t * t * t * t);
    return z < 0 ? 1.0 - prob : prob;
};

// Inverse Normal CDF (Acklam / Witch of Agnesi approx or similar)
// We need it for Q-Q plot theoretical quantiles.
const normInv = (p: number): number => {
    const a1 = -3.969683028665376e+01, a2 = 2.209460984245205e+02,
        a3 = -2.759285104469687e+02, a4 = 1.383577518672690e+02,
        a5 = -3.066479806614716e+01, a6 = 2.506628277459239e+00;
    const b1 = -5.447609879822406e+01, b2 = 1.615858368580409e+02,
        b3 = -1.556989798598866e+02, b4 = 6.680131188771972e+01,
        b5 = -1.328068155288572e+01;
    const c1 = -7.784894002430293e-03, c2 = -3.223964580411365e-01,
        c3 = -2.400758277161838e+00, c4 = -2.549732539343734e+00,
        c5 = 4.374664141464968e+00, c6 = 2.938163982698783e+00;
    const d1 = 7.784695709041462e-03, d2 = 3.224671290700398e-01,
        d3 = 2.445134137142996e+00, d4 = 3.754408661907416e+00;

    const p_low = 0.02425;
    const p_high = 1 - p_low;

    let q, r;
    if (p < 0 || p > 1) return NaN;
    if (p < p_low) {
        q = Math.sqrt(-2 * Math.log(p));
        return (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
            ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
    } else if (p <= p_high) {
        q = p - 0.5; r = q * q;
        return (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q /
            (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
    } else {
        q = Math.sqrt(-2 * Math.log(1 - p));
        return -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
            ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
    }
};

// Anderson-Darling Test for Normality
// Test for Case 3: Unknown Mean and Variance (Standard Normality Test)
// Reference: Stephens, M. A. (1974). "EDF Statistics for Goodness of Fit and Some Comparisons"
const calcAndersonDarling = (data: number[]) => {
    const n = data.length;
    if (n < 4) return { statistic: 0, pValue: 1, valid: false };

    const m = mean(data);
    const s = stdDev(data, m);

    if (s === 0) return { statistic: 0, pValue: 0, valid: false };

    // 1. Sort and Standardize
    const sorted = [...data].sort((a, b) => a - b);
    const z = sorted.map(x => (x - m) / s);
    const p = z.map(stdNormCDF);

    // 2. Compute S
    // Stephens 1974: S = -n - (1/n) * sum_{i=1}^n [ (2i-1) * (ln(z_i) + ln(1 - z_{n+1-i})) ]
    // where z_i is CDF value of ordered stats.
    let sumS = 0;
    for (let i = 0; i < n; i++) {
        const oneBasedI = i + 1;
        const valA = Math.max(p[i], 1e-15);
        // z_{n+1-i}: if i=0 (1st item), we need z_{n+1-1} = z_n (last item). Index n-1.
        // if i=n-1, we need z_{n+1-(n)} = z_1 (first item). Index 0.
        // Wait, the formula pairs i with n+1-i.
        // e.g. n=5. i=1 pairs with 5. i=2 pairs with 4. i=3 pairs with 3.
        const valB = Math.max(1 - p[n - 1 - i], 1e-15);

        sumS += (2 * oneBasedI - 1) * (Math.log(valA) + Math.log(valB));
    }

    const A2 = -n - (1 / n) * sumS;

    // 3. Modified Statistic A* for unknown parameters (Stephens)
    const A2_star = A2 * (1 + 0.75 / n + 2.25 / (n * n));

    // 4. P-value approximation (Stephens 1974 / D'Agostino & Stephens 1986)
    let pValue = 0;
    if (A2_star >= 0.60) {
        pValue = Math.exp(1.2937 - 5.709 * A2_star + 0.0186 * A2_star * A2_star);
    } else if (A2_star >= 0.34) {
        pValue = Math.exp(0.9177 - 4.279 * A2_star - 1.38 * A2_star * A2_star);
    } else if (A2_star > 0.2) {
        pValue = 1 - Math.exp(-8.318 + 42.796 * A2_star - 59.938 * A2_star * A2_star);
    } else {
        pValue = 1 - Math.exp(-13.436 + 101.14 * A2_star - 223.73 * A2_star * A2_star);
    }

    return { statistic: A2_star, pValue, valid: true };
};

export default function SPCModal({ isOpen, onClose, item, onApply }: SPCModalProps) {
    const [rawData, setRawData] = useState('');
    const [stats, setStats] = useState<{ n: number; mean: number; sigma: number; cp: number; ad: { statistic: number; pValue: number; valid: boolean } } | null>(null);
    const [binCountInput, setBinCountInput] = useState<string>('');
    const [useEmpirical, setUseEmpirical] = useState(false);
    const [parsedNums, setParsedNums] = useState<number[]>([]);

    // Restore state when modal opens
    useEffect(() => {
        if (isOpen) {
            setRawData(item.empiricalModel?.rawInput || '');
            setUseEmpirical(item.distribution === 'Empirical');
        }
    }, [isOpen, item]);

    // Calculate on data change
    useEffect(() => {
        if (!rawData.trim()) {
            setStats(null);
            return;
        }

        // Parsing
        const tokens = rawData.split(/[\n\s,;，]+/);
        const nums = tokens.map(t => parseFloat(t)).filter(n => !isNaN(n));

        if (nums.length < 3) {
            setStats(null);
            setParsedNums([]);
            return;
        }

        // Store parsed numbers for empirical model
        setParsedNums(nums);

        // Statistics
        // Calculations on raw numeric measurement data (sign preserved)
        // No assumptions about "positive data".
        const n = nums.length;
        const mu = mean(nums);
        const sigma = stdDev(nums, mu);

        const totalTol = item.tolPlus + item.tolMinus;
        const halfTol = totalTol / 2;
        const cp = sigma === 0 ? 0 : halfTol / (3 * sigma);

        // Anderson-Darling
        const ad = calcAndersonDarling(nums);

        setStats({ n, mean: mu, sigma, cp, ad });

    }, [rawData, item.tolPlus, item.tolMinus]);

    // Charts
    const chartsData = useMemo(() => {
        if (!stats || !rawData) return null;
        const tokens = rawData.split(/[\n\s,;，]+/);
        const nums = tokens.map(t => parseFloat(t)).filter(n => !isNaN(n)).sort((a, b) => a - b);

        // Histogram
        let bins = parseInt(binCountInput);
        if (!bins || isNaN(bins)) {
            bins = Math.ceil(Math.sqrt(stats.n));
            if (bins < 8) bins = 8;
            if (bins > 60) bins = 60;
        }

        const minVal = nums[0];
        const maxVal = nums[nums.length - 1];
        const range = maxVal - minVal;
        // Add buffer
        const buffer = range * 0.1 || 1;
        const chartMin = minVal - buffer;
        const chartMax = maxVal + buffer;
        const binWidth = (chartMax - chartMin) / bins;

        const histData = Array.from({ length: bins }, (_, i) => {
            const binStart = chartMin + i * binWidth;
            const binEnd = binStart + binWidth;
            const mid = (binStart + binEnd) / 2;
            return {
                binStart,
                binEnd,
                mid,
                count: 0,
                normalY: stats.sigma > 0
                    ? pdf(mid, stats.mean, stats.sigma) * stats.n * binWidth
                    : 0 // Guard against sigma=0 => Infinity
            };
        });

        nums.forEach(val => {
            let idx = Math.floor((val - chartMin) / binWidth);
            if (idx < 0) idx = 0;
            if (idx >= bins) idx = bins - 1;
            histData[idx].count++;
        });

        // Q-Q Plot
        // Using standard plotting position (i - 0.5) / n or (i + 0.5) / n
        // Wikipedia suggests (k - 0.5)/n (where k=1..n)
        const qqData = nums.map((val, i) => {
            const k = i + 1;
            const p = (k - 0.5) / stats.n;
            const theory = normInv(p);
            return { x: theory, y: val };
        });

        // Reference Line: y = mu + sigma * x
        // Compute domain for the line
        const minZ = qqData.length > 0 ? qqData[0].x : -3;
        const maxZ = qqData.length > 0 ? qqData[qqData.length - 1].x : 3;

        const domainMinZ = minZ - 0.5;
        const domainMaxZ = maxZ + 0.5;

        const slope = stats.sigma;
        const intercept = stats.mean;

        return {
            histData,
            qqData,
            slope,
            intercept,
            minZ: domainMinZ,
            maxZ: domainMaxZ,
            binUsed: bins
        };
    }, [stats, rawData, binCountInput]);

    if (!isOpen) return null;

    const handleApply = () => {
        if (!stats) return;

        // Apply nominal without inferring direction.
        // newNominal = ProcessMean - effectiveMeanOffset
        const effectiveMeanOffset = (item.tolPlus - item.tolMinus) / 2;
        const newNominal = stats.mean - effectiveMeanOffset;

        // Build empirical model if user opted in
        const empiricalModel = useEmpirical && parsedNums.length > 0 ? {
            samples: new Float32Array(parsedNums),
            mean: stats.mean,
            std: stats.sigma,
            n: stats.n,
            rawInput: rawData // Persist raw input
        } : undefined;

        onApply({
            nominal: parseFloat(newNominal.toFixed(3)),
            cp: parseFloat(stats.cp.toFixed(2)),
            useEmpirical,
            empiricalModel
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Calculator className="w-5 h-5 text-blue-600" />
                            SPC Data Analysis
                        </h2>
                        <p className="text-sm text-slate-500">
                            Calibrate <strong>{item.name}</strong> using measurement data
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <span className="text-2xl">&times;</span>
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Left: Input */}
                    <div className="w-1/3 border-r flex flex-col bg-slate-50/50 h-full">
                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Raw Measurements
                                </label>
                                <div className="text-xs text-slate-500 mb-2">
                                    Paste raw measured values (sign preserved). Separators: newline, comma, space.
                                </div>
                                <textarea
                                    className="w-full h-64 p-4 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm resize-none"
                                    placeholder="Example:&#10;10.05&#10;10.02&#10;9.98&#10;..."
                                    value={rawData}
                                    onChange={e => setRawData(e.target.value)}
                                />
                                <div className="flex justify-between items-center mt-2">
                                    <span className="text-xs text-slate-400">
                                        {stats ? `Parsed ${stats.n} values` : 'Waiting for data...'}
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setRawData(`10.05 10.02 9.99 10.01 10.08 10.03 9.97 10.00 10.04 10.06`)}
                                            className="text-xs text-blue-500 hover:underline"
                                        >
                                            Demo Data
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {stats && (
                                <div className="bg-white p-4 rounded-lg border shadow-sm space-y-3">
                                    <div className="flex justify-between border-b pb-2">
                                        <span className="text-slate-500 text-sm">Mean (μ)</span>
                                        <span className="font-mono font-medium">{stats.mean.toFixed(4)}</span>
                                    </div>
                                    <div className="flex justify-between border-b pb-2">
                                        <span className="text-slate-500 text-sm">StdDev (σ)</span>
                                        <span className="font-mono font-medium">{stats.sigma.toFixed(4)}</span>
                                    </div>
                                    <div className="flex justify-between border-b pb-2">
                                        <span className="text-slate-500 text-sm">Est. CP</span>
                                        <span className={`font-mono font-bold ${stats.cp < 1.0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                            {stats.cp.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="pt-1">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-slate-500 text-sm flex items-center gap-1">
                                                Normality (AD)
                                                <span title="Anderson-Darling Test (p-value). Tests if data comes from a normal distribution. More sensitive to tail behavior than Shapiro-Wilk. p < 0.05 suggests non-normal.">
                                                    <Info className="w-3 h-3 text-slate-400" />
                                                </span>
                                            </span>
                                            <span className={`font-mono text-sm ${stats.ad.pValue < 0.05 ? 'text-amber-600' : 'text-slate-700'}`}>
                                                p = {stats.ad.pValue.toFixed(3)}
                                            </span>
                                        </div>
                                        {stats.ad.pValue < 0.05 && (
                                            <div className="text-[10px] text-amber-600 bg-amber-50 p-1.5 rounded flex items-start gap-1">
                                                <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                                                Data may not be normal. CP calculation assumes normality.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Fixed Footer */}
                        <div className="p-6 border-t bg-white z-10 space-y-3">
                            {/* Empirical Distribution Option */}
                            {stats && (
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={useEmpirical}
                                            onChange={(e) => setUseEmpirical(e.target.checked)}
                                            className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
                                        />
                                        <span className="text-sm text-slate-700">
                                            Use measured distribution for simulation
                                        </span>
                                    </label>
                                    {useEmpirical && stats.n < 20 && (
                                        <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded flex items-start gap-1">
                                            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                                            Small sample size (n={stats.n}). Empirical distribution results may be unreliable.
                                        </div>
                                    )}
                                </div>
                            )}
                            <button
                                disabled={!stats}
                                onClick={handleApply}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow transition-transform active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                Apply to Dimension
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Right: Visualization */}
                    <div className="w-2/3 p-6 bg-slate-50 flex flex-col gap-6 overflow-y-auto">
                        {chartsData ? (
                            <>
                                {/* Histogram */}
                                <div className="bg-white p-4 rounded-lg shadow-sm border h-[320px] flex flex-col">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-semibold text-slate-700 text-sm">Histogram & Normal Fit</h3>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-500">Bins:</span>
                                            <input
                                                type="number"
                                                className="w-16 border rounded px-2 py-0.5 text-xs text-right"
                                                placeholder={chartsData.binUsed.toString()}
                                                value={binCountInput}
                                                onChange={e => setBinCountInput(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex-1 w-full min-h-0">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={chartsData.histData}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                <XAxis
                                                    dataKey="mid"
                                                    tick={{ fontSize: 10 }}
                                                    tickFormatter={(v) => v.toFixed(2)}
                                                    label={{ value: 'Measured Value', position: 'bottom', offset: 0, fontSize: 10 }}
                                                />
                                                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                                                <Tooltip
                                                    contentStyle={{ fontSize: '12px', padding: '8px' }}
                                                    formatter={(value: any, name: string) => [value.toFixed(1), name === 'count' ? 'Count' : 'Expected']}
                                                    labelFormatter={(v) => `Val: ${parseFloat(v).toFixed(3)}`}
                                                />
                                                <Bar dataKey="count" fill="#3b82f6" opacity={0.6} barSize={20} name="Observed" />
                                                <Line type="monotone" dataKey="normalY" stroke="#ef4444" strokeWidth={2} dot={false} name="Normal Fit" />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Q-Q Plot */}
                                <div className="bg-white p-4 rounded-lg shadow-sm border h-[320px] flex flex-col">
                                    <h3 className="font-semibold text-slate-700 text-sm mb-4">Q-Q Plot (Normal Probability)</h3>
                                    <div className="flex-1 w-full min-h-0">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                                <XAxis
                                                    type="number"
                                                    dataKey="x"
                                                    name="Theoretical Quantile"
                                                    tick={{ fontSize: 10 }}
                                                    label={{ value: 'Theoretical Quantile (σ)', position: 'bottom', offset: 0, fontSize: 10 }}
                                                    domain={['auto', 'auto']}
                                                />
                                                <YAxis
                                                    type="number"
                                                    dataKey="y"
                                                    name="Observed Value"
                                                    tick={{ fontSize: 10 }}
                                                    domain={['auto', 'auto']}
                                                    label={{ value: 'Observed', angle: -90, position: 'insideLeft', fontSize: 10 }}
                                                />
                                                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ fontSize: '11px' }} />
                                                <Scatter name="Data" data={chartsData.qqData} fill="#2563eb" shape="circle" r={3} />

                                                {/* Reference Line: y = mu + sigma * x */}
                                                <ReferenceLine
                                                    segment={[
                                                        { x: chartsData.minZ, y: chartsData.slope * chartsData.minZ + chartsData.intercept },
                                                        { x: chartsData.maxZ, y: chartsData.slope * chartsData.maxZ + chartsData.intercept }
                                                    ]}
                                                    stroke="#ef4444"
                                                    strokeDasharray="5 5"
                                                    strokeWidth={2}
                                                    ifOverflow="extendDomain"
                                                />
                                            </ScatterChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                                <Calculator className="w-16 h-16" />
                                <p className="text-lg">Paste measurement data to view analysis</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
