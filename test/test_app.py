import sys
import os
import pytest

# 將 src 資料夾加入 Python 的搜尋路徑，以便進行單元測試
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../src')))

from app import app as flask_app

@pytest.fixture
def client():
    """建立一個測試用的 Flask Client 實例"""
    flask_app.config['TESTING'] = True
    with flask_app.test_client() as client:
        yield client

def test_home_page(client):
    """驗證首頁路由 (/) 是否回傳 HTTP 200 且正常載入首頁標題"""
    response = client.get('/')
    assert response.status_code == 200
    html = response.get_data(as_text=True)
    # 驗證首頁基本文字
    assert 'AWS Flask Web' in html
    assert '早上看股' in html
    assert '下午上班的公司' in html

def test_feature1_page(client):
    """驗證 Feature 1 (早上看股) 路由是否正常載入"""
    response = client.get('/feature1')
    assert response.status_code == 200
    html = response.get_data(as_text=True)
    # 驗證晨間股市看盤基本元件
    assert '早上看股模擬大盤' in html
    assert '我的觀察清單' in html

def test_feature2_page(client):
    """驗證 Feature 2 (下午上班的公司) 路由是否正常載入"""
    response = client.get('/feature2')
    assert response.status_code == 200
    html = response.get_data(as_text=True)
    # 驗證下午任務看板基本元件
    assert '下午上班任務看板' in html
    assert '工作工時追蹤' in html

def test_get_stocks_api(client):
    """驗證股市行情 API (/api/stocks) 是否能正常回傳預期格式的 JSON 數據"""
    response = client.get('/api/stocks')
    assert response.status_code == 200
    data = response.get_json()
    
    # 驗證包含基本台股代號與格式
    assert '2330' in data
    assert '2454' in data
    assert data['2330']['name'] == '台積電 (TSMC)'
    assert 'price' in data['2330']
    assert 'history' in data['2330']
    assert len(data['2330']['history']) == 6

def test_manage_tasks_api(client):
    """驗證下午任務看板 API (/api/tasks) 的取得與新增功能"""
    # 1. 測試 GET 取得初始任務清單
    response = client.get('/api/tasks')
    assert response.status_code == 200
    tasks = response.get_json()
    assert len(tasks) >= 3
    assert tasks[0]['title'] == '準備 AWS 雲端部署報告'

    # 2. 測試 POST 新增一筆任務
    new_task = {
        'title': '單元測試新增任務',
        'desc': '這是一筆由 pytest 自動化測試寫入的任務。',
        'priority': 'high'
    }
    post_res = client.post('/api/tasks', json=new_task)
    assert post_res.status_code == 201
    
    posted_data = post_res.get_json()
    assert posted_data['title'] == '單元測試新增任務'
    assert posted_data['priority'] == 'high'
    assert 'id' in posted_data

def test_modify_and_delete_task_api(client):
    """驗證任務的狀態修改 (PUT) 與刪除 (DELETE) 流程"""
    # 1. 測試 PUT 修改狀態
    update_data = {'status': 'done'}
    put_res = client.put('/api/tasks/1', json=update_data)
    assert put_res.status_code == 200
    updated_task = put_res.get_json()
    assert updated_task['status'] == 'done'

    # 2. 測試 DELETE 刪除任務
    del_res = client.delete('/api/tasks/1')
    assert del_res.status_code == 200
    assert del_res.get_json()['success'] is True

    # 3. 刪除後再次查詢，應該回傳 404
    get_del_res = client.put('/api/tasks/1', json=update_data)
    assert get_del_res.status_code == 404

def test_feature3_page(client):
    """驗證 Feature 3 (S3 檔案雲) 路由是否正常載入"""
    response = client.get('/feature3')
    assert response.status_code == 200
    html = response.get_data(as_text=True)
    assert 'S3 安全儲存中心' in html
    assert 'ckc101_28_2' in html

def test_s3_status_api(client):
    """驗證 S3 連線與運作狀態 API"""
    response = client.get('/api/files/status')
    assert response.status_code == 200
    data = response.get_json()
    assert 's3_active' in data
    assert 's3_status' in data
    assert data['bucket'] == 'ckc101_28_2'

def test_files_upload_list_delete_api(client):
    """驗證檔案上傳、取得清單、下載與刪除 API 的完整操作流程"""
    import io
    
    # 建立一個測試用的虛擬檔案
    test_filename = 'test_pytest_file.txt'
    test_content = b'pytest mock content'
    
    # 1. 測試 POST 上傳檔案
    post_res = client.post(
        '/api/files',
        data={'file': (io.BytesIO(test_content), test_filename)},
        content_type='multipart/form-data'
    )
    assert post_res.status_code == 201
    assert post_res.get_json()['success'] is True
    assert post_res.get_json()['filename'] == test_filename

    # 2. 測試 GET 取得檔案清單
    list_res = client.get('/api/files')
    assert list_res.status_code == 200
    files = list_res.get_json()
    assert len(files) > 0
    # 確保上傳的檔案包含在清單中
    assert any(f['name'] == test_filename for f in files)

    # 3. 測試 GET 獲取安全下載連結
    download_res = client.get(f'/api/files/download/{test_filename}')
    assert download_res.status_code == 200
    assert 'url' in download_res.get_json()

    # 4. 測試 DELETE 刪除檔案
    del_res = client.delete(f'/api/files/{test_filename}')
    assert del_res.status_code == 200
    assert del_res.get_json()['success'] is True


def test_feature4_page(client):
    """驗證 Feature 4 (CPU 暴增練習) 路由是否正常載入"""
    response = client.get('/feature4')
    assert response.status_code == 200
    html = response.get_data(as_text=True)
    assert 'CPU 壓力燒機控制台' in html
    assert 'AWS CPU 監控指南' in html


def test_cpu_status_api(client):
    """驗證 CPU 狀態 API 行為"""
    response = client.get('/api/cpu/status')
    assert response.status_code == 200
    data = response.get_json()
    assert 'active' in data
    assert 'total_cores' in data
    assert data['active'] is False


def test_cpu_stress_start_and_stop_api(client):
    """驗證啟動與停止 CPU 壓力 API 的整合流程"""
    # 1. 啟動壓力測試 (1核心，30秒)
    start_res = client.post('/api/cpu/start', json={'cores': 1, 'duration': 30})
    assert start_res.status_code == 200
    start_data = start_res.get_json()
    assert start_data['success'] is True
    assert start_data['cores_stressed'] == 1
    assert start_data['duration'] == 30

    # 2. 驗證當前狀態為 active
    status_res = client.get('/api/cpu/status')
    assert status_res.status_code == 200
    status_data = status_res.get_json()
    assert status_data['active'] is True
    assert status_data['cores_stressed'] == 1

    # 3. 停止壓力測試
    stop_res = client.post('/api/cpu/stop')
    assert stop_res.status_code == 200
    assert stop_res.get_json()['success'] is True

    # 4. 再次驗證狀態為 inactive
    status_res2 = client.get('/api/cpu/status')
    assert status_res2.get_json()['active'] is False

