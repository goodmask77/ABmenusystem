#!/bin/bash

# 自動化部署腳本 - 每次完成任務後自動執行
# 使用方式: ./auto-deploy.sh [commit message]

set -e  # 遇到錯誤立即停止

# 顏色定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 開始自動化部署流程...${NC}\n"

# 進入專案目錄
cd "$(dirname "$0")"

# GitHub Token (從環境變數或 git config 讀取)
if [ -z "$GITHUB_TOKEN" ]; then
    GITHUB_TOKEN=$(git config --get github.token 2>/dev/null || echo "")
fi

if [ -z "$GITHUB_TOKEN" ]; then
    echo -e "${RED}❌ 錯誤: 未設定 GITHUB_TOKEN${NC}"
    echo -e "${YELLOW}💡 請設定環境變數: export GITHUB_TOKEN=your_token${NC}"
    echo -e "${YELLOW}   或使用 git config: git config --global github.token your_token${NC}"
    exit 1
fi

REPO_URL="https://${GITHUB_TOKEN}@github.com/goodmask77/ABmenusystem.git"

# 1. 同步 public/ 目錄（如果需要）
if [ -d "public" ]; then
    echo -e "${BLUE}📋 同步 public/ 目錄...${NC}"
    # 確保 public/script.js 和 script.js 同步
    if [ -f "script.js" ] && [ -f "public/script.js" ]; then
        cp script.js public/script.js
        echo -e "${GREEN}✅ 已同步 script.js${NC}"
    fi
    if [ -f "styles.css" ] && [ -f "public/styles.css" ]; then
        cp styles.css public/styles.css
        echo -e "${GREEN}✅ 已同步 styles.css${NC}"
    fi
    if [ -f "index.html" ] && [ -f "public/index.html" ]; then
        cp index.html public/index.html
        echo -e "${GREEN}✅ 已同步 index.html${NC}"
    fi
fi

# 2. 檢查是否有未提交的變更
if [ -z "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  沒有需要提交的變更${NC}"
    # 即使沒有變更，也嘗試推送（可能本地有未推送的 commit）
    echo -e "${BLUE}📤 檢查是否有未推送的 commit...${NC}"
    git push "${REPO_URL}" main || echo -e "${YELLOW}⚠️  推送失敗或已是最新${NC}"
    exit 0
fi

# 3. 取得 commit message
COMMIT_MSG="${1:-自動部署: $(date '+%Y-%m-%d %H:%M:%S')}"

echo -e "${BLUE}📝 提交訊息: ${COMMIT_MSG}${NC}\n"

# 4. 顯示變更的檔案
echo -e "${BLUE}📋 變更的檔案:${NC}"
git status --short
echo ""

# 5. 加入所有變更
echo -e "${BLUE}➕ 加入所有變更...${NC}"
git add -A

# 6. 提交變更
echo -e "${BLUE}💾 提交變更...${NC}"
git commit -m "$COMMIT_MSG" || {
    echo -e "${YELLOW}⚠️  提交失敗（可能沒有變更）${NC}"
    exit 0
}

# 7. 推送到 GitHub
echo -e "${BLUE}📤 推送到 GitHub...${NC}"
if git push "${REPO_URL}" main; then
    echo -e "${GREEN}✅ 成功推送到 GitHub${NC}"
else
    echo -e "${RED}❌ Push 失敗${NC}"
    exit 1
fi

echo -e "\n${GREEN}✅ 部署完成！${NC}"
echo -e "${GREEN}📦 變更已推送到 GitHub${NC}"
echo -e "${GREEN}🔄 Vercel 將自動觸發部署（約 1-2 分鐘）${NC}\n"

# 8. 顯示最終狀態
echo -e "${BLUE}📊 Git 狀態:${NC}"
git status

echo -e "\n${GREEN}✨ 所有變更已成功部署！${NC}"

