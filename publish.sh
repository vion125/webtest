#!/bin/bash

# 設定輸出為 UTF-8
export LANG=en_US.UTF-8

echo "===================================================="
echo "🚀 啟動 AWS Flask 課程專案一鍵自動發佈與封裝工具 🚀"
echo "===================================================="
echo ""

# 1. 執行單元測試驗證
echo "🔍 [步驟 1/5] 正在執行 PyTest 單元測試，確保功能完整無誤..."
python -m pytest test/test_app.py
if [ $? -ne 0 ]; then
    echo ""
    echo "❌ [錯誤] 單元測試未通過！請修正錯誤後再重新執行發佈。"
    exit 1
fi
echo ""
echo "✨ [成功] 單元測試全部通過！"
echo ""

# 2. Git 自動 Commit 與 Push
echo "🔍 [步驟 2/5] 正在處理 Git 版本控制與 GitHub 上傳..."
git status -s
echo ""
read -p "請輸入本次 Commit 的提交描述資訊 (預設為 'feat: 新增 feature4 CPU 壓力測試燒機功能並優化發佈封裝'): " commit_msg
if [ -z "$commit_msg" ]; then
    commit_msg="feat: 新增 feature4 CPU 壓力測試燒機功能並優化發佈封裝"
fi

echo ""
echo "➔ 正在新增變更檔案 (git add .) ..."
git add .

echo "➔ 正在提交版本 (git commit) ..."
git commit -m "$commit_msg"

echo "➔ 正在推送至 GitHub 遠端儲存庫 (git push) ..."
git push
if [ $? -ne 0 ]; then
    echo ""
    echo "⚠️ [警告] 推送至 GitHub 失敗。可能需要確認網路狀態或權限設定。"
    echo "程式將繼續進行 Docker Hub 建置，但請稍後手動確認 Git 狀態。"
else
    echo "✨ [成功] GitHub 代碼上傳成功！"
fi
echo ""

# 3. Docker 登入驗證
echo "🔍 [步驟 3/5] 正在檢測 Docker 服務狀態..."
if ! docker info >/dev/null 2>&1; then
    echo "❌ [錯誤] Docker 服務未啟動！請啟動 Docker 服務後再試。"
    exit 1
fi

default_username="vion125"
read -p "請輸入您的 Docker Hub 帳號 (預設為 '$default_username'): " docker_username
if [ -z "$docker_username" ]; then
    docker_username="$default_username"
fi

# 檢測是否已登入
if ! docker system info 2>/dev/null | grep -q "Username"; then
    echo "➔ 偵測到您尚未登入 Docker Hub，請先進行登入："
    docker login
    if [ $? -ne 0 ]; then
        echo "❌ [錯誤] Docker 登入失敗！"
        exit 1
    fi
else
    echo "✨ [已登入] 檢測到已登入 Docker Hub 帳戶。"
fi
echo ""

# 4. Docker 映像檔建置
read -p "請輸入 Docker Tag 版本 (預設為 'latest'): " image_tag
if [ -z "$image_tag" ]; then
    image_tag="latest"
fi

full_image_name="${docker_username}/webtest:${image_tag}"
echo ""
echo "➔ 即將建置 Docker 映像檔: ${full_image_name}"
echo ""
docker build -t "$full_image_name" .
if [ $? -ne 0 ]; then
    echo ""
    echo "❌ [錯誤] Docker 映像檔建置失敗！請確認 Dockerfile 是否正確。"
    exit 1
fi
echo ""
echo "✨ [成功] Docker 映像檔建置成功！"
echo ""

# 5. 推送至 Docker Hub
echo "🔍 [步驟 5/5] 正在推送映像檔至 Docker Hub..."
docker push "$full_image_name"
if [ $? -ne 0 ]; then
    echo ""
    echo "❌ [錯誤] 推送 Docker Hub 失敗！請檢查倉庫命名或網路。"
    exit 1
fi
echo ""
echo "===================================================="
echo " 🎉 專案自動化封裝與發佈完成！恭喜！ 🎉"
echo "===================================================="
echo "1. GitHub 代碼最新變更已同步更新。"
echo "2. Docker Hub 最新映像檔已推送成功："
echo "   👉 ${full_image_name}"
echo "===================================================="
echo ""
