import React from 'react';

type HistogramDatum = {
  mid: number;
  count: number;
  normalY?: number;
};

type HorizontalBarDatum = {
  name: string;
  value: number;
};

type ScatterDatum = {
  x: number;
  y: number;
};

const svgTextClass = 'fill-[var(--ink-3)] text-[9.5px] font-medium';
const monoClass = 'font-ui-mono tracking-[0.08em]';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const formatTick = (value: number, digits = 2) => {
  if (!Number.isFinite(value)) return '--';
  return value.toFixed(digits);
};

const buildTicks = (min: number, max: number, count: number) => {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (Math.abs(max - min) < 1e-9) return [min];
  return Array.from({ length: count }, (_, index) => min + ((max - min) * index) / (count - 1));
};

interface HistogramChartProps {
  data: HistogramDatum[];
  xLabel: string;
  mean?: number;
  target?: number;
  specLower?: number;
  specUpper?: number;
  accentHue?: number;
  emptyLabel?: string;
}

export function HistogramChart({
  data,
  xLabel,
  mean,
  target,
  specLower,
  specUpper,
  accentHue = 200,
  emptyLabel = 'No data available.'
}: HistogramChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-full items-center justify-center rounded-[10px] border border-dashed border-[var(--line)] bg-[var(--surface-subtle)] px-6 text-center text-[12px] text-[var(--ink-3)]">
        {emptyLabel}
      </div>
    );
  }

  const width = 760;
  const height = 320;
  const padding = { top: 24, right: 28, bottom: 42, left: 50 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const mids = data.map((item) => item.mid);
  const counts = data.map((item) => item.count);
  const normalYValues = data.map((item) => item.normalY ?? 0);

  let xMin = Math.min(...mids);
  let xMax = Math.max(...mids);
  [mean, target, specLower, specUpper].forEach((value) => {
    if (Number.isFinite(value)) {
      xMin = Math.min(xMin, value as number);
      xMax = Math.max(xMax, value as number);
    }
  });

  if (Math.abs(xMax - xMin) < 1e-9) {
    xMin -= 1;
    xMax += 1;
  }

  const maxCount = Math.max(...counts, ...normalYValues, 1);
  const binStep = data.length > 1 ? Math.abs(data[1].mid - data[0].mid) : (xMax - xMin) / 12;
  const barWidth = clamp((binStep / (xMax - xMin)) * plotWidth * 0.86, 2, 24);

  const scaleX = (value: number) => padding.left + ((value - xMin) / (xMax - xMin)) * plotWidth;
  const scaleY = (value: number) => padding.top + plotHeight - (value / maxCount) * plotHeight;

  const xTicks = buildTicks(xMin, xMax, 5);
  const yTicks = buildTicks(0, maxCount, 5);

  const normalPath = data
    .filter((item) => Number.isFinite(item.normalY))
    .map((item, index) => `${index === 0 ? 'M' : 'L'} ${scaleX(item.mid)} ${scaleY(item.normalY ?? 0)}`)
    .join(' ');

  const shadeLeft = Number.isFinite(specLower) ? Math.max(0, scaleX(specLower as number) - padding.left) : 0;
  const shadeRight = Number.isFinite(specUpper) ? Math.max(0, width - padding.right - scaleX(specUpper as number)) : 0;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
      <rect x="0" y="0" width={width} height={height} rx="10" fill="var(--surface)" />
      <rect x={padding.left} y={padding.top} width={plotWidth} height={plotHeight} fill="var(--surface)" />

      {shadeLeft > 0 && (
        <rect
          x={padding.left}
          y={padding.top}
          width={shadeLeft}
          height={plotHeight}
          fill="var(--danger-soft)"
          opacity="0.55"
        />
      )}
      {shadeRight > 0 && (
        <rect
          x={scaleX(specUpper as number)}
          y={padding.top}
          width={shadeRight}
          height={plotHeight}
          fill="var(--danger-soft)"
          opacity="0.55"
        />
      )}

      {yTicks.map((tick) => (
        <g key={`y-${tick}`}>
          <line
            x1={padding.left}
            y1={scaleY(tick)}
            x2={width - padding.right}
            y2={scaleY(tick)}
            stroke="var(--line)"
            strokeDasharray="2 3"
          />
          <text x={padding.left - 8} y={scaleY(tick) + 3} textAnchor="end" className={`${svgTextClass} ${monoClass}`}>
            {formatTick(tick, tick >= 10 ? 0 : 1)}
          </text>
        </g>
      ))}

      {xTicks.map((tick) => (
        <g key={`x-${tick}`}>
          <line
            x1={scaleX(tick)}
            y1={padding.top}
            x2={scaleX(tick)}
            y2={padding.top + plotHeight}
            stroke="var(--line)"
            strokeDasharray="2 3"
          />
          <text x={scaleX(tick)} y={height - 14} textAnchor="middle" className={`${svgTextClass} ${monoClass}`}>
            {formatTick(tick, 2)}
          </text>
        </g>
      ))}

      <line x1={padding.left} y1={padding.top + plotHeight} x2={width - padding.right} y2={padding.top + plotHeight} stroke="var(--line-strong)" />
      <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + plotHeight} stroke="var(--line-strong)" />

      {data.map((item) => (
        <rect
          key={`bar-${item.mid}`}
          x={scaleX(item.mid) - barWidth / 2}
          y={scaleY(item.count)}
          width={barWidth}
          height={Math.max(0, padding.top + plotHeight - scaleY(item.count))}
          rx="1.5"
          fill={`oklch(95% 0.025 ${accentHue})`}
          stroke={`oklch(86% 0.06 ${accentHue})`}
        />
      ))}

      {normalPath && (
        <path
          d={normalPath}
          fill="none"
          stroke={`oklch(60% 0.13 ${accentHue})`}
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}

      {Number.isFinite(mean) && (
        <g>
          <line
            x1={scaleX(mean as number)}
            y1={padding.top}
            x2={scaleX(mean as number)}
            y2={padding.top + plotHeight}
            stroke={`oklch(60% 0.13 ${accentHue})`}
            strokeWidth="1.5"
          />
          <rect x={scaleX(mean as number) - 16} y={6} width="32" height="14" rx="4" fill={`oklch(60% 0.13 ${accentHue})`} />
          <text x={scaleX(mean as number)} y={16} textAnchor="middle" className="fill-white text-[8.5px] font-semibold font-ui-mono tracking-[0.12em]">
            MU
          </text>
        </g>
      )}

      {Number.isFinite(target) && (
        <g>
          <line
            x1={scaleX(target as number)}
            y1={padding.top}
            x2={scaleX(target as number)}
            y2={padding.top + plotHeight}
            stroke="var(--ink-3)"
            strokeDasharray="4 3"
            strokeWidth="1"
          />
          <text x={scaleX(target as number) + 5} y={padding.top + 12} className={`${svgTextClass} ${monoClass}`}>
            TARGET
          </text>
        </g>
      )}

      {Number.isFinite(specLower) && (
        <g>
          <line
            x1={scaleX(specLower as number)}
            y1={padding.top}
            x2={scaleX(specLower as number)}
            y2={padding.top + plotHeight}
            stroke="var(--danger)"
            strokeWidth="1"
          />
          <text x={scaleX(specLower as number) + 5} y={padding.top + 24} className="fill-[var(--danger)] text-[9px] font-semibold font-ui-mono tracking-[0.12em]">
            LSL
          </text>
        </g>
      )}

      {Number.isFinite(specUpper) && (
        <g>
          <line
            x1={scaleX(specUpper as number)}
            y1={padding.top}
            x2={scaleX(specUpper as number)}
            y2={padding.top + plotHeight}
            stroke="var(--danger)"
            strokeWidth="1"
          />
          <text x={scaleX(specUpper as number) + 5} y={padding.top + 24} className="fill-[var(--danger)] text-[9px] font-semibold font-ui-mono tracking-[0.12em]">
            USL
          </text>
        </g>
      )}

      <text x={padding.left + plotWidth / 2} y={height - 6} textAnchor="middle" className={`${svgTextClass} ${monoClass}`}>
        {xLabel}
      </text>
    </svg>
  );
}

