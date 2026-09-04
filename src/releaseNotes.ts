// -----------------------------------------------------------------------------
// 改版公告資料
// -----------------------------------------------------------------------------

export interface ReleaseNote {
    version: string;   // 例 '2.9.1'
    date: string;       // 例 '2026-08-04'，發布日期
    url?: string;       // 該版本在 SmartMD 上的公告文章網址
}

// 公司內部公告系統為 SmartMD，每個版本各自獨立一篇文章，網址格式為：
// https://smartmd.wnc.com.tw/post_list2?post_id=<文章ID>&single=1
// 新增 ReleaseNote 時，請把該版本對應的文章網址填在該則的 url 欄位。
/**
 * SmartMD 上的改版公告總覽頁（列出所有版本的公告文章）。
 * 用途一：App header 版本號 badge 的連結目標。
 * 用途二：個別 ReleaseNote 沒填 url 時的後備連結。
 * 留空字串代表兩者都不顯示連結。
 */
export const ANNOUNCEMENT_INDEX_URL = 'https://smartmd.wnc.com.tw/post_list2?topic_id=13279';

/** localStorage key：記錄使用者最後看過的公告版本號 */
export const CHANGELOG_SEEN_KEY = 'tolMasterChangelogSeen_v1';

/**
 * 只有列在這裡的版本才會跳出改版公告彈窗。
 * 新增一則 ReleaseNote 就會在使用者升級到（或超過）該版本後跳窗一次；
 * 不加進來的版本（例如小修版、內部重構）則完全不會打擾使用者。
 * 陣列順序不影響邏輯（getPendingReleaseNote 會自行挑出 <= currentVersion 中最大的版本），
 * 但建議維持新版在前，方便閱讀維護。
 * 改版內容一律寫在 SmartMD 公告文章裡，不需要複製到程式碼；
 * 新增一版只需填 version、date、url 三個欄位。
 */
export const RELEASE_NOTES: ReleaseNote[] = [
    {
        // 修正「方向為 − 的項目，非對稱公差往反方向計算」。既有存檔若含此情形，
        // 結果數字會與 2.9.1 不同，因此列為需跳窗告知的版本。
        version: '2.9.2',
        date: '2026-08-20',
    },
    {
        version: '2.9.1',
        date: '2026-08-04',
        url: 'https://smartmd.wnc.com.tw/post_list2?post_id=157842&single=1',
    },
];

/**
 * semver 比較：a > b 回傳正數，a < b 負數，相等 0。
 * 採數值比較（而非字串比較），因此 '2.10.0' > '2.9.1'。
 * 容忍非三段式版本號（缺少的段位視為 0）。
 */
export function compareVersions(a: string, b: string): number {
    const parse = (v: string) =>
        v
            .split('.')
            .map(part => {
                const n = parseInt(part, 10);
                return Number.isNaN(n) ? 0 : n;
            });

    const pa = parse(a);
    const pb = parse(b);
    const len = Math.max(pa.length, pb.length);

    for (let i = 0; i < len; i++) {
        const na = pa[i] ?? 0;
        const nb = pb[i] ?? 0;
        if (na !== nb) return na - nb;
    }
    return 0;
}

/**
 * 回傳「應該顯示」的公告，若無則回傳 null。
 * 規則：從 RELEASE_NOTES 中挑出 version <= currentVersion 的項目，取版本號最大的那一則；
 * 若該則 version 與 lastSeenVersion 相同（或 lastSeenVersion 已 >= 該則 version）則回傳 null。
 */
export function getPendingReleaseNote(
    currentVersion: string,
    lastSeenVersion: string | null
): ReleaseNote | null {
    const eligible = RELEASE_NOTES.filter(note => compareVersions(note.version, currentVersion) <= 0);
    if (eligible.length === 0) return null;

    const latest = eligible.reduce((best, note) =>
        compareVersions(note.version, best.version) > 0 ? note : best
    );

    if (lastSeenVersion !== null && compareVersions(lastSeenVersion, latest.version) >= 0) {
        return null;
    }

    return latest;
}

/** 解析出該則公告的最終連結；沒有可用連結時回傳 null */
export function resolveNoteUrl(note: ReleaseNote): string | null {
    const url = note.url ?? ANNOUNCEMENT_INDEX_URL;
    return url && url.trim().length > 0 ? url : null;
}
