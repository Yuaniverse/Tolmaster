let _normalSpare: number | null = null;

const randomNormal = (mean: number, stdDev: number): number => {
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

interface WorkerInput {
    N: number;
    hole1Mean: number; h1Sigma: number;
    shaft1Mean: number; s1Sigma: number;
    hole2Mean: number; h2Sigma: number;
    shaft2Mean: number; s2Sigma: number;
    paMean: number; paSigma: number;
    pbMean: number; pbSigma: number;
}

self.onmessage = (e: MessageEvent<WorkerInput>) => {
    const {
        N,
        hole1Mean, h1Sigma, shaft1Mean, s1Sigma,
        hole2Mean, h2Sigma, shaft2Mean, s2Sigma,
        paMean, paSigma, pbMean, pbSigma,
    } = e.data;

    _normalSpare = null;

    let sum = 0;
    let min = Infinity;
    let max = -Infinity;
    let failCount = 0;

    for (let i = 0; i < N; i++) {
        const hole1 = randomNormal(hole1Mean, h1Sigma);
        const shaft1 = randomNormal(shaft1Mean, s1Sigma);
        const c1 = hole1 - shaft1;

        const hole2 = randomNormal(hole2Mean, h2Sigma);
        const shaft2 = randomNormal(shaft2Mean, s2Sigma);
        const c2 = hole2 - shaft2;

        const pa = randomNormal(paMean, paSigma);
        const pb = randomNormal(pbMean, pbSigma);
        const deltaP = Math.abs(pa - pb);

        let margin: number;
        if (c1 < 0 || c2 < 0) {
            // 任一配對過盈即無法組裝
            margin = Math.min(c1, c2);
            failCount++;
        } else {
            margin = (c1 + c2) / 2 - deltaP;
            if (margin < 0) failCount++;
        }

        sum += margin;
        if (margin < min) min = margin;
        if (margin > max) max = margin;
    }

    self.postMessage({
        meanMargin: sum / N,
        minMargin: min,
        maxMargin: max,
        pFailure: (failCount / N) * 100,
    });
};
