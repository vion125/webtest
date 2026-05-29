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
    } else if (path === '/feature3') {
        initFeature3Files();
    } else if (path === '/feature4') {
        initFeature4Stress();
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

/* ==========================================================================
   Feature 3: S3 檔案雲 (S3 Secure File Manager) 模組
   ========================================================================== */
function initFeature3Files() {
    const dropzone = document.getElementById('upload-dropzone');
    const fileInput = document.getElementById('file-input');
    const progressContainer = document.getElementById('upload-progress-container');
    const progressBar = document.getElementById('upload-progress-bar');
    const progressPercent = document.getElementById('upload-percentage');
    const progressFilename = document.getElementById('upload-filename');
    
    const filesListBody = document.getElementById('files-list-body');
    const btnRefresh = document.getElementById('btn-refresh-files');

    // 1. 偵測 S3 的 AWS 安全憑證狀態
    async function checkS3Status() {
        try {
            const response = await fetch('/api/files/status');
            const status = await response.json();

            const envBadge = document.getElementById('s3-env-badge');
            const secStatus = document.getElementById('sec-conn-status');
            const secSource = document.getElementById('sec-credential-source');

            if (status.s3_active) {
                if (envBadge) {
                    envBadge.className = 'portal-time-badge morning-badge';
                    envBadge.innerHTML = '<i class="fa-solid fa-shield-halved"></i> 🔒 已安全連線 S3';
                }
                if (secStatus) {
                    secStatus.className = 'sec-value badge-green';
                    secStatus.textContent = '已啟用 S3 安全鏈';
                }
                if (secSource) {
                    secSource.textContent = 'AWS IAM ECS Task Role';
                }
            } else {
                if (envBadge) {
                    envBadge.className = 'portal-time-badge afternoon-badge';
                    envBadge.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> 💡 本機模擬模式';
                }
                if (secStatus) {
                    secStatus.className = 'sec-value badge-yellow';
                    secStatus.textContent = '本機安全模擬區';
                }
                if (secSource) {
                    secSource.textContent = 'uploads_sandbox 資料夾';
                }
            }
        } catch (error) {
            console.error('無法讀取 S3 狀態資訊:', error);
        }
    }

    // 2. 取得檔案清單
    async function fetchFilesList() {
        if (!filesListBody) return;
        
        // 顯示載入動畫
        filesListBody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 3rem;">
                    <i class="fa-solid fa-circle-notch fa-spin"></i> 正在向雲端讀取檔案中...
                </td>
            </tr>
        `;

        try {
            const response = await fetch('/api/files');
            if (!response.ok) throw new Error('讀取檔案列表失敗');
            const files = await response.json();

            filesListBody.innerHTML = '';

            if (files.length === 0) {
                filesListBody.innerHTML = `
                    <tr>
                        <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 3rem;">
                            <i class="fa-solid fa-folder-open" style="font-size: 2rem; margin-bottom: 0.8rem; display: block; color: rgba(255,255,255,0.08);"></i>
                            目前無已上傳的檔案，拖曳檔案即可上傳。
                        </td>
                    </tr>
                `;
                return;
            }

            files.forEach(file => {
                const tr = document.createElement('tr');
                
                // 決定檔案圖標
                let fileIcon = 'fa-file';
                const ext = file.name.split('.').pop().toLowerCase();
                if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) {
                    fileIcon = 'fa-file-image';
                } else if (['pdf'].includes(ext)) {
                    fileIcon = 'fa-file-pdf';
                } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
                    fileIcon = 'fa-file-zipper';
                } else if (['txt', 'md', 'json'].includes(ext)) {
                    fileIcon = 'fa-file-lines';
                } else if (['py', 'js', 'html', 'css', 'go', 'sh'].includes(ext)) {
                    fileIcon = 'fa-file-code';
                }

                // 格式化檔案大小
                let sizeStr = `${file.size} B`;
                if (file.size > 1024 * 1024) {
                    sizeStr = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
                } else if (file.size > 1024) {
                    sizeStr = `${(file.size / 1024).toFixed(1)} KB`;
                }

                tr.innerHTML = `
                    <td>
                        <div class="files-table-filename">
                            <i class="fa-solid ${fileIcon} file-icon"></i>
                            <span>${file.name}</span>
                        </div>
                    </td>
                    <td style="font-family: monospace; font-size: 0.85rem;">${sizeStr}</td>
                    <td style="font-family: monospace; font-size: 0.85rem; color: var(--text-secondary);">${file.last_modified}</td>
                    <td style="text-align: right;">
                        <button class="task-btn btn-file-download" data-filename="${file.name}" style="color: #2ecc71; margin-right: 0.8rem;" title="安全下載">
                            <i class="fa-solid fa-circle-down"></i> 下載
                        </button>
                        <button class="task-btn task-btn-delete" data-filename="${file.name}" title="刪除檔案">
                            <i class="fa-solid fa-trash"></i> 刪除
                        </button>
                    </td>
                `;

                // 綁定下載事件
                tr.querySelector('.btn-file-download').addEventListener('click', () => downloadFile(file.name));
                // 綁定刪除事件
                tr.querySelector('.task-btn-delete').addEventListener('click', () => deleteFile(file.name));

                filesListBody.appendChild(tr);
            });
        } catch (error) {
            filesListBody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; color: var(--priority-high); padding: 3rem;">
                        <i class="fa-solid fa-triangle-exclamation"></i> 讀取失敗: ${error.message}
                    </td>
                </tr>
            `;
        }
    }

    // 3. 檔案上傳 (使用 AJAX 追蹤進度條)
    function uploadFile(file) {
        if (!file) return;

        if (progressContainer) progressContainer.style.display = 'block';
        if (progressFilename) progressFilename.textContent = file.name;
        if (progressBar) progressBar.style.width = '0%';
        if (progressPercent) progressPercent.textContent = '0%';

        const formData = new FormData();
        formData.append('file', file);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/files', true);

        // 追蹤進度事件
        xhr.upload.onprogress = function(e) {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                if (progressBar) progressBar.style.width = `${percent}%`;
                if (progressPercent) progressPercent.textContent = `${percent}%`;
            }
        };

        xhr.onload = function() {
            if (xhr.status === 201) {
                setTimeout(() => {
                    if (progressContainer) progressContainer.style.display = 'none';
                    fetchFilesList();
                }, 800);
            } else {
                let errMsg = '上傳失敗';
                try {
                    const res = JSON.parse(xhr.responseText);
                    errMsg = res.error || errMsg;
                } catch(e) {}
                alert(`❌ 檔案上傳失敗: ${errMsg}`);
                if (progressContainer) progressContainer.style.display = 'none';
            }
        };

        xhr.onerror = function() {
            alert('❌ 檔案上傳發生網路錯誤！');
            if (progressContainer) progressContainer.style.display = 'none';
        };

        xhr.send(formData);
    }

    // 4. 下載檔案 (安全 URL 機制)
    async function downloadFile(filename) {
        try {
            const response = await fetch(`/api/files/download/${encodeURIComponent(filename)}`);
            if (!response.ok) throw new Error('取得下載連結失敗');
            const data = await response.json();

            // 若為真實 S3 安全模式，將會收到 S3 Presigned URL，否則為本地 API 串流下載路由
            // 使用新視窗或隱藏 a 標籤直接觸發瀏覽器下載
            const downloadWindow = window.open(data.url, '_blank');
            if (!downloadWindow) {
                // 如果彈出視窗被阻擋，則用隱藏鏈接點擊
                const link = document.createElement('a');
                link.href = data.url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (error) {
            alert(`❌ 取得檔案失敗: ${error.message}`);
        }
    }

    // 5. 刪除檔案
    async function deleteFile(filename) {
        if (!confirm(`確定要將檔案「${filename}」自 S3 儲存桶中刪除嗎？`)) return;

        try {
            const response = await fetch(`/api/files/${encodeURIComponent(filename)}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('刪除檔案失敗');
            
            fetchFilesList();
        } catch (error) {
            alert(`❌ 刪除失敗: ${error.message}`);
        }
    }

    // 6. 拖曳檔案控制 (Drag and Drop)
    if (dropzone) {
        // 點擊 dropzone 開啟檔案選擇視窗
        dropzone.addEventListener('click', (e) => {
            // 防止與 browse-link 點擊事件衝突
            if (e.target !== fileInput) {
                fileInput.click();
            }
        });

        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                uploadFile(fileInput.files[0]);
            }
        });

        // 拖曳進入
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });

        // 拖曳離開
        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });

        // 釋放檔案
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            
            if (e.dataTransfer.files.length > 0) {
                uploadFile(e.dataTransfer.files[0]);
            }
        });
    }

    // 7. 重新整理按鈕
    if (btnRefresh) {
        btnRefresh.addEventListener('click', fetchFilesList);
    }

    // 啟動載入
    checkS3Status();
    fetchFilesList();
}

/* ==========================================================================
   Feature 4: CPU 暴增練習 (CPU Stress Console) 模組
   ========================================================================== */
function initFeature4Stress() {
    // DOM 元素繫結
    const cpuStatusBadge = document.getElementById('cpu-status-badge');
    const stressDial = document.getElementById('stress-dial');
    const dialIcon = document.getElementById('dial-icon');
    const dialPercentage = document.getElementById('dial-percentage');
    const dialStatusText = document.getElementById('dial-status-text');
    
    const coresSlider = document.getElementById('cores-slider');
    const coresValue = document.getElementById('cores-value');
    const maxCoresLabel = document.getElementById('max-cores-label');
    
    const durationValue = document.getElementById('duration-value');
    const durationInput = document.getElementById('duration-input');
    const presetBtns = document.querySelectorAll('.preset-btn');
    
    const btnStart = document.getElementById('btn-start-stress');
    const btnStop = document.getElementById('btn-stop-stress');
    
    const statusTextIndicator = document.getElementById('status-text-indicator');
    const timeElapsedIndicator = document.getElementById('time-elapsed-indicator');
    const timeRemainingIndicator = document.getElementById('time-remaining-indicator');
    
    const secTotalCores = document.getElementById('sec-total-cores');
    
    let checkInterval = null;
    let totalCores = 1;
    let isStressing = false;

    // 格式化時間 (秒 ➜ MM:SS)
    function formatTime(seconds) {
        const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
        const secs = String(seconds % 60).padStart(2, '0');
        return `${mins}:${secs}`;
    }

    // 取得並渲染狀態
    async function checkStatus() {
        try {
            const response = await fetch('/api/cpu/status');
            if (!response.ok) throw new Error('無法取得狀態');
            const data = await response.json();
            
            totalCores = data.total_cores;
            isStressing = data.active;
            
            // 初始化滑桿上限與右側核心資訊
            if (coresSlider) {
                coresSlider.max = totalCores;
                if (maxCoresLabel) maxCoresLabel.textContent = `1 ~ ${totalCores} 核`;
            }
            if (secTotalCores) {
                secTotalCores.textContent = `${totalCores} Cores`;
            }
            
            if (isStressing) {
                // 1. 正在燒機中狀態
                if (stressDial) stressDial.classList.add('active');
                
                // 動態起伏 CPU 指標數字 (模擬 92.5% ~ 99.8% 劇烈起伏)
                const mockCpuVal = (92.0 + Math.random() * 7.8).toFixed(1);
                if (dialPercentage) dialPercentage.textContent = `${mockCpuVal}%`;
                if (dialStatusText) dialStatusText.textContent = 'STRESS ACTIVE';
                
                // 更新狀態指示器
                if (statusTextIndicator) statusTextIndicator.innerHTML = `🔥 正在燒機中 (${data.cores_stressed}核)`;
                if (timeElapsedIndicator) timeElapsedIndicator.textContent = formatTime(data.elapsed_time);
                if (timeRemainingIndicator) timeRemainingIndicator.textContent = formatTime(data.remaining_time);
                
                if (cpuStatusBadge) {
                    cpuStatusBadge.className = 'portal-time-badge morning-badge';
                    cpuStatusBadge.innerHTML = `<i class="fa-solid fa-fire animate-pulse"></i> 正在燒機 (${data.cores_stressed}核)`;
                }
                
                // 禁用設定控制項，啟用停止按鈕
                if (btnStart) btnStart.disabled = true;
                if (btnStop) btnStop.disabled = false;
                if (coresSlider) coresSlider.disabled = true;
                presetBtns.forEach(btn => btn.style.pointerEvents = 'none');
            } else {
                // 2. 閒置狀態
                if (stressDial) stressDial.classList.remove('active');
                
                // 模擬 1.5% ~ 4.2% 的日常背景極低 CPU 波動
                const mockCpuVal = (1.2 + Math.random() * 3.0).toFixed(1);
                if (dialPercentage) dialPercentage.textContent = `${mockCpuVal}%`;
                if (dialStatusText) dialStatusText.textContent = 'SYSTEM IDLE';
                
                // 更新狀態指示器
                if (statusTextIndicator) statusTextIndicator.textContent = '⚪ 閒置中';
                if (timeElapsedIndicator) timeElapsedIndicator.textContent = '00:00';
                if (timeRemainingIndicator) timeRemainingIndicator.textContent = '00:00';
                
                if (cpuStatusBadge) {
                    cpuStatusBadge.className = 'portal-time-badge cloud-badge';
                    cpuStatusBadge.innerHTML = '<i class="fa-solid fa-shield-halved"></i> 系統閒置中';
                }
                
                // 啟用設定控制項，挑戰停止按鈕
                if (btnStart) btnStart.disabled = false;
                if (btnStop) btnStop.disabled = true;
                if (coresSlider) coresSlider.disabled = false;
                presetBtns.forEach(btn => btn.style.pointerEvents = 'auto');
            }
        } catch (error) {
            console.error('CPU 狀態查詢錯誤:', error);
            if (cpuStatusBadge) {
                cpuStatusBadge.className = 'portal-time-badge afternoon-badge';
                cpuStatusBadge.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> 連線異常';
            }
        }
    }

    // 啟動燒機
    async function startStress() {
        const cores = parseInt(coresSlider ? coresSlider.value : 1);
        const duration = parseInt(durationInput ? durationInput.value : 30);
        
        if (btnStart) btnStart.disabled = true;
        
        try {
            const response = await fetch('/api/cpu/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cores, duration })
            });
            
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || '啟動失敗');
            }
            
            // 立即查詢狀態更新 UI
            await checkStatus();
        } catch (error) {
            alert(`❌ 啟動燒機失敗: ${error.message}`);
            if (btnStart) btnStart.disabled = false;
        }
    }

    // 停止燒機
    async function stopStress() {
        if (btnStop) btnStop.disabled = true;
        
        try {
            const response = await fetch('/api/cpu/stop', {
                method: 'POST'
            });
            
            if (!response.ok) throw new Error('停止失敗');
            
            // 立即查詢狀態更新 UI
            await checkStatus();
        } catch (error) {
            alert(`❌ 終止燒機失敗: ${error.message}`);
            if (btnStop) btnStop.disabled = false;
        }
    }

    // 滑桿移動事件
    if (coresSlider) {
        coresSlider.addEventListener('input', () => {
            if (coresValue) coresValue.textContent = `${coresSlider.value} Cores`;
        });
    }

    // 時間 Preset 按鈕事件
    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            presetBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const seconds = btn.getAttribute('data-seconds');
            if (durationInput) durationInput.value = seconds;
            
            let valText = `${seconds} 秒`;
            if (seconds >= 60) {
                valText = `${seconds / 60} 分鐘`;
            }
            if (durationValue) durationValue.textContent = valText;
        });
    });

    // 啟動與停止按鈕事件繫結
    if (btnStart) btnStart.addEventListener('click', startStress);
    if (btnStop) btnStop.addEventListener('click', stopStress);

    // 啟動輪詢與初始化
    checkStatus();
    checkInterval = setInterval(checkStatus, 1000);
    
    // 確保頁面離開時清理 Interval
    window.addEventListener('beforeunload', () => {
        if (checkInterval) clearInterval(checkInterval);
    });
}
