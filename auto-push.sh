#!/bin/bash

# 啟用/停用自動推送功能
# 使用方式: ./auto-push.sh enable 或 ./auto-push.sh disable

if [ "$1" == "enable" ]; then
    touch .git/auto-push-enabled
    echo "✅ 已啟用自動推送功能"
    echo "💡 每次 commit 後會自動推送到 GitHub"
elif [ "$1" == "disable" ]; then
    rm -f .git/auto-push-enabled
    echo "❌ 已停用自動推送功能"
else
    echo "使用方式: ./auto-push.sh [enable|disable]"
fi

