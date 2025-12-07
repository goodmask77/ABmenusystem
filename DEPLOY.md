# 自動化部署指南

## 🚀 快速部署方式

### 方式一：使用部署腳本（推薦）

```bash
# 基本使用（自動產生 commit message）
./deploy.sh

# 或自訂 commit message
./deploy.sh "修復刪除功能問題"
```

### 方式二：使用 npm 腳本

```bash
# 快速自動部署（使用時間戳記作為 commit message）
npm run deploy:auto

# 或使用互動式部署腳本
npm run deploy
```

### 方式三：手動部署

```bash
# 1. 加入所有變更
git add -A

# 2. 提交變更
git commit -m "你的 commit message"

# 3. 推送到 GitHub
git push origin main
```

## 📋 自動化流程說明

### 1. 本地變更
- 修改程式碼後，執行 `./deploy.sh` 或 `npm run deploy:auto`

### 2. 自動提交
- 腳本會自動：
  - 檢查變更的檔案
  - 加入所有變更 (`git add -A`)
  - 提交變更 (`git commit`)
  - 推送到 GitHub (`git push`)

### 3. Vercel 自動部署
- 如果 Vercel 已連接 GitHub，推送後會自動觸發部署
- 可在 Vercel Dashboard 查看部署狀態

### 4. GitHub Actions
- 已設置 GitHub Actions workflow
- 每次推送到 `main` 分支時會執行檢查

## ⚙️ Vercel 設定

### 確保 Vercel 已連接 GitHub

1. 前往 [Vercel Dashboard](https://vercel.com/dashboard)
2. 選擇你的專案
3. 確認已連接 GitHub repository
4. 確認自動部署已啟用

### 手動觸發 Vercel 部署

如果自動部署未觸發，可以：

```bash
# 安裝 Vercel CLI（如果還沒安裝）
npm i -g vercel

# 登入 Vercel
vercel login

# 部署到生產環境
vercel --prod
```

## 🔔 注意事項

1. **首次使用前**：確保已設定 git 使用者資訊
   ```bash
   git config --global user.name "你的名字"
   git config --global user.email "你的email"
   ```

2. **GitHub 認證**：如果 push 時需要認證，請：
   - 使用 SSH key（推薦）
   - 或使用 GitHub Personal Access Token

3. **Vercel 環境變數**：確保 Vercel 專案中已設定：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 📝 使用範例

```bash
# 修改完程式碼後
./deploy.sh "新增 Realtime 同步功能"

# 或快速部署
npm run deploy:auto
```

## 🎯 工作流程

```
修改程式碼 
  ↓
執行 ./deploy.sh
  ↓
自動 commit & push 到 GitHub
  ↓
Vercel 自動部署（如果已連接）
  ↓
完成！✅
```