interface HorizontalBarChartProps {
  data: HorizontalBarDatum[];
  valueSuffix?: string;
  accentHue?: number;
  emptyLabel?: string;
}

export function HorizontalBarChart({
  data,
  valueSuffix = '',
  accentHue = 75,
  emptyLabel = 'No contribution data.'
}: HorizontalBarChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-full items-center justify-center rounded-[10px] border border-dashed border-[var(--line)] bg-[var(--surface-subtle)] px-6 text-center text-[12px] text-[var(--ink-3)]">
        {emptyLabel}
      </div>
    );
  }

  const width = 760;
  const height = 320;
  const padding = { top: 22, right: 38, bottom: 24, left: 130 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const rowGap = 10;
  const rowHeight = (plotHeight - rowGap * (data.length - 1)) / data.length;
  const maxValue = Math.max(...data.map((item) => item.value), 1);
  const ticks = buildTicks(0, maxValue, 5);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
      {ticks.map((tick) => {
        const x = padding.left + (tick / maxValue) * plotWidth;
        return (
          <g key={`tick-${tick}`}>
            <line x1={x} y1={padding.top} x2={x} y2={padding.top + plotHeight} stroke="var(--line)" strokeDasharray="2 3" />
            <text x={x} y={height - 8} textAnchor="middle" className={`${svgTextClass} ${monoClass}`}>
              {formatTick(tick, 0)}
              {valueSuffix}
            </text>
          </g>
        );
      })}

      <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + plotHeight} stroke="var(--line-strong)" />

      {data.map((item, index) => {
        const y = padding.top + index * (rowHeight + rowGap);
        const barWidth = (item.value / maxValue) * plotWidth;

        return (
          <g key={item.name}>
            <text x={padding.left - 10} y={y + rowHeight / 2 + 4} textAnchor="end" className={`${svgTextClass} font-ui-mono`}>
              {item.name}
            </text>
            <rect x={padding.left} y={y} width={plotWidth} height={rowHeight} rx="4" fill="var(--surface-subtle)" />
            <rect
              x={padding.left}
              y={y}
              width={barWidth}
              height={rowHeight}
              rx="4"
              fill={`oklch(95% 0.025 ${accentHue})`}
              stroke={`oklch(86% 0.06 ${accentHue})`}
            />
            <text x={padding.left + barWidth + 8} y={y + rowHeight / 2 + 4} className={`${svgTextClass} ${monoClass}`}>
              {item.value.toFixed(2)}
              {valueSuffix}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

interface QQPlotChartProps {
  data: ScatterDatum[];
  slope: number;
  intercept: number;
  xLabel: string;
  yLabel: string;
  emptyLabel?: string;
}

export function QQPlotChart({
  data,
  slope,
  intercept,
  xLabel,
  yLabel,
  emptyLabel = 'No probability plot available.'
}: QQPlotChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-full items-center justify-center rounded-[10px] border border-dashed border-[var(--line)] bg-[var(--surface-subtle)] px-6 text-center text-[12px] text-[var(--ink-3)]">
        {emptyLabel}
      </div>
    );
  }

  const width = 760;
  const height = 320;
  const padding = { top: 20, right: 24, bottom: 42, left: 54 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  let xMin = Math.min(...data.map((point) => point.x));
  let xMax = Math.max(...data.map((point) => point.x));
  let yMin = Math.min(...data.map((point) => point.y));
  let yMax = Math.max(...data.map((point) => point.y));

  if (Math.abs(xMax - xMin) < 1e-9) {
    xMin -= 1;
    xMax += 1;
  }
  if (Math.abs(yMax - yMin) < 1e-9) {
    yMin -= 1;
    yMax += 1;
  }

  const scaleX = (value: number) => padding.left + ((value - xMin) / (xMax - xMin)) * plotWidth;
  const scaleY = (value: number) => padding.top + plotHeight - ((value - yMin) / (yMax - yMin)) * plotHeight;

  const xTicks = buildTicks(xMin, xMax, 5);
  const yTicks = buildTicks(yMin, yMax, 5);

  const refStart = { x: xMin, y: slope * xMin + intercept };
  const refEnd = { x: xMax, y: slope * xMax + intercept };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
      {xTicks.map((tick) => (
        <g key={`x-${tick}`}>
          <line x1={scaleX(tick)} y1={padding.top} x2={scaleX(tick)} y2={padding.top + plotHeight} stroke="var(--line)" strokeDasharray="2 3" />
          <text x={scaleX(tick)} y={height - 14} textAnchor="middle" className={`${svgTextClass} ${monoClass}`}>
            {formatTick(tick, 2)}
          </text>
        </g>
      ))}
      {yTicks.map((tick) => (
        <g key={`y-${tick}`}>
          <line x1={padding.left} y1={scaleY(tick)} x2={padding.left + plotWidth} y2={scaleY(tick)} stroke="var(--line)" strokeDasharray="2 3" />
          <text x={padding.left - 8} y={scaleY(tick) + 3} textAnchor="end" className={`${svgTextClass} ${monoClass}`}>
            {formatTick(tick, 2)}
          </text>
        </g>
      ))}

      <line x1={padding.left} y1={padding.top + plotHeight} x2={padding.left + plotWidth} y2={padding.top + plotHeight} stroke="var(--line-strong)" />
      <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + plotHeight} stroke="var(--line-strong)" />

      <line
        x1={scaleX(refStart.x)}
        y1={scaleY(refStart.y)}
        x2={scaleX(refEnd.x)}
        y2={scaleY(refEnd.y)}
        stroke="var(--danger)"
        strokeWidth="1.25"
        strokeDasharray="4 3"
      />

      {data.map((point, index) => (
        <circle
          key={`${point.x}-${point.y}-${index}`}
          cx={scaleX(point.x)}
          cy={scaleY(point.y)}
          r="2.8"
          fill="var(--accent)"
          stroke="white"
          strokeWidth="0.8"
        />
      ))}

      <text x={padding.left + plotWidth / 2} y={height - 6} textAnchor="middle" className={`${svgTextClass} ${monoClass}`}>
        {xLabel}
      </text>
      <text
        x={14}
        y={padding.top + plotHeight / 2}
        textAnchor="middle"
        transform={`rotate(-90 14 ${padding.top + plotHeight / 2})`}
        className={`${svgTextClass} ${monoClass}`}
      >
        {yLabel}
      </text>
    </svg>
  );
}
