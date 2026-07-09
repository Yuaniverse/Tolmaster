"use client";

import React, { useState } from 'react';
import { X, HelpCircle } from 'lucide-react';
import { help } from '@/content/helpContent';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'quickstart' | 'glossary' | 'distributions' | 'features' | 'results';

const TABS: { key: Tab; label: string }[] = [
  { key: 'quickstart', label: '快速上手' },
  { key: 'glossary', label: '名詞解釋' },
  { key: 'distributions', label: '分佈類型' },
  { key: 'features', label: '功能指南' },
  { key: 'results', label: '結果判讀' }
];

const GLOSSARY_ITEMS: { term: string; key: keyof typeof help }[] = [
  { term: 'Monte Carlo 模擬', key: 'glossary.montecarlo' },
  { term: 'Cpk', key: 'glossary.cpk' },
  { term: 'PPM', key: 'glossary.ppm' },
  { term: '良率 Yield', key: 'glossary.yield' },
  { term: 'σ Sigma', key: 'glossary.sigma' },
  { term: '3σ', key: 'glossary.threeSigma' },
  { term: 'RSS', key: 'glossary.rss' },
  { term: 'USL / LSL', key: 'glossary.uslLsl' }
];

const FEATURE_ITEMS: { term: string; key: keyof typeof help }[] = [
  { term: 'Fit Shift Calc（配合偏移計算）', key: 'feature.fitShift' },
  { term: 'Compression Mode（壓縮比模式）', key: 'feature.compressionMode' },
  { term: 'Dual-Pair Clearance（雙對分析）', key: 'feature.dualPair' },
  { term: 'SPC Calibration（實測資料校正）', key: 'spc.empiricalOption' }
];

const CPK_TABLE = [
  { range: '< 1.0', label: '不足', tone: 'danger' as const, note: '需要改善製程或放寬公差' },
  { range: '1.0 – 1.33', label: '勉強可接受', tone: 'warning' as const, note: '有風險，建議持續監控' },
  { range: '1.33 – 1.67', label: '良好', tone: 'success' as const, note: '一般量產標準' },
  { range: '≥ 1.67', label: '優秀', tone: 'success' as const, note: '製程能力充裕' }
];

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const [tab, setTab] = useState<Tab>('quickstart');
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="card flex h-[85vh] w-full max-w-3xl flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--surface-subtle)] px-6 py-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-[var(--ink-2)]" />
            <h3 className="font-semibold text-[var(--ink-1)]">TolMaster 說明</h3>
          </div>
          <button onClick={onClose} className="iconbtn sm ghost" aria-label="關閉">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pt-4">
          <div className="seg">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} className={tab === t.key ? 'active' : ''}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 text-sm text-[var(--ink-2)] leading-relaxed">
          {tab === 'quickstart' && (
            <ol className="flex flex-col gap-4 list-decimal list-inside">
              <li><strong className="text-[var(--ink-1)]">新增尺寸項目</strong> — 點擊「Add Dimension」，輸入每個尺寸的 Nominal、正負公差與分佈類型（Dist）。</li>
              <li><strong className="text-[var(--ink-1)]">設定製程能力（Cp）</strong> — 若有實測資料，用該行的 SPC 圖示匯入並校正；沒有的話可先用 1.0～1.33 作保守假設。</li>
              <li><strong className="text-[var(--ink-1)]">輸入規格界限</strong> — 於下方 Specification Settings 輸入 LSL/USL，或用 Target Cpk 模式自動反推。</li>
              <li><strong className="text-[var(--ink-1)]">執行模擬</strong> — 點擊「Run Analysis」，程式會依各尺寸的分佈隨機抽樣並組合，計算整體良率與 Cpk。</li>
              <li><strong className="text-[var(--ink-1)]">判讀結果</strong> — 查看結果卡片與模擬結果下方的解讀說明；若 Cpk 偏低，參考 Contribution Analysis 找出主要變異來源優先改善。</li>
            </ol>
          )}

          {tab === 'glossary' && (
            <dl className="flex flex-col gap-4">
              {GLOSSARY_ITEMS.map(item => (
                <div key={item.key}>
                  <dt className="font-semibold text-[var(--ink-1)] mb-1">{item.term}</dt>
                  <dd className="whitespace-pre-line">{help[item.key]}</dd>
                </div>
              ))}
            </dl>
          )}

          {tab === 'distributions' && (
            <div className="flex flex-col gap-4">
              <p className="whitespace-pre-line">{help['dist.comparison']}</p>
              <div>
                <div className="font-semibold text-[var(--ink-1)] mb-1">Empirical（實測分佈）</div>
                <div>透過 SPC Calibration 匯入實測數據後自動套用，直接對實測資料做拔靴法（bootstrap）重抽樣，最貼近真實製程分佈。</div>
              </div>
              <div>
                <div className="font-semibold text-[var(--ink-1)] mb-1">Fixed（固定值）</div>
                <div>不參與變異，模擬時視為常數，用於已知不會變動的尺寸。</div>
              </div>
            </div>
          )}

          {tab === 'features' && (
            <div className="flex flex-col gap-5">
              {FEATURE_ITEMS.map(item => (
                <div key={item.key}>
                  <div className="font-semibold text-[var(--ink-1)] mb-1">{item.term}</div>
                  <div className="whitespace-pre-line">{help[item.key]}</div>
                </div>
              ))}
            </div>
          )}

          {tab === 'results' && (
            <div className="flex flex-col gap-5">
              <div>
                <div className="font-semibold text-[var(--ink-1)] mb-2">Cpk 分級對照</div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[var(--ink-3)] mono-label">
                      <th className="py-1 pr-4">Cpk 範圍</th>
                      <th className="py-1 pr-4">評級</th>
                      <th className="py-1">建議</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CPK_TABLE.map(row => (
                      <tr key={row.range} className="border-t border-[var(--line)]">
                        <td className="py-1.5 pr-4 font-ui-mono">{row.range}</td>
                        <td className="py-1.5 pr-4"><span className={`badge badge--${row.tone}`}>{row.label}</span></td>
                        <td className="py-1.5">{row.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <div className="font-semibold text-[var(--ink-1)] mb-1">PPM ↔ 良率</div>
                <div>PPM（每百萬件不良數）與良率互為表裡：良率 = 1 − PPM/1,000,000。數值越低（PPM）或越高（良率）代表品質越好。</div>
              </div>
              <div>
                <div className="font-semibold text-[var(--ink-1)] mb-1">模擬完成後怎麼看</div>
                <div>模擬結果下方會自動附上一段判讀說明，指出目前 Cpk 屬於哪個等級、主要不良原因，以及 Contribution Analysis 中貢獻度最高的尺寸 — 那通常是最值得優先改善公差或製程能力的項目。</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
