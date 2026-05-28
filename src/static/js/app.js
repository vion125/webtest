/* ==========================================================================
   AWS Flask Web App JavaScript Module
   處理即時時鐘、Feature 1 股市畫圖/自訂清單、Feature 2 工作任務看板與計時器
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // 啟動即時時鐘
    initLiveClock();

    // 依據當前路徑決定要載入的模組
    const path = window.location.pathname;
    if (path === '/feature1') {
        initFeature1Stocks();
    } else if (path === '/feature2') {
        initFeature2Tasks();
    }
});

/* ==========================================================================
   共享功能：即時時鐘 Widget
   ========================================================================== */
function initLiveClock() {
    const timeElement = document.getElementById('current-live-time');
    if (!timeElement) return;

    function updateClock() {
        const now = new Date();
        const hrs = String(now.getHours()).padStart(2, '0');
        const mins = String(now.getMinutes()).padStart(2, '0');
        const secs = String(now.getSeconds()).padStart(2, '0');
        timeElement.textContent = `${hrs}:${mins}:${secs}`;
    }

    updateClock();
    setInterval(updateClock, 1000);
}

/* ==========================================================================
   Feature 1: 早上看股 (Morning Stocks) 模組
   ========================================================================== */
function initFeature1Stocks() {
    let allStocks = {};
    let selectedStockCode = '2330'; // 預設選中台積電
    let watchlist = JSON.parse(localStorage.getItem('stock_watchlist')) || ['2330', '2317'];

    const stockGrid = document.getElementById('stock-cards-grid');
    const searchInput = document.getElementById('stock-search');
    const watchlistContainer = document.getElementById('watchlist-items');

    // 獲取最新股票數據
    async function fetchStocksData() {
        try {
            const response = await fetch('/api/stocks');
            if (!response.ok) throw new Error('獲取股票數據失敗');
            allStocks = await response.json();
            
            renderStocks();
            renderWatchlist();
            renderSelectedStockDetail();
        } catch (error) {
            console.error('股市 API 錯誤:', error);
        }
    }

    // 渲染股票清單 (支援搜尋篩選)
    function renderStocks() {
        if (!stockGrid) return;
        const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
        stockGrid.innerHTML = '';

        Object.keys(allStocks).forEach(code => {
            const stock = allStocks[code];
            if (query && !code.includes(query) && !stock.name.toLowerCase().includes(query)) {
                return; // 不符合搜尋條件
            }

            const isSelected = code === selectedStockCode;
            const trendClass = stock.change >= 0 ? 'up-trend' : 'down-trend';
            const icon = stock.change >= 0 ? 'fa-caret-up' : 'fa-caret-down';
            const changePrefix = stock.change >= 0 ? '+' : '';

            const card = document.createElement('div');
            card.className = `stock-card ${isSelected ? 'selected' : ''}`;
            card.id = `stock-card-${code}`;
            card.innerHTML = `
                <div class="stock-card-top">
                    <div>
                        <div class="stock-name">${stock.name}</div>
                        <span class="stock-industry">${stock.industry}</span>
                    </div>
                    <span class="stock-code-badge">${code}</span>
                </div>
                <div class="stock-card-price-row">
                    <div class="stock-price">${stock.price.toFixed(1)}</div>
                    <div class="stock-change ${trendClass}">
                        <i class="fa-solid ${icon}"></i>
                        <span>${changePrefix}${stock.change.toFixed(1)} (${changePrefix}${stock.percent.toFixed(2)}%)</span>
                    </div>
                </div>
            `;

            card.addEventListener('click', () => {
                selectedStockCode = code;
                document.querySelectorAll('.stock-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                renderSelectedStockDetail();
            });

            stockGrid.appendChild(card);
        });
    }

    // 渲染觀察清單
    function renderWatchlist() {
        if (!watchlistContainer) return;
        watchlistContainer.innerHTML = '';

        if (watchlist.length === 0) {
            watchlistContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 1rem;">暫無關注股票</div>';
            return;
        }

        watchlist.forEach(code => {
            const stock = allStocks[code];
            if (!stock) return;

            const trendClass = stock.change >= 0 ? 'up-trend' : 'down-trend';
            const changePrefix = stock.change >= 0 ? '+' : '';

            const item = document.createElement('div');
            item.className = 'watchlist-item';
            item.innerHTML = `
                <div class="watchlist-item-left">
                    <span class="watchlist-item-name">${stock.name.split(' ')[0]}</span>
                    <span class="watchlist-item-code">${code}</span>
                </div>
                <div class="watchlist-item-right">
                    <span class="stock-price" style="font-size: 0.95rem;">${stock.price.toFixed(1)}</span>
                    <span class="stock-change ${trendClass}" style="font-size: 0.75rem;">${changePrefix}${stock.percent.toFixed(1)}%</span>
                    <button class="btn-remove-watchlist" data-code="${code}" title="移出觀察清單">
                        <i class="fa-solid fa-circle-minus"></i>
                    </button>
                </div>
            `;

            item.querySelector('.btn-remove-watchlist').addEventListener('click', (e) => {
                e.stopPropagation();
                removeFromWatchlist(code);
            });

            item.addEventListener('click', () => {
                selectedStockCode = code;
                renderStocks();
                renderSelectedStockDetail();
            });

            watchlistContainer.appendChild(item);
        });
    }

    // 渲染選定股票的詳細走勢圖 (使用 HTML5 Canvas 渲染高級折線圖)
    function renderSelectedStockDetail() {
        const stock = allStocks[selectedStockCode];
        if (!stock) return;

        // 更新詳細資訊看板
        const detailCode = document.getElementById('detail-stock-code');
        const detailName = document.getElementById('detail-stock-name');
        const detailPrice = document.getElementById('detail-stock-price');
        const detailChange = document.getElementById('detail-stock-change');
        const detailHigh = document.getElementById('detail-stock-high');
        const detailLow = document.getElementById('detail-stock-low');
        const btnWatchlist = document.getElementById('btn-toggle-watchlist');

        if (detailCode) detailCode.textContent = selectedStockCode;
        if (detailName) detailName.textContent = stock.name;
        if (detailPrice) detailPrice.textContent = stock.price.toFixed(1);
        
        if (detailChange) {
            const trendClass = stock.change >= 0 ? 'up-trend' : 'down-trend';
            const icon = stock.change >= 0 ? 'fa-caret-up' : 'fa-caret-down';
            const changePrefix = stock.change >= 0 ? '+' : '';
            detailChange.className = `stock-change ${trendClass}`;
            detailChange.innerHTML = `<i class="fa-solid ${icon}"></i> ${changePrefix}${stock.change.toFixed(1)} (${changePrefix}${stock.percent.toFixed(2)}%)`;
        }

        if (detailHigh) detailHigh.textContent = stock.high.toFixed(1);
        if (detailLow) detailLow.textContent = stock.low.toFixed(1);

        if (btnWatchlist) {
            const isWatched = watchlist.includes(selectedStockCode);
            btnWatchlist.className = `btn-watchlist-toggle ${isWatched ? 'watched' : ''}`;
            btnWatchlist.innerHTML = isWatched 
                ? '<i class="fa-solid fa-star"></i> 已在關注名單' 
                : '<i class="fa-regular fa-star"></i> 加入觀察清單';
            
            // 重新綁定事件
            btnWatchlist.onclick = () => toggleWatchlist(selectedStockCode);
        }

        // 繪製走勢圖
        drawStockChart('stock-trend-canvas', stock.history, stock.change >= 0 ? '#ff4d4d' : '#2ecc71');
    }

    // 繪製高解析度折線走勢圖 (Canvas)
    function drawStockChart(canvasId, history, color) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        // 設定高清 Canvas 解析度
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * 2;
        canvas.height = rect.height * 2;
        
        const ctx = canvas.getContext('2d');
        ctx.scale(2, 2);

        const width = rect.width;
        const height = rect.height;
        const padding = 30;

        ctx.clearRect(0, 0, width, height);

        // 獲取數據邊界
        const minVal = Math.min(...history) * 0.998;
        const maxVal = Math.max(...history) * 1.002;
        const range = maxVal - minVal;

        // 繪製水平格線與價格標籤
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        ctx.fillStyle = '#6b7280';
        ctx.font = '10px Outfit, monospace';
        ctx.textAlign = 'right';

        const gridCount = 4;
        for (let i = 0; i <= gridCount; i++) {
            const val = minVal + (range * (i / gridCount));
            const y = height - padding - ((val - minVal) / range) * (height - 2 * padding);
            
            // 畫線
            ctx.beginPath();
            ctx.moveTo(padding * 1.5, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();

            // 標籤
            ctx.fillText(val.toFixed(1), padding * 1.3, y + 3);
        }

        // 繪製折線與漸層區域
        const points = history.map((val, idx) => {
            const x = padding * 1.5 + (idx / (history.length - 1)) * (width - 2.5 * padding);
            const y = height - padding - ((val - minVal) / range) * (height - 2 * padding);
            return { x, y };
        });

        // 1. 滿版半透明漸層
        const grad = ctx.createLinearGradient(0, padding, 0, height - padding);
        grad.addColorStop(0, color + '33'); // 20% opacity
        grad.addColorStop(1, color + '00'); // transparent
        
        ctx.beginPath();
        ctx.moveTo(points[0].x, height - padding);
        points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(points[points.length - 1].x, height - padding);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // 2. 主折線
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            // 平滑曲線 (貝茲曲線) 插值
            const xc = (points[i - 1].x + points[i].x) / 2;
            const yc = (points[i - 1].y + points[i].y) / 2;
            ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
        }
        ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.stroke();
        
        // 重設 shadow
        ctx.shadowBlur = 0;

        // 3. 繪製端點小圓點
        points.forEach((p, idx) => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, idx === points.length - 1 ? 5 : 3.5, 0, 2 * Math.PI);
            ctx.fillStyle = idx === points.length - 1 ? color : '#1e293b';
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.fill();
            ctx.stroke();
        });
    }

    // 關注名單管理邏輯
    function toggleWatchlist(code) {
        if (watchlist.includes(code)) {
            removeFromWatchlist(code);
        } else {
            watchlist.push(code);
            localStorage.setItem('stock_watchlist', JSON.stringify(watchlist));
            renderWatchlist();
            renderSelectedStockDetail();
        }
    }

    function removeFromWatchlist(code) {
        watchlist = watchlist.filter(c => c !== code);
        localStorage.setItem('stock_watchlist', JSON.stringify(watchlist));
        renderWatchlist();
        renderSelectedStockDetail();
    }

    // 事件監聽器
    if (searchInput) {
        searchInput.addEventListener('input', renderStocks);
    }

    // 啟動初始加載
    fetchStocksData();
}

