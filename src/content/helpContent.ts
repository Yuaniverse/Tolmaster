// Centralized Traditional-Chinese help text for TolMaster.
// Keep prose here so tooltip / HelpModal content can be edited without touching component code.

export type HelpKey =
  // Tolerance table
  | 'table.nominal'
  | 'table.tolPlus'
  | 'table.tolMinus'
  | 'table.dist'
  | 'table.cp'
  | 'table.cpNormalSort'
  | 'table.meanDrift'
  // Distribution types
  | 'dist.comparison'
  // Toolbar
  | 'toolbar.worstCase'
  | 'toolbar.rss'
  | 'toolbar.simCount'
  // Features
  | 'feature.monteCarlo'
  | 'feature.fitShift'
  | 'feature.compressionMode'
  | 'feature.dualPair'
  // Spec settings
  | 'spec.modes'
  | 'spec.lsl'
  | 'spec.usl'
  | 'spec.targetNominal'
  // Results
  | 'result.yield'
  | 'result.ppm'
  | 'result.equivCpk'
  | 'result.equivCpkLowerBound'
  | 'result.meanStdDev'
  | 'result.simulatedRange'
  | 'result.histogram'
  | 'result.contribution'
  // FitShift modal
  | 'fitshift.overview'
  | 'fitshift.hole'
  | 'fitshift.shaft'
  | 'fitshift.gapRange'
  // SPC modal
  | 'spc.sigma'
  | 'spc.estimatedCp'
  | 'spc.andersonDarling'
  | 'spc.qqPlot'
  | 'spc.empiricalOption'
  // Dual-pair modal
  | 'dp.overview'
  | 'dp.deltaPMax'
  | 'dp.wcMargin'
  | 'dp.pMarginFail'
  | 'dp.margins'
  // Glossary (HelpModal only)
  | 'glossary.cpk'
  | 'glossary.ppm'
  | 'glossary.yield'
  | 'glossary.sigma'
  | 'glossary.threeSigma'
  | 'glossary.rss'
  | 'glossary.uslLsl'
  | 'glossary.montecarlo';

