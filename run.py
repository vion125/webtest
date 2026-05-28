import sys
import os

# 將 src 資料夾加入 Python 的搜尋路徑中，確保能順利 import app
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'src')))

from app import app

if __name__ == '__main__':
    print("====================================================")
    print("🚀 正在啟動 Flask 課程練習網頁應用程式...")
    print("📌 指定連接埠 (Port): 19191")
    print("🔗 本機存取網址: http://127.0.0.1:19191")
    print("====================================================")
    # 啟動 Flask 伺服器，允許外部連接 (0.0.0.0)，並開啟 debug 模式
    app.run(host='0.0.0.0', port=19191, debug=True)
