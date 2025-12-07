#!/bin/bash

# 自動化部署腳本
# 使用方式: ./deploy.sh [commit message]

set -e  # 遇到錯誤立即停止

# 顏色定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 開始自動化部署流程...${NC}\n"

# 檢查是否有未提交的變更
if [ -z "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  沒有需要提交的變更${NC}"
    exit 0
fi

# 取得 commit message
COMMIT_MSG="${1:-自動部署: $(date '+%Y-%m-%d %H:%M:%S')}"

echo -e "${BLUE}📝 提交訊息: ${COMMIT_MSG}${NC}\n"

# 顯示變更的檔案
echo -e "${BLUE}📋 變更的檔案:${NC}"
git status --short
echo ""

# 加入所有變更
echo -e "${BLUE}➕ 加入所有變更...${NC}"
git add -A

# 提交變更
echo -e "${BLUE}💾 提交變更...${NC}"
git commit -m "$COMMIT_MSG"

# 推送到 GitHub
echo -e "${BLUE}📤 推送到 GitHub...${NC}"
git push origin main

echo -e "\n${GREEN}✅ 部署完成！${NC}"
echo -e "${GREEN}📦 變更已推送到 GitHub${NC}"
echo -e "${GREEN}🔄 Vercel 將自動觸發部署（如果已連接）${NC}\n"

# 檢查是否有 Vercel CLI
if command -v vercel &> /dev/null; then
    echo -e "${BLUE}🔍 檢測到 Vercel CLI，是否要立即部署？ (y/n)${NC}"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        echo -e "${BLUE}🚀 開始 Vercel 部署...${NC}"
        vercel --prod
    fi
else
    echo -e "${YELLOW}💡 提示: 安裝 Vercel CLI 可立即部署 (npm i -g vercel)${NC}"
fi

