# Auto-Accept Lite

Lightweight hands-free mode for Google Antigravity IDE.  
Automatically accepts agent-suggested edits, terminal commands, and permission prompts via Chrome DevTools Protocol (CDP).

**No quota monitoring. No token scraping. No Language Server access. Zero ban risk.**

## ✨ Features

- 🤖 **Auto-Accept** — Automatically clicks Accept, Run, Confirm, Allow buttons
- ⌨️ **Keyboard Shortcut** — `Ctrl+Shift+A` (`Cmd+Shift+A` on Mac) to toggle
- 📊 **Status Bar** — Visual indicator showing ON/OFF state
- ⚙️ **Configurable Interval** — Adjust scan frequency (200ms–5000ms)
- 🧹 **Clean & Minimal** — Only 18KB, no unnecessary dependencies

## 📦 Installation

### From VSIX
1. Download the latest `.vsix` from [Releases](../../releases)
2. In VS Code: `Ctrl+Shift+P` → `Extensions: Install from VSIX...`
3. Select the downloaded file

### From Source
```bash
git clone https://github.com/restinnotes/aphelion-halo.git
cd aphelion-halo
npm install
npm run build
npx @vscode/vsce package --no-dependencies
```

## 🎯 What Gets Auto-Clicked

| Keyword | Description |
|---|---|
| `accept all` | Accept all changes |
| `accept` | Accept single change |
| `confirm` | Confirm action |
| `run` | Run command |
| `always allow` | Always allow permission |
| `allow` | Allow permission |
| `always run` | Always run (< 25 chars) |
| `expand all` | Expand all sections |

### Safety Filters
- Only clicks `<button>` elements or elements with `cursor: pointer`
- Skips content inside `<pre>` and `<code>` blocks
- Ignores text containing `.js` or `.ts` (prevents clicking filenames)
- Each element is only clicked once (prevents infinite loops)

## ⚙️ Configuration

| Setting | Default | Description |
|---|---|---|
| `autoAcceptLite.enabled` | `false` | Enable/disable auto-accept |
| `autoAcceptLite.interval` | `800` | Scan interval in ms (200–5000) |

## 🔒 Security

This extension is a **pure local UI automation tool**. It:
- ✅ Only connects to local CDP ports (localhost:8995–9005)
- ✅ Only injects button-clicking scripts into VS Code webviews
- ❌ Does NOT scan system processes
- ❌ Does NOT extract CSRF tokens
- ❌ Does NOT access the Antigravity Language Server
- ❌ Does NOT send any data externally
- ❌ Does NOT monitor quotas

**This extension will NOT get your account banned** — unlike quota monitoring extensions that scrape internal Language Server data.

## 📝 License

MIT

---

English | [中文](#中文文档)

## 中文文档

# Auto-Accept Lite

Google Antigravity IDE 的轻量级自动接受扩展。  
通过 Chrome DevTools Protocol (CDP) 自动接受 Agent 建议的编辑、终端命令和权限请求。

**无配额监控。无 Token 窃取。无 Language Server 访问。零封号风险。**

### 功能
- 🤖 **自动接受** — 自动点击 Accept、Run、Confirm、Allow 按钮
- ⌨️ **快捷键** — `Ctrl+Shift+A` 切换开关
- 📊 **状态栏** — 右下角显示 ON/OFF 状态
- ⚙️ **可配置间隔** — 调整扫描频率 (200ms–5000ms)

### 安装
1. 从 [Releases](../../releases) 下载最新 `.vsix`
2. VS Code 中: `Ctrl+Shift+P` → `Extensions: Install from VSIX...`
3. 选择下载的文件

### 安全性说明
本扩展是**纯本地 UI 自动化工具**，完全不涉及：
- 进程扫描 (`hunter.ts`)
- CSRF Token 提取
- Language Server 未授权访问
- 配额数据获取
- 任何外部数据传输

**不会导致封号** —— 与那些通过窃取内部 Token 监控配额的扩展完全不同。
