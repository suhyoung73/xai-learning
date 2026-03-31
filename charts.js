/* ============================================================
   charts.js — Canvas 2D 차트 렌더링
   ============================================================ */

const ChartColors = {
    bg: '#ffffff', grid: 'rgba(0,0,0,0.1)',
    axis: '#64748b', text: '#0f172a', textSub: '#64748b',
    blue: '#3b82f6', orange: '#f97316', green: '#22c55e',
    line: '#6366f1', lineShadow: 'rgba(99,102,241,0.3)'
};

function initCanvas(container, w, h) {
    const dpr = window.devicePixelRatio || 1;
    const canvas = document.createElement('canvas');
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    canvas.style.maxWidth = '100%'; canvas.style.height = 'auto';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    container.appendChild(canvas);
    return { canvas, ctx, w, h };
}

function drawAxes(ctx, pad, w, h, xLabel, yLabel, xMin, xMax, yMin, yMax, invertX, invertY, gx = 5, gy = 5) {
    ctx.strokeStyle = ChartColors.grid; ctx.lineWidth = 0.5;
    for (let i = 0; i <= gx; i++) {
        const x = pad + (w - 2 * pad) * i / gx;
        ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x, h - pad); ctx.stroke();
        ctx.fillStyle = ChartColors.textSub; ctx.font = '11px monospace'; ctx.textAlign = 'center';
        let val = invertX ? xMax - (xMax - xMin) * i / gx : xMin + (xMax - xMin) * i / gx;
        ctx.fillText(Math.round(val).toLocaleString(), x, h - pad + 16);
    }
    for (let i = 0; i <= gy; i++) {
        const y = pad + (h - 2 * pad) * i / gy;
        ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke();
        ctx.fillStyle = ChartColors.textSub; ctx.font = '11px monospace'; ctx.textAlign = 'right';
        let val = invertY ? yMin + (yMax - yMin) * i / gy : yMax - (yMax - yMin) * i / gy;
        ctx.fillText(typeof val === 'number' && Math.abs(val) > 999 ? val.toLocaleString() : (Math.round(val * 10) / 10).toString(), pad - 6, y + 4);
    }
    ctx.fillStyle = ChartColors.text; ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(xLabel, w / 2, h - 4);
    ctx.save(); ctx.translate(12, h / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel, 0, 0); ctx.restore();
}

function mapX(val, xMin, xMax, pad, w, invertX) {
    const ratio = (val - xMin) / (xMax - xMin);
    return invertX ? (w - pad) - ratio * (w - 2 * pad) : pad + ratio * (w - 2 * pad);
}
function mapY(val, yMin, yMax, pad, h, invertY) {
    const ratio = (val - yMin) / (yMax - yMin);
    return invertY ? pad + ratio * (h - 2 * pad) : (h - pad) - ratio * (h - 2 * pad);
}

function drawLegend(ctx, items, x, y) {
    ctx.font = '11px sans-serif';
    items.forEach((item, i) => {
        const ly = y + i * 18;
        ctx.fillStyle = item.color;
        ctx.beginPath(); ctx.arc(x + 6, ly, 5, 0, Math.PI * 2); ctx.fill();
        if (item.border) { ctx.strokeStyle = item.border; ctx.lineWidth = 1.5; ctx.stroke(); }
        ctx.fillStyle = ChartColors.text; ctx.textAlign = 'left';
        ctx.fillText(item.label, x + 16, ly + 4);
    });
}

