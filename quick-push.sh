#!/bin/bash

# 快速推送腳本 - 一鍵完成所有步驟
# 使用方式: ./quick-push.sh [commit message]

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 取得 commit message
COMMIT_MSG="${1:-快速更新: $(date '+%Y-%m-%d %H:%M:%S')}"

echo -e "${BLUE}🚀 快速推送流程${NC}\n"

# 檢查變更
if [ -z "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  沒有需要提交的變更${NC}"
    exit 0
fi

# 顯示變更
echo -e "${BLUE}📋 變更的檔案:${NC}"
git status --short
echo ""

# 加入、提交、推送
echo -e "${BLUE}➕ 加入所有變更...${NC}"
git add -A

echo -e "${BLUE}💾 提交變更: ${COMMIT_MSG}${NC}"
git commit -m "$COMMIT_MSG"

echo -e "${BLUE}📤 推送到 GitHub...${NC}"
if git push origin main; then
    echo -e "\n${GREEN}✅ 完成！變更已推送到 GitHub${NC}"
    echo -e "${GREEN}🔄 Vercel 將自動部署${NC}\n"
else
    echo -e "\n${YELLOW}⚠️  推送失敗，請檢查認證設定${NC}\n"
    exit 1
fi

