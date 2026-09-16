# FOREXCELTECH 客户背景管理系统

面向 FOREXCELTECH 一级代理商销售人员的 Windows 桌面端客户背景管理软件。

## 当前阶段

当前工程已完成：

- Electron 项目骨架
- MVP SQLite 数据模型
- 首个数据库迁移脚本
- 启动时本地数据库目录初始化
- 数据库 schema 验证脚本
- 客户、联系人、拜访记录第一业务闭环
- 智能录入 MVP：文字稿结构化抽取、Ollama 本地模型配置、本地规则兜底、草稿编辑和确认入库

## 环境要求

- Windows 10/11 x64
- PowerShell 7：`pwsh.exe`
- Node.js：`D:\DevTools\NodeJS`
- SQLite CLI：`D:\DevTools\SQLite\sqlite3.exe`
- Ollama：`D:\DevTools\Ollama\ollama.exe`

## 安装依赖

```powershell
pwsh.exe -NoProfile -Command "$env:PATH = 'D:\DevTools\NodeJS;D:\DevTools\SQLite;' + $env:PATH; $env:ELECTRON_MIRROR = 'https://npmmirror.com/mirrors/electron/'; $env:electron_config_cache = 'D:\DevTools\electron-cache'; & 'D:\DevTools\NodeJS\npm.cmd' install"
```

## 验证数据库 schema

```powershell
pwsh.exe -NoProfile -Command "$env:PATH = 'D:\DevTools\NodeJS;D:\DevTools\SQLite;' + $env:PATH; & 'D:\DevTools\NodeJS\npm.cmd' run db:verify"
```

## 启动应用

```powershell
pwsh.exe -NoProfile -Command "$env:PATH = 'D:\DevTools\NodeJS;D:\DevTools\SQLite;' + $env:PATH; & 'D:\DevTools\NodeJS\npm.cmd' start"
```

## 验证 Electron 启动链路

```powershell
pwsh.exe -NoProfile -Command "$env:PATH = 'D:\DevTools\NodeJS;D:\DevTools\SQLite;' + $env:PATH; & 'D:\DevTools\NodeJS\npm.cmd' run smoke"
```

## 验证备份与导出

```powershell
pwsh.exe -NoProfile -Command "$env:PATH = 'D:\DevTools\NodeJS;D:\DevTools\SQLite;' + $env:PATH; & 'D:\DevTools\NodeJS\npm.cmd' run data:verify"
```

## 生成 Windows exe

打包依赖 `electron-builder`。打包输出目录固定为：

```text
D:\FOREXCELTECHClientManager\release
```

打包缓存目录固定为：

```text
D:\DevTools\electron-builder-cache
```

生成安装包和免安装版：

```powershell
pwsh.exe -NoProfile -Command "$env:PATH = 'D:\DevTools\NodeJS;D:\DevTools\SQLite;' + $env:PATH; $env:ELECTRON_MIRROR = 'https://npmmirror.com/mirrors/electron/'; $env:electron_config_cache = 'D:\DevTools\electron-cache'; $env:ELECTRON_BUILDER_CACHE = 'D:\DevTools\electron-builder-cache'; & 'D:\DevTools\NodeJS\npm.cmd' run dist"
```

生成后的主要文件：

```text
D:\FOREXCELTECHClientManager\release\FOREXCELTECHClientManager-Setup-0.1.0-x64.exe
D:\FOREXCELTECHClientManager\release\FOREXCELTECHClientManager-Portable-0.1.0-x64.exe
```

安装包支持自定义安装目录。按项目约定，安装时建议选择：

```text
D:\FOREXCELTECHClientManager\app
```

只生成解包目录用于快速验证：

