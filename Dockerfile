# 使用官方輕量級的 Python 3.10-slim 映像檔作為基礎
FROM python:3.10-slim

# 設定容器內部工作目錄
WORKDIR /app

# 複製依賴套件清單並進行安裝
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 複製 Flask 啟動腳本與 src 核心程式碼
COPY run.py .
COPY src/ ./src/

# 建立本機安全模擬資料夾 (確保 fallback 運作時在容器內能正常寫入檔案)
RUN mkdir -p uploads_sandbox

# 暴露課程指定的服務連接埠 (Port): 19191
EXPOSE 19191

# 設置 Python 最佳化環境變數，防止寫入 .pyc 且能即時輸出日誌
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 容器啟動指令
CMD ["python", "run.py"]