// ─── 3차시 차트들 ───
function drawMeatScatter(container) {
    const W = 400, H = 400, P = 50;
    const { ctx } = initCanvas(container, W, H);
    const xMin = 2000, xMax = 12000, yMin = 1000, yMax = 2750;
    ctx.fillStyle = ChartColors.bg; ctx.fillRect(0, 0, W, H);
    drawAxes(ctx, P, W, H, '소고기 가격', '돼지고기 가격', xMin, xMax, yMin, yMax, false, false, 5, 7);
    ctx.globalAlpha = 0.7;
    MEAT_DATA.forEach(d => {
        let x = mapX(d[0], xMin, xMax, P, W, false);
        let y = mapY(d[1], yMin, yMax, P, H, false);
        x = Math.max(P, Math.min(W - P, x));
        y = Math.max(P, Math.min(H - P, y));
        ctx.fillStyle = ChartColors.blue;
        ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
    drawLegend(ctx, [{ label: '데이터', color: ChartColors.blue }], W - 90, P + 10);
}

function drawRegressionLine(ctx, xMin, xMax, yMin, yMax, P, W, H) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(P, P, W - 2 * P, H - 2 * P);
    ctx.clip();
    ctx.strokeStyle = ChartColors.line; ctx.lineWidth = 2.5;
    ctx.shadowColor = ChartColors.lineShadow; ctx.shadowBlur = 8;
    ctx.beginPath();
    for (let i = 0; i <= 100; i++) {
        const xv = xMin + (xMax - xMin) * i / 100;
        const yv = meatPredict(xv);
        const sx = mapX(xv, xMin, xMax, P, W, false);
        const sy = mapY(yv, yMin, yMax, P, H, false);
        i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    }
    ctx.stroke(); ctx.shadowBlur = 0;
    ctx.restore();
}

function drawMeatTrainReg(container) {
    const W = 400, H = 400, P = 50;
    const { ctx } = initCanvas(container, W, H);
    const xMin = 2000, xMax = 12000, yMin = 1000, yMax = 2750;
    ctx.fillStyle = ChartColors.bg; ctx.fillRect(0, 0, W, H);
    drawAxes(ctx, P, W, H, '소고기 가격', '돼지고기 가격', xMin, xMax, yMin, yMax, false, false, 5, 7);
    const train = getMeatTrain();
    ctx.globalAlpha = 0.7;
    train.forEach(d => {
        let x = mapX(d[0], xMin, xMax, P, W, false);
        let y = mapY(d[1], yMin, yMax, P, H, false);
        x = Math.max(P, Math.min(W - P, x));
        y = Math.max(P, Math.min(H - P, y));
        ctx.fillStyle = ChartColors.blue;
        ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
    drawRegressionLine(ctx, xMin, xMax, yMin, yMax, P, W, H);
    drawLegend(ctx, [{ label: '훈련 데이터', color: ChartColors.blue }, { label: '회귀 모델', color: ChartColors.line }], W - 110, P + 10);
}

function drawMeatTestReg(container) {
    const W = 400, H = 400, P = 50;
    const { ctx } = initCanvas(container, W, H);
    const xMin = 2000, xMax = 12000, yMin = 1000, yMax = 2750;
    ctx.fillStyle = ChartColors.bg; ctx.fillRect(0, 0, W, H);
    drawAxes(ctx, P, W, H, '소고기 가격', '돼지고기 가격', xMin, xMax, yMin, yMax, false, false, 5, 7);
    const train = getMeatTrain(), test = getMeatTest();
    ctx.globalAlpha = 0.6;
    train.forEach(d => {
        let x = mapX(d[0], xMin, xMax, P, W, false);
        let y = mapY(d[1], yMin, yMax, P, H, false);
        x = Math.max(P, Math.min(W - P, x));
        y = Math.max(P, Math.min(H - P, y));
        ctx.fillStyle = ChartColors.blue;
        ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 0.9;
    test.forEach(d => {
        let x = mapX(d[0], xMin, xMax, P, W, false);
        let y = mapY(d[1], yMin, yMax, P, H, false);
        x = Math.max(P, Math.min(W - P, x));
        y = Math.max(P, Math.min(H - P, y));
        ctx.fillStyle = ChartColors.orange;
        ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
    drawRegressionLine(ctx, xMin, xMax, yMin, yMax, P, W, H);
    drawLegend(ctx, [
        { label: '훈련 데이터', color: ChartColors.blue },
        { label: '테스트 데이터', color: ChartColors.orange },
        { label: '회귀 모델', color: ChartColors.line }
    ], W - 120, P + 10);
}

// ─── 4차시 차트들 ───
const STAR_X_MIN = 5000, STAR_X_MAX = 40000, STAR_Y_MIN = -10, STAR_Y_MAX = 15;

function drawStarPoints(ctx, data, P, W, H, pointSize, edgeColor) {
    data.forEach(d => {
        const ti = STAR_TYPES.indexOf(d.type);
        if (ti < 0) return;
        let sx = mapX(d.t, STAR_X_MIN, STAR_X_MAX, P, W, true);
        let sy = mapY(d.mv, STAR_Y_MIN, STAR_Y_MAX, P, H, true);
        sx = Math.max(P, Math.min(W - P, sx));
        sy = Math.max(P, Math.min(H - P, sy));
        ctx.fillStyle = STAR_COLORS[ti];
        ctx.beginPath(); ctx.arc(sx, sy, pointSize, 0, Math.PI * 2); ctx.fill();
        if (edgeColor) {
            ctx.strokeStyle = edgeColor; ctx.lineWidth = 1.2; ctx.stroke();
        }
    });
}

function drawDecisionRegions(ctx, P, W, H) {
    const cols = 80, rows = 80;
    const cw = (W - 2 * P) / cols, ch = (H - 2 * P) / rows;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const ratio_c = (c + 0.5) / cols;
            const ratio_r = (r + 0.5) / rows;
            const t = STAR_X_MAX - ratio_c * (STAR_X_MAX - STAR_X_MIN);
            const mv = STAR_Y_MIN + ratio_r * (STAR_Y_MAX - STAR_Y_MIN);
            const cls = classifyStar(t, mv);
            const ti = STAR_TYPES.indexOf(cls);
            ctx.fillStyle = STAR_COLORS[ti]; ctx.globalAlpha = 0.12;
            ctx.fillRect(P + c * cw, P + r * ch, cw + 0.5, ch + 0.5);
        }
    }
    ctx.globalAlpha = 1;
}

function drawStarScatter(container) {
    const W = 420, H = 420, P = 55;
    const { ctx } = initCanvas(container, W, H);
    ctx.fillStyle = ChartColors.bg; ctx.fillRect(0, 0, W, H);
    drawAxes(ctx, P, W, H, '온도(K)', '절대등급(Mv)', STAR_X_MIN, STAR_X_MAX, STAR_Y_MIN, STAR_Y_MAX, true, true, 7, 5);
    ctx.globalAlpha = 0.95;
    drawStarPoints(ctx, STAR_DATA, P, W, H, 5, '#000');
    ctx.globalAlpha = 1;
    drawLegend(ctx, STAR_TYPES.map((t, i) => ({ label: t, color: STAR_COLORS[i] })), P + 8, P + 10);
}

function drawStarTrainRegion(container) {
    const W = 420, H = 420, P = 55;
    const { ctx } = initCanvas(container, W, H);
    ctx.fillStyle = ChartColors.bg; ctx.fillRect(0, 0, W, H);
    drawAxes(ctx, P, W, H, '온도(K)', '절대등급(Mv)', STAR_X_MIN, STAR_X_MAX, STAR_Y_MIN, STAR_Y_MAX, true, true, 7, 5);
    drawDecisionRegions(ctx, P, W, H);
    const train = getStarTrain();
    ctx.globalAlpha = 0.9;
    drawStarPoints(ctx, train, P, W, H, 5, '#000');
    ctx.globalAlpha = 1;
    drawLegend(ctx, STAR_TYPES.map((t, i) => ({ label: t, color: STAR_COLORS[i] })), P + 8, P + 10);
}

function drawStarTestRegion(container) {
    const W = 420, H = 420, P = 55;
    const { ctx } = initCanvas(container, W, H);
    ctx.fillStyle = ChartColors.bg; ctx.fillRect(0, 0, W, H);
    drawAxes(ctx, P, W, H, '온도(K)', '절대등급(Mv)', STAR_X_MIN, STAR_X_MAX, STAR_Y_MIN, STAR_Y_MAX, true, true, 7, 5);
    drawDecisionRegions(ctx, P, W, H);
    const train = getStarTrain(), test = getStarTest();
    ctx.globalAlpha = 0.7;
    drawStarPoints(ctx, train, P, W, H, 4, '#000');
    ctx.globalAlpha = 0.95;
    drawStarPoints(ctx, test, P, W, H, 6, '#ef4444');
    ctx.globalAlpha = 1;
    const items = [];
    STAR_TYPES.forEach((t, i) => items.push({ label: '훈련: ' + t, color: STAR_COLORS[i] }));
    STAR_TYPES.forEach((t, i) => items.push({ label: '테스트: ' + t, color: STAR_COLORS[i], border: '#ef4444' }));
    drawLegend(ctx, items, P + 8, P + 10);
}

function createStarLimeChart(container) {
    const W = 420, H = 420, P = 55;
    
    // Create base and overlay canvases
    container.style.position = 'relative';
    container.style.width = W + 'px';
    container.style.height = H + 'px';
    
    // We mock a container to intercept appendChild and set absolute positioning.
    const createLayer = () => {
        let canvasElem;
        const mockContainer = {
            appendChild: c => {
                c.style.position = 'absolute';
                c.style.top = '0';
                c.style.left = '0';
                container.appendChild(c);
                canvasElem = c;
            }
        };
        const layer = initCanvas(mockContainer, W, H);
        return layer;
    };
    
    const base = createLayer();
    const overlay = createLayer();
    
    // Static base
    base.ctx.fillStyle = ChartColors.bg; base.ctx.fillRect(0, 0, W, H);
    drawAxes(base.ctx, P, W, H, '온도(K)', '절대등급(Mv)', STAR_X_MIN, STAR_X_MAX, STAR_Y_MIN, STAR_Y_MAX, true, true, 7, 5);
    drawDecisionRegions(base.ctx, P, W, H);
    drawStarPoints(base.ctx, getStarTrain(), P, W, H, 3, null); // lighter points without borders
    
    // Update function
    return function updatePoint(t, mv, predictedClass) {
        overlay.ctx.clearRect(0, 0, W, H);
        
        let sx = mapX(t, STAR_X_MIN, STAR_X_MAX, P, W, true);
        let sy = mapY(mv, STAR_Y_MIN, STAR_Y_MAX, P, H, true);
        sx = Math.max(P, Math.min(W - P, sx));
        sy = Math.max(P, Math.min(H - P, sy));
        
        const ti = STAR_TYPES.indexOf(predictedClass);
        const color = ti >= 0 ? STAR_COLORS[ti] : '#ffffff';
        
        overlay.ctx.save();
        overlay.ctx.shadowColor = 'rgba(0,0,0,0.6)';
        overlay.ctx.shadowBlur = 8;
        overlay.ctx.fillStyle = color;
        overlay.ctx.beginPath(); overlay.ctx.arc(sx, sy, 8, 0, Math.PI * 2); overlay.ctx.fill();
        overlay.ctx.shadowBlur = 0;
        
        overlay.ctx.strokeStyle = '#fff'; overlay.ctx.lineWidth = 2.5; overlay.ctx.stroke();
        overlay.ctx.strokeStyle = '#000'; overlay.ctx.lineWidth = 1; overlay.ctx.stroke();
        overlay.ctx.restore();
    };
}

// Chart dispatcher
const CHART_FNS = {
    drawMeatScatter, drawMeatTrainReg, drawMeatTestReg,
    drawStarScatter, drawStarTrainRegion, drawStarTestRegion, createStarLimeChart
};
