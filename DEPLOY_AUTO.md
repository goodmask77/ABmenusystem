# 自動化部署說明

## 🚀 快速部署

每次完成任務後，執行以下指令即可自動完成部署：

```bash
./auto-deploy.sh "你的提交訊息"
```

或使用環境變數：

```bash
GITHUB_TOKEN="你的token" ./auto-deploy.sh "你的提交訊息"
```

## 📋 自動化流程

`auto-deploy.sh` 腳本會自動執行以下步驟：

1. ✅ **同步 public/ 目錄** - 確保 `public/script.js`、`public/styles.css`、`public/index.html` 與主檔案同步
2. ✅ **檢查變更** - 自動偵測所有修改的檔案
3. ✅ **提交變更** - 使用提供的訊息或自動生成時間戳記
4. ✅ **推送到 GitHub** - 自動推送到 `main` 分支
5. ✅ **觸發 Vercel 部署** - Vercel 會自動偵測推送並開始部署（約 1-2 分鐘）

## 🔧 設定 Token

### 方法 1: 使用 Git Config（推薦）

```bash
git config --global github.token "你的_github_token"
```

### 方法 2: 使用環境變數

```bash
export GITHUB_TOKEN="你的_github_token"
```

### 方法 3: 在命令中直接指定

```bash
GITHUB_TOKEN="你的_github_token" ./auto-deploy.sh "提交訊息"
```

## 📝 使用範例

```bash
# 基本使用（使用預設訊息）
./auto-deploy.sh

# 自訂提交訊息
./auto-deploy.sh "修復折扣計算問題"

# 使用環境變數
GITHUB_TOKEN="your_token" ./auto-deploy.sh "更新功能"
```

## ⚠️ 注意事項

1. **Token 安全**: Token 已從腳本中移除，不會被提交到 Git
2. **自動同步**: 腳本會自動同步 `public/` 目錄，確保部署檔案一致
3. **Vercel 自動部署**: 推送到 GitHub 後，Vercel 會自動觸發部署，無需手動操作

## 🔍 檢查部署狀態

部署完成後，可以：

1. 查看 Vercel 儀表板確認部署狀態
2. 檢查網站是否已更新（可能需要強制重新整理：`Ctrl/Cmd + Shift + R`）

## 🆘 故障排除

如果推送失敗：

1. 確認 Token 是否正確設定
2. 檢查網路連線
3. 確認 GitHub 權限設定

---

**提示**: 以後每次完成任務後，只需執行 `./auto-deploy.sh "你的訊息"` 即可自動完成所有部署步驟！