export const help: Record<HelpKey, string> = {
  'table.nominal': 'Nominal（公稱尺寸）\n該尺寸的設計目標值，不含公差。左側的 +/− 按鈕代表堆疊方向，不影響尺寸本身；堆疊模擬時各項會依方向相加，得出總成的理論中心值。',
  'table.tolPlus': 'Tol +（正向公差）\n允許尺寸超出 Nominal 的最大量（上偏差）。公差是相對於「顯示的尺寸值」，與方向按鈕無關：方向為 − 的項目，Tol + 會讓它在堆疊中往更負的方向延伸。',
  'table.tolMinus': 'Tol −（負向公差）\n允許尺寸低於 Nominal 的最大量（下偏差，輸入正值即可，程式會自動視為負方向）。同樣相對於「顯示的尺寸值」，與方向按鈕無關。',
  'table.dist': 'Dist（分佈類型）\n決定 Monte Carlo 抽樣時，這個尺寸在公差範圍內如何分佈（常態、篩選後常態、均勻…）。點選右側下拉選單查看各類型說明。',
  'table.cp': 'Cp（製程能力指數）\n用於換算模擬用的標準差：σ = (公差/2) / (3 × Cp)。\nCp 越大代表製程越穩定、變異越集中在公差中心附近；未實測時可先用 1.0～1.33 作保守假設。',
  'table.cpNormalSort': 'Cp（篩選前製程能力）\nNormal(Sort) 會先用常態分佈抽樣，再把超出公差的樣本剔除（模擬全檢）。因此這裡輸入的 Cp 是「篩選前」的製程能力，成品實際變異會比此值換算出的 σ 更小。',
  'table.meanDrift': 'Mean Drift（均值漂移）\n啟用後，模擬時製程均值會在 ±1.5σ 範圍內隨機漂移（均勻分佈），用來反映長期生產中製程中心可能偏移，對良率造成的額外影響。適合評估長期量產風險，而非單一批次。',

  'dist.comparison': '分佈類型比較：\n\nNormal（常態分佈）\n一般製程的預設假設，樣本集中在 Nominal 附近，依 Cp 換算標準差。適用於大多數已受控的加工製程。\n\nNormal (Sort)（篩選後常態）\n先用常態分佈抽樣，再剔除超出公差的樣本（模擬全檢/選別）。成品實際變異比原始 Cp 換算值更小，適合有做全檢篩選的製程。\n\nUniform（均勻分佈）\n公差範圍內每個值出現機率相同，沒有集中趨勢。適合沒有製程資料、想採保守假設，或模擬間隙/滑移類自由度時使用。',

  'toolbar.worstCase': 'Worst Case（最壞情況分析）\n假設所有尺寸同時落在各自公差的極限值，計算堆疊後可能的最大/最小/中心值。這是最保守的估計，實務上機率極低但常作為設計上限參考。',
  'toolbar.rss': 'RSS（均方根法）\nRSS = √(Σ 各項標準差²) × 3，以常態分佈假設換算出等效的 ±3σ 範圍。比 Worst Case 更貼近實際量產分佈，但僅供參考，並非硬性邊界（實際結果仍以 Monte Carlo 模擬為準）。',
  'toolbar.simCount': '模擬次數（迭代數）\n次數越多，統計結果越精確、越能捕捉到罕見的極端事件（例如 PPM 等級的不良率），但運算時間也越長。評估良率或 Cpk 時建議至少使用 1M 以上。',

  'feature.monteCarlo': 'Monte Carlo 分析\n隨機抽樣每個尺寸的公差分佈，重複數百萬次並將結果依設計方式（線性堆疊）組合，藉此估算實際量產時的良率、Cpk 與整體尺寸分佈。比 Worst Case／RSS 更貼近真實生產狀況。',
  'feature.fitShift': 'Fit Shift Calc（配合偏移計算）\n用於孔軸配合（例如銷與孔）的間隙模擬：輸入孔徑與軸徑的公稱尺寸、公差與 Cp，計算配合間隙的分佈，並考慮 MMC（最大實體狀態）下可能發生的偏移／干涉。計算完成後可作為一個尺寸項目加入堆疊。',
  'feature.compressionMode': 'Compression Mode（壓縮比模式）\n專用於評估「某尺寸相對於總堆疊的佔比／壓縮率」的組裝分析，例如彈簧壓縮量、密封件壓縮率等。啟用後需指定一個壓縮目標（分母）尺寸，結果以百分比呈現，而非絕對尺寸。',
  'feature.dualPair': 'Dual-Pair Clearance（雙對分析）\n用於評估兩組孔軸配合共享同一個間隙時（例如雙銷定位），因節距誤差（ΔP）造成的干涉機率。輸入兩對孔/軸與節距公差後，計算餘裕（Margin）分佈與失效機率。',

  'spec.modes': '規格輸入模式比較：\n\nManual specs（手動輸入）\n直接輸入 LSL／USL／Target Nominal。\n\nTarget Cpk\n輸入目標 Cpk，程式會依模擬結果的分位數反推並自動填入對應的 USL/LSL。需先執行過一次模擬。\n\nSolve Nominal（僅 Compression Mode）\n給定目標 Cpk 與壓縮比窗，反推自由變數（可調整的尺寸）應設定的 Nominal 值，用於設計階段找出可行的公稱尺寸組合。',
  'spec.lsl': 'LSL（下限規格，Lower Spec Limit）\n允許的最小值。模擬結果低於此值視為不良品。',
  'spec.usl': 'USL（上限規格，Upper Spec Limit）\n允許的最大值。模擬結果高於此值視為不良品。',
  'spec.targetNominal': 'Target Nominal（目標中心值，選填）\n希望製程分佈集中的理想中心點，用於圖表標示與部分計算的參考，不影響良率判定本身（良率仍以 LSL/USL 為準）。',

  'result.yield': 'Yield rate（良率）\n模擬樣本中，落在 LSL～USL 規格範圍內（且未發生 FitShift 干涉）的比例。下方 Failure Breakdown 列出不良的細分原因。',
  'result.ppm': 'Defects (PPM)\n每百萬件預期產生的不良品數量，PPM = (1 − 良率) × 1,000,000。數值越低越好，常見量產目標依產業而異（例如 &lt; 3.4 PPM 對應六標準差水準）。',
  'result.equivCpk': 'Equiv. Cpk（等效 Cpk）\n此值是從實際模擬良率反推得出，而非直接由 μ/σ 計算。當堆疊包含非常態分佈或 FitShift 干涉失敗時，此值比傳統公式 Cpk 更能反映實際製程能力。\n\n經驗判斷：< 1.0 不足；1.0–1.33 勉強可接受；1.33–1.67 良好；≥ 1.67 優秀。',
  'result.equivCpkLowerBound': 'Equiv. Cpk（等效 Cpk，下界）\n「>」表示本次模擬中未觀察到任何不良品，此數值為 rule-of-three（3/N）95% 信賴下界，實際能力可能更高，需要更多模擬次數才能精確解析。',
  'result.meanStdDev': 'Mean / StdDev（平均值／標準差）\nμ：模擬結果的平均值。\nσ：模擬結果的標準差，代表變異程度。\n3σ：σ 的三倍，常態分佈下約涵蓋 99.73% 的樣本，可與公差帶寬度比較。',
  'result.simulatedRange': 'Simulated Range（模擬範圍）\nMonte Carlo 模擬中實際出現過的最大值與最小值，反映真實分佈的極端情況，通常比 Worst Case 窄。',
  'result.histogram': 'Distribution（分佈直方圖）\n呈現模擬結果的分佈形狀，虛線標示規格界限（LSL/USL）與目標值（若有設定）。可用來判斷分佈是否置中、是否有超出規格的尾端。',
  'result.contribution': 'Contribution Analysis（變異貢獻分析）\n以變異數（σ²）佔比呈現各尺寸項目對整體變異的貢獻程度。佔比最高的項目通常是最值得優先縮公差或提升製程能力的對象。',

  'fitshift.overview': '此工具模擬孔軸配合（例如銷與孔）的間隙分佈：輸入孔與軸的公稱尺寸、公差與 Cp，計算兩者的間隙（Clearance）範圍，並考慮 MMC（最大實體狀態）下可能發生的偏移。完成後可作為一個尺寸項目加入主堆疊。',
  'fitshift.hole': 'Hole（孔徑）\n輸入孔的公稱直徑、正負公差與 Cp（製程能力）。',
  'fitshift.shaft': 'Shaft（軸徑）\n輸入軸（銷）的公稱直徑、正負公差與 Cp（製程能力）。孔徑需大於軸徑才會產生正間隙。',
  'fitshift.gapRange': 'Max / Min Gap（最大／最小間隙）\n依孔徑與軸徑的公稱尺寸與公差，計算兩者配合間隙的最壞情況範圍。Min Gap 若為負值，表示最壞情況下孔軸會發生干涉（無法組裝）。',

  'spc.sigma': 'σ（標準差）\n由匯入的實測資料計算出的標準差，代表製程實際的變異程度。',
  'spc.estimatedCp': 'Estimated Cp（估計製程能力）\n由實測資料的標準差與公差帶寬度換算出的 Cp：Cp = (公差/2) / (3σ)。可與手動輸入的 Cp 假設值比較，判斷假設是否合理。',
  'spc.andersonDarling': 'Anderson-Darling 常態性檢定（p-value）\n檢定實測資料是否來自常態分佈，對尾端偏離比 Shapiro-Wilk 更敏感。p < 0.05 表示資料顯著偏離常態分佈，此時建議改用 Empirical（實測分佈）而非 Normal 假設。',
  'spc.qqPlot': 'Q-Q Plot（分位數對照圖）\n將實測資料的分位數與理論常態分佈比較。點越貼近對角線，代表資料越接近常態分佈；明顯偏離（尤其是兩端翹起或下垂）表示資料可能非常態。',
  'spc.empiricalOption': '使用實測分佈（Empirical）\n啟用後，模擬時不再假設常態分佈，而是直接對匯入的實測數據做拔靴法（bootstrap）重抽樣，最貼近真實製程分佈，但需要足夠的樣本數才具代表性。',

  'dp.overview': '此工具評估兩組孔軸配合（例如雙銷定位）共享同一個組裝間隙時，因節距誤差（ΔP）造成彼此干涉的機率。輸入兩對孔/軸尺寸公差與節距公差後，計算餘裕（Margin）的分佈。',
  'dp.deltaPMax': 'ΔP Max（節距誤差上限）\n兩個節距（Pitch）尺寸公差換算出的最大可能誤差，誤差越大，兩組配合對齊的餘裕就越小。',
  'dp.wcMargin': 'WC Margin（最壞情況餘裕）\n假設所有尺寸同時落在最不利的公差極限時，計算出的最小餘裕值。若為負值，代表最壞情況下會發生干涉。',
  'dp.pMarginFail': 'P(Margin < 0)（干涉機率）\nMonte Carlo 模擬中，餘裕小於 0（即發生干涉）的樣本比例。數值越低代表設計越安全。',
  'dp.margins': 'Margin（餘裕）\nMargin = (C1 + C2) / 2 − ΔP，其中 C1、C2 為兩組孔軸的直徑間隙，ΔP 為節距誤差。Margin 越大代表配合越寬鬆，越不容易發生干涉。',

  'glossary.cpk': 'Cpk（製程能力指數）\n衡量製程「同時滿足上下規格」的能力，會考慮平均值相對規格中心的偏移，因此比 Cp 更貼近實際良率。\n\n數值越高代表不良率越低：\n< 1.0　不足，需要改善\n1.0–1.33　勉強可接受\n1.33–1.67　良好，一般量產標準\n≥ 1.67　優秀',
  'glossary.ppm': 'PPM（Parts Per Million，百萬件不良數）\n每生產一百萬件產品，預期產生的不良品數量。PPM = (1 − 良率) × 1,000,000，數值越低代表品質越好。',
  'glossary.yield': '良率（Yield Rate）\n模擬或實測樣本中，落在規格範圍內的比例，通常以百分比表示。良率 = 1 − 不良率。',
  'glossary.sigma': 'σ（標準差，Sigma）\n衡量資料分散程度的統計量。σ 越小，代表製程越穩定、結果越集中在平均值附近。',
  'glossary.threeSigma': '3σ（三倍標準差）\n常態分佈下，平均值 ±3σ 的範圍約涵蓋 99.73% 的樣本。常用來與公差帶寬度比較，評估製程能力是否足夠。',
  'glossary.rss': 'RSS（Root Sum of Squares，均方根法）\n將各獨立公差項目的標準差取平方和後開根號，估算整體堆疊的等效變異，比直接相加（Worst Case）更貼近實際統計結果，但仍為近似方法。',
  'glossary.uslLsl': 'USL / LSL（規格上下限）\nUSL（Upper Spec Limit）：允許的最大值。\nLSL（Lower Spec Limit）：允許的最小值。\n模擬結果超出此範圍即視為不良品。',
  'glossary.montecarlo': 'Monte Carlo 模擬\n透過大量隨機抽樣（本工具預設 100 萬～1000 萬次）模擬每個尺寸在其公差範圍內的實際變異，再依組裝方式加總，藉此估算真實量產時的良率與尺寸分佈，比單純的最壞情況分析更貼近實際生產結果。'
};

export const CPK_BANDS = [
  { min: 1.67, label: '優秀', tone: 'success' as const },
  { min: 1.33, label: '良好', tone: 'success' as const },
  { min: 1.0, label: '勉強可接受', tone: 'warning' as const },
  { min: -Infinity, label: '不足', tone: 'danger' as const }
];

export function rateCpk(cp: number): { label: string; tone: 'success' | 'warning' | 'danger' } {
  const band = CPK_BANDS.find(b => cp >= b.min) ?? CPK_BANDS[CPK_BANDS.length - 1];
  return { label: band.label, tone: band.tone };
}