```powershell
pwsh.exe -NoProfile -Command "$env:PATH = 'D:\DevTools\NodeJS;D:\DevTools\SQLite;' + $env:PATH; $env:ELECTRON_MIRROR = 'https://npmmirror.com/mirrors/electron/'; $env:electron_config_cache = 'D:\DevTools\electron-cache'; $env:ELECTRON_BUILDER_CACHE = 'D:\DevTools\electron-builder-cache'; & 'D:\DevTools\NodeJS\npm.cmd' run pack"
```

打包后的应用会优先使用随包发布的 SQLite CLI：

```text
resources\sqlite\sqlite3.exe
```

应用启动后会自动创建：

```text
D:\FOREXCELTECHClientManager\data.db
D:\FOREXCELTECHClientManager\attachments
D:\FOREXCELTECHClientManager\backups
D:\FOREXCELTECHClientManager\exports
D:\FOREXCELTECHClientManager\logs
D:\FOREXCELTECHClientManager\temp
```

Ollama 本地模型目录：

```text
D:\FOREXCELTECHClientManager\ollama-models
```

Ollama 用户目录：

```text
D:\FOREXCELTECHClientManager\ollama-home
```

`C:\Users\songmu\.ollama` 是指向上述 D 盘目录的 junction，不保存实际模型文件。

项目运行数据默认根目录：

```text
D:\FOREXCELTECHClientManager
```

可通过环境变量覆盖：

```text
FOREXCELTECH_DATA_DIR
```

智能录入当前 MVP 聚焦文字稿结构化抽取。Ollama 本地模型配置在软件“设置”页中维护，配置文件保存到：

```text
D:\FOREXCELTECHClientManager\config.json
```

设置页支持：

- 仅本地规则 / Ollama 本地模型模式切换。
- Ollama 服务地址，默认 `http://localhost:11434`。
- Ollama 模型名称，默认 `qwen3:8b`。
- Ollama 连接测试。

本地模型测试前请确认 Ollama 服务已启动，并已安装模型：

```powershell
pwsh.exe -NoProfile -Command "$env:PATH = 'D:\DevTools\Ollama;' + $env:PATH; $env:OLLAMA_MODELS = 'D:\FOREXCELTECHClientManager\ollama-models'; & 'D:\DevTools\Ollama\ollama.exe' list"
```

当前开发环境已安装并验证：

```text
Ollama 0.30.10
qwen3:8b
```

如服务未启动，可执行：

```powershell
pwsh.exe -NoProfile -Command "$env:PATH = 'D:\DevTools\Ollama;' + $env:PATH; $env:OLLAMA_MODELS = 'D:\FOREXCELTECHClientManager\ollama-models'; Start-Process -FilePath 'D:\DevTools\Ollama\ollama.exe' -ArgumentList 'serve' -WorkingDirectory 'D:\DevTools\Ollama' -WindowStyle Hidden"
```

当前 MVP 暂不处理录音转写。请先用其他工具把录音转成文字，再粘贴到“智能录入”。

除非第三方工具无法配置，后续项目相关运行数据、附件、导入导出、备份、日志、缓存和临时工作文件都应放在 D 盘明确目录中。

## 数据备份与导出

应用顶部提供“备份”和“导出”按钮。

- 备份会复制当前 SQLite 数据库到 `D:\FOREXCELTECHClientManager\backups`。
- 导出会在 `D:\FOREXCELTECHClientManager\exports` 下生成客户、联系人、拜访记录 CSV 文件。
- 应用启动时会执行 SQLite `integrity_check`，用于尽早发现数据库损坏。

## 试用测试

轻量试用测试计划见：

```text
docs\test-plan.md
```

用户帮助文档见：

```text
docs\help.md
```

## SQLite CLI 路径

默认优先使用环境变量：

```text
FOREXCELTECH_SQLITE_BIN
```

如果未配置，则尝试使用：

```text
resources\sqlite\sqlite3.exe
```

如果不是打包后的应用，则尝试使用：

```text
D:\DevTools\SQLite\sqlite3.exe
```

最后尝试从系统 `PATH` 中查找 `sqlite3`。

