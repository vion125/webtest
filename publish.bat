@echo off
:: 設定字元集為 UTF-8 確保繁體中文能正常顯示
chcp 65001 > nul
setlocal enabledelayedexpansion

echo ====================================================
echo 🚀 啟動 AWS Flask 課程專案一鍵自動發佈與封裝工具 🚀
echo ====================================================
echo.

:: 1. 執行單元測試驗證
echo 🔍 [步驟 1/5] 正在執行 PyTest 單元測試，確保功能完整無誤...
python -m pytest test/test_app.py
if %ERRORLEVEL% neq 0 (
    echo.
    echo ❌ [錯誤] 單元測試未通過！請修正錯誤後再重新執行發佈。
    pause
    exit /b 1
)
echo.
echo  [成功] 單元測試全部通過！
echo.

:: 2. Git 自動 Commit 與 Push
echo 🔍 [步驟 2/5] 正在處理 Git 版本控制與 GitHub 上傳...
git status -s
echo.
set /p commit_msg="請輸入本次 Commit 的提交描述資訊 (預設為 'feat: 新增 feature4 CPU 壓力測試燒機功能並優化發佈封裝'): "
if "!commit_msg!"=="" (
    set commit_msg=feat: 新增 feature4 CPU 壓力測試燒機功能並優化發佈封裝
)

echo.
echo ➔ 正在新增變更檔案 (git add .) ...
git add .

echo ➔ 正在提交版本 (git commit) ...
git commit -m "!commit_msg!"

echo ➔ 正在推送至 GitHub 遠端儲存庫 (git push) ...
git push
if %ERRORLEVEL% neq 0 (
    echo.
    echo ⚠️ [警告] 推送至 GitHub 失敗。可能需要確認網路狀態或權限設定。
    echo 程式將繼續進行 Docker Hub 建置，但請稍後手動確認 Git 狀態。
) else (
    echo  [成功] GitHub 代碼上傳成功！
)
echo.

:: 3. Docker 登入驗證
echo 🔍 [步驟 3/5] 正在檢測 Docker 服務狀態...
docker info >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ [錯誤] Docker 服務未啟動！請啟動 Docker Desktop 後再試。
    pause
    exit /b 1
)

:: 讓用戶確認或輸入 Docker Hub 帳號，預設帶入 vion125
set default_username=vion125
set /p docker_username="請輸入您的 Docker Hub 帳號 (預設為 '%default_username%'): "
if "!docker_username!"=="" (
    set docker_username=%default_username%
)

:: 測試是否已登入，若未登入則引導登入
docker system info 2>nul | findstr /I "Username" >nul
if %ERRORLEVEL% neq 0 (
    echo ➔ 偵測到您尚未登入 Docker Hub，請先進行登入：
    docker login
    if !ERRORLEVEL! neq 0 (
        echo ❌ [錯誤] Docker 登入失敗！
        pause
        exit /b 1
    )
) else (
    echo  [已登入] 檢測到已登入 Docker Hub 帳戶。
)
echo.

:: 4. Docker 映像檔建置
echo 🔍 [步驟 4/5] 正在準備 Docker 映像檔建置...
set /p image_tag="請輸入 Docker Tag 版本 (預設為 'latest'): "
if "!image_tag!"=="" (
    set image_tag=latest
)

set full_image_name=!docker_username!/webtest:!image_tag!
echo.
echo ➔ 即將建置 Docker 映像檔: !full_image_name!
echo.
docker build -t !full_image_name! .
if %ERRORLEVEL% neq 0 (
    echo.
    echo ❌ [錯誤] Docker 映像檔建置失敗！請確認 Dockerfile 是否正確。
    pause
    exit /b 1
)
echo.
echo  [成功] Docker 映像檔建置成功！
echo.

:: 5. 推送至 Docker Hub
echo 🔍 [步驟 5/5] 正在推送映像檔至 Docker Hub...
docker push !full_image_name!
if %ERRORLEVEL% neq 0 (
    echo.
    echo ❌ [錯誤] 推送 Docker Hub 失敗！請檢查倉庫命名或網路。
    pause
    exit /b 1
)
echo.
echo ====================================================
echo  🔥 專案自動化封裝與發佈完成！恭喜！ 🔥
echo ====================================================
echo 1. GitHub 代碼最新變更已同步更新。
echo 2. Docker Hub 最新映像檔已推送成功：
echo    👉 !full_image_name!
echo ====================================================
echo.
pause
