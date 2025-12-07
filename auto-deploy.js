#!/usr/bin/env node

/**
 * 自動化部署腳本 (Node.js 版本)
 * 使用方式: node auto-deploy.js [commit message]
 */

const { execSync } = require('child_process');
const readline = require('readline');

const colors = {
    green: '\x1b[32m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    reset: '\x1b[0m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command, options = {}) {
    try {
        return execSync(command, { 
            encoding: 'utf8', 
            stdio: 'inherit',
            ...options 
        });
    } catch (error) {
        log(`❌ 執行失敗: ${command}`, 'red');
        process.exit(1);
    }
}

function checkChanges() {
    try {
        const status = execSync('git status --porcelain', { encoding: 'utf8' });
        return status.trim().length > 0;
    } catch {
        return false;
    }
}

async function main() {
    log('🚀 開始自動化部署流程...\n', 'blue');

    // 檢查是否有未提交的變更
    if (!checkChanges()) {
        log('⚠️  沒有需要提交的變更', 'yellow');
        return;
    }

    // 取得 commit message
    const commitMsg = process.argv[2] || `自動部署: ${new Date().toLocaleString('zh-TW')}`;

    log(`📝 提交訊息: ${commitMsg}\n`, 'blue');

    // 顯示變更的檔案
    log('📋 變更的檔案:', 'blue');
    exec('git status --short');

    // 加入所有變更
    log('\n➕ 加入所有變更...', 'blue');
    exec('git add -A');

    // 提交變更
    log('💾 提交變更...', 'blue');
    exec(`git commit -m "${commitMsg}"`);

    // 推送到 GitHub
    log('📤 推送到 GitHub...', 'blue');
    try {
        exec('git push origin main', { stdio: 'pipe' });
        log('\n✅ 部署完成！', 'green');
        log('📦 變更已推送到 GitHub', 'green');
        log('🔄 Vercel 將自動觸發部署（如果已連接）\n', 'green');
    } catch (error) {
        log('\n⚠️  Push 失敗', 'yellow');
        log('💡 提示: 請檢查 GitHub 認證設定', 'yellow');
        log('   - 使用 SSH key: git remote set-url origin git@github.com:username/repo.git', 'yellow');
        log('   - 或使用 GitHub Personal Access Token', 'yellow');
        log('   - 或手動執行: git push origin main\n', 'yellow');
        
        // 詢問是否要重試
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        return new Promise((resolve) => {
            rl.question('是否要重試推送？(y/n): ', (answer) => {
                rl.close();
                if (answer.toLowerCase() === 'y') {
                    log('🔄 重試推送...', 'blue');
                    try {
                        exec('git push origin main');
                        log('✅ 推送成功！\n', 'green');
                    } catch {
                        log('❌ 推送仍然失敗，請手動處理\n', 'red');
                    }
                }
                resolve();
            });
        });
    }
}

main().catch(error => {
    log(`❌ 發生錯誤: ${error.message}`, 'red');
    process.exit(1);
});