/* ==========================================================================
   Feature 2: 下午上班的公司 (Afternoon Company Dashboard) 模組
   ========================================================================== */
function initFeature2Tasks() {
    let allTasks = [];
    let activeTimer = null;
    let timerSeconds = 0;

    const todoCol = document.getElementById('col-todo');
    const doingCol = document.getElementById('col-doing');
    const doneCol = document.getElementById('col-done');

    const btnAddTask = document.getElementById('btn-show-task-form');
    const formOverlay = document.getElementById('task-form-overlay');
    const btnCancel = document.getElementById('btn-task-cancel');
    const taskForm = document.getElementById('task-creation-form');

    // 工時器 DOM
    const timerDisplay = document.getElementById('work-timer-display');
    const btnTimerStart = document.getElementById('btn-timer-start');
    const btnTimerPause = document.getElementById('btn-timer-pause');

    // 獲取任務資料
    async function fetchTasks() {
        try {
            const response = await fetch('/api/tasks');
            if (!response.ok) throw new Error('獲取任務失敗');
            allTasks = await response.json();
            renderKanban();
        } catch (error) {
            console.error('任務 API 錯誤:', error);
        }
    }

    // 渲染看板
    function renderKanban() {
        if (!todoCol || !doingCol || !doneCol) return;

        // 清空欄位
        todoCol.innerHTML = '';
        doingCol.innerHTML = '';
        doneCol.innerHTML = '';

        let todoCount = 0;
        let doingCount = 0;
        let doneCount = 0;

        allTasks.forEach(task => {
            const card = document.createElement('div');
            card.className = 'task-card';
            card.id = `task-card-${task.id}`;
            card.draggable = true;
            card.innerHTML = `
                <span class="task-priority-badge priority-${task.priority}-bg" title="優先級: ${task.priority}"></span>
                <h3 class="task-title">${task.title}</h3>
                <p class="task-desc">${task.desc || '無詳細描述'}</p>
                <div class="task-footer">
                    <span class="stock-code-badge" style="font-size: 0.7rem; background: rgba(130,87,229,0.1); color: var(--afternoon-primary);">ID: ${task.id}</span>
                    <div class="task-actions">
                        ${task.status !== 'todo' ? `<button class="task-btn" onclick="updateTaskStatus(${task.id}, 'prev')"><i class="fa-solid fa-arrow-left"></i></button>` : ''}
                        ${task.status !== 'done' ? `<button class="task-btn" onclick="updateTaskStatus(${task.id}, 'next')"><i class="fa-solid fa-arrow-right"></i></button>` : ''}
                        <button class="task-btn task-btn-delete" onclick="deleteTask(${task.id})"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `;

            // 支援滑鼠拖曳 API (可供未來擴充)
            card.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', task.id);
            });

            if (task.status === 'todo') {
                todoCol.appendChild(card);
                todoCount++;
            } else if (task.status === 'doing') {
                doingCol.appendChild(card);
                doingCount++;
            } else if (task.status === 'done') {
                doneCol.appendChild(card);
                doneCount++;
            }
        });

        // 更新欄位計數
        const todoCountEl = document.getElementById('count-todo');
        const doingCountEl = document.getElementById('count-doing');
        const doneCountEl = document.getElementById('count-done');

        if (todoCountEl) todoCountEl.textContent = todoCount;
        if (doingCountEl) doingCountEl.textContent = doingCount;
        if (doneCountEl) doneCountEl.textContent = doneCount;
    }

    // 修改任務狀態 (向前/向後移動)
    window.updateTaskStatus = async function(taskId, direction) {
        const task = allTasks.find(t => t.id === taskId);
        if (!task) return;

        let newStatus = task.status;
        if (direction === 'next') {
            newStatus = task.status === 'todo' ? 'doing' : 'done';
        } else if (direction === 'prev') {
            newStatus = task.status === 'done' ? 'doing' : 'todo';
        }

        try {
            const response = await fetch(`/api/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                fetchTasks();
            }
        } catch (error) {
            console.error('更新任務狀態失敗:', error);
        }
    };

    // 刪除任務
    window.deleteTask = async function(taskId) {
        if (!confirm('確定要刪除這項工作任務嗎？')) return;
        try {
            const response = await fetch(`/api/tasks/${taskId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                fetchTasks();
            }
        } catch (error) {
            console.error('刪除任務失敗:', error);
        }
    };

    // 新增任務表單控制
    if (btnAddTask && formOverlay && btnCancel) {
        btnAddTask.addEventListener('click', () => {
            formOverlay.style.display = 'flex';
            setTimeout(() => formOverlay.classList.add('active'), 10);
        });

        const closeForm = () => {
            formOverlay.classList.remove('active');
            setTimeout(() => formOverlay.style.display = 'none', 300);
            taskForm.reset();
        };

        btnCancel.addEventListener('click', closeForm);

        if (taskForm) {
            taskForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const title = document.getElementById('task-title-input').value.trim();
                const desc = document.getElementById('task-desc-input').value.trim();
                const priority = document.getElementById('task-priority-input').value;

                if (!title) return;

                try {
                    const response = await fetch('/api/tasks', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ title, desc, priority })
                    });

                    if (response.ok) {
                        closeForm();
                        fetchTasks();
                    }
                } catch (error) {
                    console.error('新增任務失敗:', error);
                }
            });
        }
    }

    // 看板拖曳目標釋放處理
    const setupDragAndDrop = () => {
        const columns = [
            { el: document.getElementById('cards-todo'), status: 'todo' },
            { el: document.getElementById('cards-doing'), status: 'doing' },
            { el: document.getElementById('cards-done'), status: 'done' }
        ];

        columns.forEach(col => {
            if (!col.el) return;
            col.el.addEventListener('dragover', (e) => {
                e.preventDefault();
            });

            col.el.addEventListener('drop', async (e) => {
                e.preventDefault();
                const taskId = parseInt(e.dataTransfer.getData('text/plain'));
                if (isNaN(taskId)) return;

                try {
                    const response = await fetch(`/api/tasks/${taskId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: col.status })
                    });
                    if (response.ok) fetchTasks();
                } catch (error) {
                    console.error('拖曳更新狀態失敗:', error);
                }
            });
        });
    };

    // --- 下午上班番茄鐘/工時器 ---
    if (btnTimerStart && btnTimerPause && timerDisplay) {
        btnTimerStart.addEventListener('click', () => {
            if (activeTimer) return;
            
            btnTimerStart.disabled = true;
            btnTimerPause.disabled = false;
            
            activeTimer = setInterval(() => {
                timerSeconds++;
                const hrs = String(Math.floor(timerSeconds / 3600)).padStart(2, '0');
                const mins = String(Math.floor((timerSeconds % 3600) / 60)).padStart(2, '0');
                const secs = String(timerSeconds % 60).padStart(2, '0');
                timerDisplay.textContent = `${hrs}:${mins}:${secs}`;
            }, 1000);
        });

        btnTimerPause.addEventListener('click', () => {
            if (!activeTimer) return;
            
            clearInterval(activeTimer);
            activeTimer = null;
            btnTimerStart.disabled = false;
            btnTimerPause.disabled = true;
        });
    }

    // 啟動
    fetchTasks();
    setupDragAndDrop();
}
