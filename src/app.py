from flask import Flask, render_template, jsonify, request
import random

app = Flask(__name__)

# 模擬股票數據 (Feature 1 早上看股)
STOCKS_DATA = {
    '2330': {
        'name': '台積電 (TSMC)', 
        'price': 850.0, 
        'change': 15.0, 
        'percent': 1.8, 
        'high': 855.0, 
        'low': 840.0, 
        'history': [830, 835, 842, 838, 845, 850],
        'industry': '半導體'
    },
    '2454': {
        'name': '聯發科 (MediaTek)', 
        'price': 1200.0, 
        'change': -20.0, 
        'percent': -1.64, 
        'high': 1225.0, 
        'low': 1195.0, 
        'history': [1210, 1230, 1215, 1205, 1220, 1200],
        'industry': 'IC 設計'
    },
    '2317': {
        'name': '鴻海 (Foxconn)', 
        'price': 175.0, 
        'change': 4.5, 
        'percent': 2.64, 
        'high': 176.0, 
        'low': 170.5, 
        'history': [168, 169, 171, 170, 172, 175],
        'industry': '電子代工'
    },
    '2382': {
        'name': '廣達 (Quanta Computer)', 
        'price': 280.0, 
        'change': 8.0, 
        'percent': 2.94, 
        'high': 282.5, 
        'low': 271.0, 
        'history': [265, 270, 272, 269, 274, 280],
        'industry': 'AI 伺服器/代工'
    },
    '2603': {
        'name': '長榮 (Evergreen Marine)', 
        'price': 210.0, 
        'change': -3.0, 
        'percent': -1.41, 
        'high': 215.0, 
        'low': 208.5, 
        'history': [214, 216, 212, 215, 213, 210],
        'industry': '航運業'
    },
}

# 模擬看板任務 (Feature 2 下午上班的公司)
TASKS_DATA = [
    {
        'id': 1, 
        'title': '準備 AWS 雲端部署報告', 
        'desc': '整理並準備下午向主管匯報的 AWS 部署簡報與系統架構圖。', 
        'status': 'todo', 
        'priority': 'high'
    },
    {
        'id': 2, 
        'title': 'Flask 路由與專案重構', 
        'desc': '將原始程式碼移動至 src/，並將單元測試分離至 test/ 目錄。', 
        'status': 'doing', 
        'priority': 'medium'
    },
    {
        'id': 3, 
        'title': '撰寫單元測試用例', 
        'desc': '使用 pytest 針對 Flask 路由、HTTP 回應代碼與 API 資料結構進行單元測試。', 
        'status': 'done', 
        'priority': 'low'
    },
]
task_id_counter = 4

@app.route('/')
def index():
    """首頁儀表板，引導用戶進入兩大主要功能頁面"""
    return render_template('base.html')

@app.route('/feature1')
def feature1():
    """早上看股功能頁面"""
    return render_template('feature1.html')

@app.route('/feature2')
def feature2():
    """下午上班的公司功能頁面"""
    return render_template('feature2.html')

# --- API 介面提供前端互動使用 ---

@app.route('/api/stocks', methods=['GET'])
def get_stocks():
    """取得最新模擬股市資訊"""
    # 每次請求時微幅波動一下價格，創造「即時看股」的動態感
    updated_stocks = {}
    for code, data in STOCKS_DATA.items():
        # 隨機波動 -1.5% ~ +1.5%
        fluctuation_percent = random.uniform(-0.015, 0.015)
        new_price = round(data['price'] * (1 + fluctuation_percent), 1)
        new_change = round(new_price - (data['price'] - data['change']), 1)
        new_percent = round((new_change / (data['price'] - data['change'])) * 100, 2)
        
        # 更新歷史記錄
        history = list(data['history'])
        history.pop(0)
        history.append(new_price)
        
        updated_stocks[code] = {
            'name': data['name'],
            'price': new_price,
            'change': new_change,
            'percent': new_percent,
            'high': max(data['high'], new_price),
            'low': min(data['low'], new_price),
            'history': history,
            'industry': data['industry']
        }
    return jsonify(updated_stocks)

@app.route('/api/tasks', methods=['GET', 'POST'])
def manage_tasks():
    """取得或新增下午上班的任務"""
    global task_id_counter
    if request.method == 'POST':
        data = request.json
        if not data or 'title' not in data:
            return jsonify({'error': '缺少任務標題'}), 400
        
        new_task = {
            'id': task_id_counter,
            'title': data['title'],
            'desc': data.get('desc', ''),
            'status': data.get('status', 'todo'),
            'priority': data.get('priority', 'medium')
        }
        TASKS_DATA.append(new_task)
        task_id_counter += 1
        return jsonify(new_task), 201

    return jsonify(TASKS_DATA)

@app.route('/api/tasks/<int:task_id>', methods=['PUT', 'DELETE'])
def modify_task(task_id):
    """更新或刪除指定任務"""
    global TASKS_DATA
    task = next((t for t in TASKS_DATA if t['id'] == task_id), None)
    
    if not task:
        return jsonify({'error': '找不到該項任務'}), 404
        
    if request.method == 'DELETE':
        TASKS_DATA = [t for t in TASKS_DATA if t['id'] != task_id]
        return jsonify({'success': True, 'message': '任務已刪除'})
        
    if request.method == 'PUT':
        data = request.json
        if 'status' in data:
            task['status'] = data['status']
        if 'title' in data:
            task['title'] = data['title']
        if 'desc' in data:
            task['desc'] = data['desc']
        if 'priority' in data:
            task['priority'] = data['priority']
        return jsonify(task)
