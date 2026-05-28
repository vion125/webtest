from flask import Flask, render_template, jsonify, request, send_from_directory
import random
import os
import boto3
from botocore.exceptions import NoCredentialsError, ClientError

app = Flask(__name__)

# S3 安全管理配置 (S3 Bucket 指定為 ckc101_28_2)
BUCKET_NAME = 'ckc101_28_2'
LOCAL_UPLOAD_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), '../uploads_sandbox'))

s3_client = None
s3_active = False
s3_status = "LOCAL_SANDBOX"

try:
    # 嘗試偵測是否有 AWS 憑證，這會自動尋找環境憑證、credentials 檔案或 IAM Role/ECS Task Role
    # 無金鑰的安全模式：程式碼與環境變數完全沒有硬編碼任何憑證
    session = boto3.Session()
    credentials = session.get_credentials()
    if credentials is not None:
        temp_client = session.client('s3')
        # 實體測試 bucket 存取權限，確保 bucket 'web_app' 存在且可被該憑證存取
        temp_client.head_bucket(Bucket=BUCKET_NAME)
        s3_client = temp_client
        s3_active = True
        s3_status = "S3_ACTIVE"
        print("🔒 AWS S3 憑證與 Bucket 載入成功！已啟用真實 S3 安全介接模式。")
    else:
        s3_active = False
        s3_status = "LOCAL_SANDBOX"
        print("💡 偵測到無 AWS 憑證，自動啟用安全本機模擬模式 (LOCAL_SANDBOX)。")
except Exception as e:
    s3_active = False
    s3_status = "LOCAL_SANDBOX"
    print(f"💡 S3 初始化或偵測 Bucket 存取異常 ({e})，自動降級啟用安全本機模擬模式。")

if not s3_active:
    if not os.path.exists(LOCAL_UPLOAD_FOLDER):
        os.makedirs(LOCAL_UPLOAD_FOLDER)

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

# ==========================================================================
# Feature 3: S3 安全檔案管理 (PM 13:30 - 18:00 & 雲端存取)
# ==========================================================================

@app.route('/feature3')
def feature3():
    """檔案管理功能頁面"""
    return render_template('feature3.html')

@app.route('/api/files/status', methods=['GET'])
def get_s3_status():
    """取得 S3 安全連線與運作狀態"""
    return jsonify({
        's3_active': s3_active,
        's3_status': s3_status,
        'bucket': BUCKET_NAME
    })

@app.route('/api/files', methods=['GET', 'POST'])
def manage_files():
    """列出檔案或上傳檔案"""
    if request.method == 'POST':
        # 1. 上傳檔案邏輯
        if 'file' not in request.files:
            return jsonify({'error': '沒有上傳檔案'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': '未選擇檔案名稱'}), 400
            
        try:
            if s3_active:
                # 真實 S3 安全模式上傳 (不使用硬編碼金鑰，完全採用 AWS SDK 憑證鏈自動化)
                s3_client.upload_fileobj(
                    file, 
                    BUCKET_NAME, 
                    file.filename,
                    ExtraArgs={'ContentType': file.content_type}
                )
            else:
                # 本機沙盒模擬模式上傳
                file_path = os.path.join(LOCAL_UPLOAD_FOLDER, file.filename)
                file.save(file_path)
                
            return jsonify({'success': True, 'filename': file.filename}), 201
        except Exception as e:
            return jsonify({'error': f'檔案儲存失敗: {str(e)}'}), 500

    # 2. 獲取檔案清單邏輯 (GET)
    files_list = []
    try:
        if s3_active:
            # 讀取真實 S3 儲存桶
            response = s3_client.list_objects_v2(Bucket=BUCKET_NAME)
            if 'Contents' in response:
                for obj in response['Contents']:
                    # 排除 S3 的資料夾目錄標記，只抓實體檔案
                    if obj['Key'].endswith('/'):
                        continue
                    files_list.append({
                        'name': obj['Key'],
                        'size': obj['Size'],
                        'last_modified': obj['LastModified'].strftime('%Y-%m-%d %H:%M:%S')
                    })
        else:
            # 讀取本機沙盒目錄
            if os.path.exists(LOCAL_UPLOAD_FOLDER):
                for filename in os.listdir(LOCAL_UPLOAD_FOLDER):
                    file_path = os.path.join(LOCAL_UPLOAD_FOLDER, filename)
                    if os.path.isfile(file_path):
                        stat_info = os.stat(file_path)
                        import datetime
                        mtime = datetime.datetime.fromtimestamp(stat_info.st_mtime)
                        files_list.append({
                            'name': filename,
                            'size': stat_info.st_size,
                            'last_modified': mtime.strftime('%Y-%m-%d %H:%M:%S')
                        })
                        
        return jsonify(files_list)
    except Exception as e:
        return jsonify({'error': f'讀取檔案清單失敗: {str(e)}'}), 500

@app.route('/api/files/<string:filename>', methods=['DELETE'])
def delete_file(filename):
    """刪除指定的檔案"""
    try:
        if s3_active:
            # 真實 S3 刪除
            s3_client.delete_object(Bucket=BUCKET_NAME, Key=filename)
        else:
            # 本機沙盒刪除
            file_path = os.path.join(LOCAL_UPLOAD_FOLDER, filename)
            if os.path.exists(file_path):
                os.remove(file_path)
            else:
                return jsonify({'error': '檔案不存在'}), 404
                
        return jsonify({'success': True, 'message': f'檔案 {filename} 已成功刪除'})
    except Exception as e:
        return jsonify({'error': f'刪除失敗: {str(e)}'}), 500

@app.route('/api/files/download/<string:filename>', methods=['GET'])
def get_download_link(filename):
    """產生安全下載連結 (S3 預簽名網址或本地 API 下載路由)"""
    try:
        if s3_active:
            # S3 安全模式：產生具時效性 (10分鐘) 的安全預簽名 URL (Presigned URL)
            # 徹底避免對外暴露 S3 私有儲存桶，也不需要在伺服器端耗費頻寬做串流代管
            presigned_url = s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': BUCKET_NAME, 'Key': filename},
                ExpiresIn=600
            )
            return jsonify({
                's3': True,
                'url': presigned_url
            })
        else:
            # 本機模擬模式：回傳本機檔案下載 API 路由
            return jsonify({
                's3': False,
                'url': f'/api/files/local-download/{filename}'
            })
    except Exception as e:
        return jsonify({'error': f'產生下載連結失敗: {str(e)}'}), 500

@app.route('/api/files/local-download/<string:filename>', methods=['GET'])
def local_download_file(filename):
    """本地模擬模式的檔案串流下載"""
    try:
        return send_from_directory(LOCAL_UPLOAD_FOLDER, filename, as_attachment=True)
    except Exception as e:
        return jsonify({'error': f'本機檔案下載失敗: {str(e)}'}), 404

