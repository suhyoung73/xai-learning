/* ============================================================
   app.js — 셀 카드 엔진 · 라우팅 · 인터랙션
   ============================================================ */
(function () {
    'use strict';

    // ─── State ───
    const state = {
        openedCells: new Set(),   // cells that have been opened at least once
        expandedCells: new Set(), // currently expanded cells
        codeVisible: false,       // global code toggle state
        cellCodeVisible: new Set(), // cells with individually toggled code
        currentLesson: null
    };

    // ─── DOM refs ───
    const $ = id => document.getElementById(id);
    const sidebar = $('sidebar');
    const overlay = $('sidebar-overlay');
    const mainContent = $('main-content');
    const landingPage = $('landing-page');
    const lessonPage = $('lesson-page');
    const hintBanner = $('hint-banner');
    const offlineBanner = $('offline-banner');
    const codeToggleBtn = $('code-toggle');
    const resetBtn = $('reset-btn');

    // ─── Sidebar ───
    function openSidebar() { sidebar.classList.add('open'); overlay.classList.add('active'); }
    function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('active'); }
    $('menu-toggle').addEventListener('click', openSidebar);
    $('sidebar-close').addEventListener('click', closeSidebar);
    overlay.addEventListener('click', closeSidebar);

    // ─── Router ───
    function getRoute() {
        const h = location.hash.replace('#', '');
        const m = h.match(/^lesson-(\d+)$/);
        return m ? parseInt(m[1]) : null;
    }

    function navigate() {
        closeSidebar();
        const lessonNum = getRoute();
        // Update nav active state
        document.querySelectorAll('.nav-link').forEach(a => {
            a.classList.toggle('active', a.dataset.lesson == lessonNum);
        });
        if (lessonNum && LESSONS[lessonNum]) {
            landingPage.classList.add('hidden');
            lessonPage.classList.remove('hidden');
            if (state.currentLesson !== lessonNum) {
                state.currentLesson = lessonNum;
                renderLesson(lessonNum);
                window.scrollTo({ top: 0, behavior: 'instant' });
            }
        } else {
            landingPage.classList.remove('hidden');
            lessonPage.classList.add('hidden');
            state.currentLesson = null;
        }
    }
    window.addEventListener('hashchange', navigate);

    // ─── Render Lesson Page ───
    function renderLesson(num) {
        const lesson = LESSONS[num];
        if (!lesson) return;
        state.expandedCells.clear(); // reset expanded on page change

        if (lesson.cells.length === 0) {
            lessonPage.innerHTML = `
        <div class="lesson-header">
          <h2 class="lesson-title">${lesson.title}</h2>
          <p class="lesson-subtitle">${lesson.subtitle}</p>
        </div>
        <div class="placeholder-page">
          <div class="placeholder-icon">🚧</div>
          <p class="placeholder-text">콘텐츠 준비 중입니다.<br>추후 업데이트될 예정입니다.</p>
        </div>`;
            return;
        }

        let html = `
      <div class="lesson-header">
        <h2 class="lesson-title">${lesson.title}</h2>
        <p class="lesson-subtitle">${lesson.subtitle}</p>
      </div>
      <div class="lesson-actions">
        <button class="lesson-code-toggle" id="lesson-code-toggle" aria-label="파이썬 코드 보기">
          🐍 ${state.codeVisible ? '파이썬 코드 숨기기' : '파이썬 코드 보기'}
        </button>
        <button class="lesson-reset-btn" id="lesson-reset-btn" aria-label="전체 리셋">↻ 전체 리셋</button>
      </div>`;

        let currentStage = '';
        lesson.cells.forEach(cell => {
            const cellId = `lesson${num}-cell${cell.id}`;
            const isDirectionOnly = cell.title === '예측하고 확인하기' || cell.title === '예측하고 설명하기';

            let pseudoHtml = isDirectionOnly
                ? `<div class="direction-text">${escHTML(cell.pseudo).replace(/\n/g, '<br>')}</div>`
                : `<div class="pseudocode-section">
            <div class="section-label">📝 의사코드</div>
            <pre class="pseudocode">${escHTML(cell.pseudo)}</pre>
          </div>`;

            html += `
      <div class="cell-card" id="${cellId}" data-lesson="${num}" data-cell="${cell.id}">
        <div class="cell-header" role="button" tabindex="0"
             aria-expanded="false" aria-label="${cell.title}">
          <span class="cell-number">[${cell.id}]</span>
          <span class="cell-title">${cell.title}</span>
          <button class="cell-code-toggle" aria-label="개별 파이썬 코드 보기" onclick="event.stopPropagation()">
            🐍 파이썬 코드 보기
          </button>
          <span class="cell-status-icon">▶ 실행</span>
        </div>
        <div class="cell-body ${state.codeVisible || state.cellCodeVisible.has(cellId) ? 'show-code' : ''}">
          ${pseudoHtml}
          <div class="python-section">
            <div class="section-label">🐍 파이썬 코드</div>
            <pre class="python-code">${escHTML(cell.code)}</pre>
          </div>
        </div>
        <div class="cell-loading">
          <div class="spinner"></div><span>실행 중...</span>
        </div>
        <div class="cell-result">
          <div class="result-label">📊 실행 결과</div>
          <div class="result-content" id="${cellId}-result"></div>
        </div>
      </div>`;
        });

        lessonPage.innerHTML = html;
        if (state.codeVisible) lessonPage.classList.add('show-code');
        else lessonPage.classList.remove('show-code');

        // Attach cell click handlers
        lessonPage.querySelectorAll('.cell-header').forEach(header => {
            header.addEventListener('click', () => handleCellClick(header.closest('.cell-card')));
            header.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCellClick(header.closest('.cell-card')); } });
        });

        // Attach individual cell code toggles
        lessonPage.querySelectorAll('.cell-code-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent cell expand/collapse
                const card = btn.closest('.cell-card');
                const cId = card.id;
                const body = card.querySelector('.cell-body');

                if (state.cellCodeVisible.has(cId)) {
                    state.cellCodeVisible.delete(cId);
                    btn.innerHTML = '🐍 파이썬 코드 보기';
                    if (!state.codeVisible) body.classList.remove('show-code');
                } else {
                    state.cellCodeVisible.add(cId);
                    btn.innerHTML = '🐍 파이썬 코드 숨기기';
                    body.classList.add('show-code');
                }
            });
        });

        // Attach lesson-level code toggle
        const lessonCodeBtn = document.getElementById('lesson-code-toggle');
        if (lessonCodeBtn) {
            lessonCodeBtn.addEventListener('click', toggleCode);
        }
        // Attach lesson-level reset
        const lessonResetBtn = document.getElementById('lesson-reset-btn');
        if (lessonResetBtn) {
            lessonResetBtn.addEventListener('click', doReset);
        }
    }

    // ─── Cell Click ───
    let hintTimeout = null;
    function handleCellClick(card) {
        const lesson = parseInt(card.dataset.lesson);
        const cellNum = parseInt(card.dataset.cell);
        const cellId = `lesson${lesson}-cell${cellNum}`;

        // If already expanded → collapse
        if (state.expandedCells.has(cellId)) {
            collapseCell(card, cellId);
            return;
        }

        // Hint: check if previous cell was opened
        if (cellNum > 1) {
            const prevId = `lesson${lesson}-cell${cellNum - 1}`;
            if (!state.openedCells.has(prevId)) {
                showHint();
            }
        }

        // Loading animation
        card.classList.add('loading');
        card.querySelector('.cell-header').setAttribute('aria-expanded', 'true');
        const delay = 600 + Math.random() * 600;

        setTimeout(() => {
            card.classList.remove('loading');
            card.classList.add('expanded');
            state.expandedCells.add(cellId);
            state.openedCells.add(cellId);

            // Render result if first time
            const resultContainer = document.getElementById(cellId + '-result');
            if (resultContainer && !resultContainer.dataset.rendered) {
                renderResult(lesson, cellNum, resultContainer);
                resultContainer.dataset.rendered = '1';
            }

            // Smooth scroll to result
            setTimeout(() => {
                const resultEl = card.querySelector('.cell-result');
                if (resultEl) {
                    resultEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
        }, delay);
    }

    function collapseCell(card, cellId) {
        card.classList.remove('expanded', 'loading');
        card.querySelector('.cell-header').setAttribute('aria-expanded', 'false');
        state.expandedCells.delete(cellId);
    }

    // ─── Render Results ───
    function renderResult(lessonNum, cellNum, container) {
        const lesson = LESSONS[lessonNum];
        const cell = lesson.cells.find(c => c.id === cellNum);
        if (!cell) return;

        switch (cell.resultType) {
            case 'table': renderMeatTable(container); break;
            case 'starTable': renderStarTable(container); break;
            case 'text': renderTextResult(lessonNum, cellNum, container); break;
            case 'chart': renderChart(cell.chartFn, container); break;
            case 'predTable': renderPredTable(container); break;
            case 'metrics': renderMetrics(container); break;
            case 'starMetrics': renderStarMetrics(container); break;
            case 'slider3': renderSlider3(container); break;
            case 'slider4': renderSlider4(container); break;
            case 'slider8': renderSlider8(container); break;
            default: container.innerHTML = '<div class="result-text">결과 없음</div>';
        }
    }

    function renderMeatTable(c) {
        let h = '<div class="table-wrap"><table class="data-table"><thead><tr><th>#</th><th>소고기 가격</th><th>돼지고기 가격</th></tr></thead><tbody>';
        MEAT_DATA.slice(0, 10).forEach((d, i) => {
            h += `<tr><td>${i}</td><td>${d[0].toLocaleString()}</td><td>${d[1].toLocaleString()}</td></tr>`;
        });
        h += '</tbody></table></div>';
        h += `<div class="result-info">... 외 ${MEAT_DATA.length - 10}개 행 (총 ${MEAT_DATA.length}개 데이터)</div>`;
        c.innerHTML = h;
    }

    function renderStarTable(c) {
        let h = '<div class="table-wrap"><table class="data-table"><thead><tr><th>#</th><th>온도(K)</th><th>절대등급(Mv)</th><th>별 종류</th></tr></thead><tbody>';
        STAR_DATA.slice(0, 10).forEach((d, i) => {
            h += `<tr><td>${i}</td><td>${d.t.toLocaleString()}</td><td>${d.mv}</td><td>${d.type}</td></tr>`;
        });
        h += '</tbody></table></div>';
        h += `<div class="result-info">... 외 ${STAR_DATA.length - 10}개 행 (총 ${STAR_DATA.length}개 데이터)</div>`;
        c.innerHTML = h;
    }

    function renderTextResult(lessonNum, cellNum, c) {
        const texts = {
            '3-2': `<div class="result-mono">x_col = "소고기 가격"\ny_col = "돼지고기 가격"\n\n입력값(input): ${MEAT_DATA.length}개의 소고기 가격 데이터\n출력값(output): ${MEAT_DATA.length}개의 돼지고기 가격 데이터</div>`,
            '3-4': `<div class="result-text">✅ 데이터를 훈련/테스트 세트로 분리했습니다.\n\n📊 훈련 데이터: ${MEAT_TRAIN_IDX.length}개 (80%)\n📊 테스트 데이터: ${MEAT_TEST_IDX.length}개 (20%)</div>`,
            '3-5': `<div class="result-text">✅ 선형 회귀 모델(<b>model_a</b>)이 학습을 완료했습니다.\n\n모델 종류: LinearRegression\n학습 데이터: ${MEAT_TRAIN_IDX.length}개의 훈련 데이터</div>`,
            '4-2': `<div class="result-mono">x_col = "온도(K)"\ny_col = "절대등급(Mv)"\nt_col = "별 종류"\n\n입력값(input): ${STAR_DATA.length}개의 (온도, 절대등급) 데이터\n출력값(output): ${STAR_DATA.length}개의 별 종류 데이터\n별 종류: ${STAR_TYPES.join(', ')}</div>`,
            '4-4': `<div class="result-text">✅ 데이터를 훈련/테스트 세트로 분리했습니다.\n\n📊 훈련 데이터: ${getStarTrain().length}개 (70%)\n📊 테스트 데이터: ${getStarTest().length}개 (30%)</div>`,
            '4-5': `<div class="result-text">✅ 서포트 벡터 머신 분류 모델(<b>model_b</b>)이 학습을 완료했습니다.\n\n모델 종류: 서포트 벡터 머신(SVC)\n학습 데이터: ${getStarTrain().length}개의 훈련 데이터</div>`,
            '8-1': `<div class="result-text">✅ 모델(<b>model_b</b>)을 불러왔습니다.\n\n입력값: 온도(K), 절대등급(Mv)\n출력값: 별 종류\n모델 종류: 서포트 벡터 머신(SVC)</div>`,
            '8-2': `<div class="result-text">✅ 설명기(<b>explainer</b>) 설정이 완료되었습니다.\n\n이제 모델의 예측 결과와 함께 설명 그래프를 볼 수 있습니다.</div>`
        };
        const key = `${lessonNum}-${cellNum}`;
        c.innerHTML = texts[key] || '<div class="result-text">완료</div>';
        // Convert \n to <br> in result-text and result-mono
        c.querySelectorAll('.result-text, .result-mono').forEach(el => {
            el.innerHTML = el.innerHTML.replace(/\n/g, '<br>');
        });
    }

    function renderChart(fnName, c) {
        const chartDiv = document.createElement('div');
        chartDiv.className = 'chart-container';
        c.appendChild(chartDiv);
        if (CHART_FNS[fnName]) CHART_FNS[fnName](chartDiv);
    }

    function renderPredTable(c) {
        const test = getMeatTest();
        let h = '<div class="table-wrap"><table class="data-table"><thead><tr><th>입력값<br>(소고기 가격)</th><th>실제 출력값<br>(돼지고기 가격)</th><th>예측값</th></tr></thead><tbody>';
        test.forEach(d => {
            const pred = Math.round(meatPredict(d[0]));
            h += `<tr><td>${d[0].toLocaleString()}</td><td>${d[1].toLocaleString()}</td><td>${pred.toLocaleString()}</td></tr>`;
        });
        h += '</tbody></table></div>';
        c.innerHTML = h;
    }

    function renderMetrics(c) {
        c.innerHTML = `<div class="result-mono">[회귀 모델]\n입력값: 소고기 가격\n출력값: 돼지고기 가격\n\n가중치, 기울기(weight): ${MEAT_MODEL.w.toFixed(2)}\n편향, 절편(bias): ${MEAT_MODEL.b.toFixed(2)}\n설명력(score): ${(MEAT_MODEL.score / 100).toFixed(4)}</div>`.replace(/\n/g, '<br>');
    }

    function renderStarMetrics(c) {
        c.innerHTML = `<div class="result-mono">[분류 모델]\n입력값: 온도(K), 절대등급(Mv)\n출력값: 별 종류\n\n정확도(score): ${(STAR_MODEL.score / 100).toFixed(4)}</div>`.replace(/\n/g, '<br>');
    }

    function renderSlider3(c) {
        c.innerHTML = `
      <div class="interactive-section">
        <div class="slider-group">
          <div class="slider-label">
            <span>🥩 소고기 가격</span>
            <span class="slider-value" id="sv3">10,800원</span>
          </div>
          <input type="range" id="sl3" min="2000" max="12000" step="200" value="10800"
                 aria-label="소고기 가격 슬라이더">
        </div>
        <div class="prediction-box" id="pred3">
          소고기 가격이 10,800원일 때,<br>돼지고기 가격은 <b>${Math.round(meatPredict(10800)).toLocaleString()}원</b>일 것으로 예측됩니다.
        </div>
        <div class="result-info">✏️ 모델이 위와 같이 예측한 이유가 무엇일지 생각해보고, 학습지에 작성해보세요.</div>
      </div>`;
        const slider = c.querySelector('#sl3');
        slider.addEventListener('input', () => {
            const v = parseInt(slider.value);
            c.querySelector('#sv3').textContent = v.toLocaleString() + '원';
            const pred = Math.round(meatPredict(v));
            c.querySelector('#pred3').innerHTML =
                `소고기 가격이 ${v.toLocaleString()}원일 때,<br>돼지고기 가격은 <b>${pred.toLocaleString()}원</b>일 것으로 예측됩니다.`;
        });
    }

    function renderSlider4(c) {
        const defK = 22100, defMv = 4;
        const initResult = classifyStar(defK, defMv);
        c.innerHTML = `
      <div class="interactive-section">
        <div class="slider-group">
          <div class="slider-label"><span>🌡️ 온도(K)</span><span class="slider-value" id="sv4k">${defK.toLocaleString()}K</span></div>
          <input type="range" id="sl4k" min="3000" max="40000" step="50" value="${defK}" aria-label="온도 슬라이더">
        </div>
        <div class="slider-group">
          <div class="slider-label"><span>⭐ 절대등급(Mv)</span><span class="slider-value" id="sv4m">${defMv}</span></div>
          <input type="range" id="sl4m" min="-15" max="15" step="0.1" value="${defMv}" aria-label="절대등급 슬라이더">
        </div>
        <div class="prediction-box" id="pred4">
          온도 ${defK.toLocaleString()}K, 절대등급 ${defMv.toFixed(1)}일 때,<br>이 별은 '<b>${initResult}</b>'으로 분류됩니다.
        </div>
        <div class="result-info">✏️ 모델이 위와 같이 예측한 이유가 무엇일지 생각해보고, 학습지에 작성해보세요.</div>
      </div>`;
        const updatePred4 = () => {
            const k = parseInt(c.querySelector('#sl4k').value);
            const mv = parseFloat(c.querySelector('#sl4m').value);
            c.querySelector('#sv4k').textContent = k.toLocaleString() + 'K';
            c.querySelector('#sv4m').textContent = mv.toString();
            const res = classifyStar(k, mv);
            c.querySelector('#pred4').innerHTML =
                `온도 ${k.toLocaleString()}K, 절대등급 ${mv.toFixed(1)}일 때,<br>이 별은 '<b>${res}</b>'으로 분류됩니다.`;
        };
        c.querySelector('#sl4k').addEventListener('input', updatePred4);
        c.querySelector('#sl4m').addEventListener('input', updatePred4);
    }

    function getPseudoLime(t, mv, predicted_class) {
        let t_weight = 0;
        let mv_weight = 0;
        if (predicted_class === '거성') {
            mv_weight = mv < 0 ? 0.75 : -0.25;
            t_weight = t < 6000 ? 0.35 : (t > 20000 ? 0.25 : -0.15);
        } else if (predicted_class === '백색왜성') {
            mv_weight = mv > 5 ? 0.65 : -0.45;
            t_weight = t > 8000 ? 0.55 : -0.35;
        } else {
            t_weight = t < 20000 ? 0.45 : -0.2;
            mv_weight = mv > 0 ? 0.45 : -0.2;
        }
        t_weight += Math.sin(t / 123) * 0.05;
        mv_weight += Math.cos(mv * 1.5) * 0.05;
        return {
            t_val: parseFloat((t_weight * 100).toFixed(1)),
            mv_val: parseFloat((mv_weight * 100).toFixed(1))
        };
    }

    function renderSlider8(c) {
        const defK = 22100, defMv = 4;
        c.innerHTML = `
      <div class="interactive-section lime-interactive">
        <div class="lime-inputs">
            <div class="slider-group">
            <div class="slider-label"><span>🌡️ 온도(K)</span><span class="slider-value" id="sv8k">${defK.toLocaleString()}K</span></div>
            <input type="range" id="sl8k" min="3000" max="40000" step="50" value="${defK}" aria-label="온도 슬라이더">
            </div>
            <div class="slider-group">
            <div class="slider-label"><span>⭐ 절대등급(Mv)</span><span class="slider-value" id="sv8m">${defMv}</span></div>
            <input type="range" id="sl8m" min="-15" max="15" step="0.1" value="${defMv}" aria-label="절대등급 슬라이더">
            </div>
            <div class="prediction-box text-center" id="pred8"></div>
        </div>
        <div class="lime-layout">
            <div class="lime-chart-box" id="lime-chart-container"></div>
            <div class="lime-bars-box">
                <div class="lime-title">📊 설명(LIME)</div>
                <div class="lime-subtitle">막대가 길수록 해당 특성이 예측에 미친 영향이 큽니다.</div>
                <div class="lime-bars" id="lime-bars"></div>
                <div class="lime-legend">
                    <span class="legend-item"><span class="color-box positive"></span>예측값 지지(강화)</span>
                    <span class="legend-item"><span class="color-box negative"></span>예측값 반대(약화)</span>
                </div>
            </div>
        </div>
      </div>`;

        const chartBox = c.querySelector('#lime-chart-container');
        const updateChartPoint = CHART_FNS.createStarLimeChart(chartBox);

        const updatePred8 = () => {
            const k = parseInt(c.querySelector('#sl8k').value);
            const mv = parseFloat(c.querySelector('#sl8m').value);
            c.querySelector('#sv8k').textContent = k.toLocaleString() + 'K';
            c.querySelector('#sv8m').textContent = mv.toFixed(1);

            const predictedClass = classifyStar(k, mv);

            let predHtml = `온도 ${k.toLocaleString()}K, 절대등급 ${mv.toFixed(1)}Mv일 때, 이 별의 예측값은 <strong>${predictedClass}</strong>입니다.`;
            if (typeof STAR_DATA !== 'undefined') {
                const match = STAR_DATA.find(d => Math.abs(d.t - k) <= 5 && Math.abs(d.mv - mv) <= 0.5);
                if (match) {
                    predHtml += `<br>(온도 ${match.t.toFixed(0)}K, 절대등급 ${match.mv}Mv인 별의 실제값은 <strong>${match.type}</strong>입니다.)`;
                }
            }
            c.querySelector('#pred8').innerHTML = predHtml;

            updateChartPoint(k, mv, predictedClass);

            const explanation = getPseudoLime(k, mv, predictedClass);
            const barsHtml = [
                { name: '온도(K)', val: explanation.t_val },
                { name: '절대등급(Mv)', val: explanation.mv_val }
            ].map(f => {
                const isPos = f.val >= 0;
                const absVal = Math.min(50, Math.abs(f.val) / 2);
                const barClass = isPos ? 'positive' : 'negative';
                return `
                <div class="lime-feature">
                    <div class="lime-f-name">${f.name}</div>
                    <div class="lime-f-track">
                        <div class="lime-f-center"></div>
                        <div class="lime-f-bar ${barClass} ${isPos ? 'right' : 'left'}" style="width: ${absVal}%">
                            <span class="lime-f-val ${isPos ? 'pos' : 'neg'}">${f.val > 0 ? '+' : ''}${f.val.toFixed(1)}</span>
                        </div>
                    </div>
                </div>`;
            }).join('');

            c.querySelector('#lime-bars').innerHTML = barsHtml;
        };

        c.querySelector('#sl8k').addEventListener('input', updatePred8);
        c.querySelector('#sl8m').addEventListener('input', updatePred8);

        // initial call
        setTimeout(updatePred8, 10);
    }

    // ─── Code Toggle ───
    function toggleCode() {
        state.codeVisible = !state.codeVisible;
        codeToggleBtn.classList.toggle('active', state.codeVisible);
        codeToggleBtn.setAttribute('aria-pressed', state.codeVisible);

        // Update all cell bodies to match global state, overriding individual toggles
        if (lessonPage) {
            lessonPage.classList.toggle('show-code', state.codeVisible);
            document.querySelectorAll('.cell-body').forEach(body => {
                body.classList.toggle('show-code', state.codeVisible);
            });
            document.querySelectorAll('.cell-code-toggle').forEach(btn => {
                const cardId = btn.closest('.cell-card').id;
                if (state.codeVisible) {
                    state.cellCodeVisible.add(cardId);
                    btn.innerHTML = '🐍 파이썬 코드 숨기기';
                } else {
                    state.cellCodeVisible.delete(cardId);
                    btn.innerHTML = '🐍 파이썬 코드 보기';
                }
            });
        }

        // Update global button texts
        const label = state.codeVisible ? '파이썬 코드 숨기기' : '파이썬 코드 보기';
        const lessonBtn = document.getElementById('lesson-code-toggle');
        if (lessonBtn) lessonBtn.innerHTML = `🐍 ${label}`;
    }
    codeToggleBtn.addEventListener('click', toggleCode);

    // ─── Reset ───
    function doReset() {
        state.openedCells.clear();
        state.expandedCells.clear();
        state.cellCodeVisible.clear();
        document.querySelectorAll('.cell-card').forEach(card => {
            card.classList.remove('expanded', 'loading');
            card.querySelector('.cell-header').setAttribute('aria-expanded', 'false');
            card.querySelector('.cell-body').classList.remove('show-code');
            const toggle = card.querySelector('.cell-code-toggle');
            if (toggle) toggle.innerHTML = '🐍 파이썬 코드 보기';
        });
        hintBanner.classList.add('hidden');
        if (hintTimeout) clearTimeout(hintTimeout);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    resetBtn.addEventListener('click', doReset);

    // ─── Hint Banner ───
    function showHint() {
        if (hintTimeout) clearTimeout(hintTimeout);
        hintBanner.classList.remove('hidden');
        hintTimeout = setTimeout(() => hintBanner.classList.add('hidden'), 2500);
    }

    // ─── Offline Detection ───
    function updateOnline() {
        offlineBanner.classList.toggle('hidden', navigator.onLine);
        const badge = $('status-badge');
        if (navigator.onLine) {
            badge.textContent = '✓ 콘텐츠 로드됨';
            badge.style.color = ''; badge.style.borderColor = ''; badge.style.background = '';
        } else {
            badge.textContent = '📡 오프라인';
            badge.style.color = 'var(--amber)';
            badge.style.borderColor = 'rgba(251,191,36,0.3)';
            badge.style.background = 'rgba(251,191,36,0.1)';
        }
    }
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);

    // ─── PWA Service Worker Registration ───
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').then(reg => {
            reg.update();
        }).catch(() => { });
    }

    // ─── Utility ───
    function escHTML(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // ─── Init ───
    updateOnline();
    navigate();
})();
