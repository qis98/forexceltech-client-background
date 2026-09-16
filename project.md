# FOREXCELTECH 客户背景管理系统 项目说明

## 1. 项目定位

本项目是一个面向 FOREXCELTECH 一级代理商销售人员的 Windows 桌面端客户背景管理软件，用于沉淀客户情报、关键人信息、拜访记录、项目机会和后续跟进事项。

核心目标：

- 快速记录拜访、聊天、同事转述中获得的信息。
- 按客户、联系人、项目、拜访记录进行结构化管理。
- 支持客户拜访前快速回顾背景和历史沟通。
- 本地优先保存数据，后续再考虑云同步。

## 2. 技术方向

- 目标平台：Windows 10/11 x64
- 技术栈：Electron + SQLite
- 数据策略：本地优先
- 数据库：SQLite
- 打包方向：Windows 安装包，优先考虑 NSIS

## 3. 开发环境与安装规则

后续每次为本项目检查、安装、升级开发工具或软件时，必须遵循以下规则：

1. 所有终端命令必须使用 PowerShell 7，也就是 `pwsh.exe`。
2. 执行 PowerShell 命令时优先使用：

   ```powershell
   pwsh.exe -NoProfile -Command "..."
   ```

3. 不使用 legacy Windows PowerShell 5.1，也就是不使用 `powershell.exe`。
4. 每一个需要新增安装的工具，必须在 D 盘下新建对应的工具目录文件夹。
5. 安装时必须尽量使用自定义安装路径，并放入对应的 D 盘工具目录中。
6. 优先使用 portable、zip、免安装版本，方便明确控制安装位置。
7. 不要默认把开发工具安装到 C 盘，除非该工具无法自定义路径，并且需要先说明原因。
8. 本项目今后新增的运行数据、附件、导入导出文件、备份、日志、缓存和临时工作文件，一律放在 D 盘明确目录中，不使用 C 盘作为默认保存位置。
9. 每次完成工具安装、升级或环境配置后，必须输出：
   - 新增或更新的软件/工具名称
   - 版本号
   - 安装目录
   - 配置的环境变量
   - 验证命令和验证结果

当前约定的工具根目录：

```text
D:\DevTools
```

当前约定的应用数据根目录：

```text
D:\FOREXCELTECHClientManager
```

当前约定的打包输出目录：

```text
D:\FOREXCELTECHClientManager\release
```

已使用的工具目录：

```text
D:\DevTools\NodeJS
D:\DevTools\Git
D:\DevTools\SQLite
D:\DevTools\npm-global
D:\DevTools\npm-cache
D:\DevTools\electron-cache
D:\DevTools\electron-builder-cache
D:\DevTools\_downloads
D:\DevTools\Downloads
D:\DevTools\Ollama
```

## 4. 当前已准备环境

| 工具 | 版本 | 目录 | 用途 |
|---|---:|---|---|
| Node.js | v24.16.0 | `D:\DevTools\NodeJS` | Electron 开发运行环境 |
| npm | 11.13.0 | `D:\DevTools\NodeJS` | 依赖管理 |
| Git Portable | 2.54.0.windows.1 | `D:\DevTools\Git` | 版本管理 |
| SQLite CLI | 3.53.2 | `D:\DevTools\SQLite` | SQLite 数据库调试 |
| Ollama | 0.30.10 | `D:\DevTools\Ollama` | 本地模型服务 |
| qwen3:8b | 8.2B / Q4_K_M | `D:\FOREXCELTECHClientManager\ollama-models` | 智能录入文字抽取测试模型 |
| PowerShell 7 | 已安装 | `D:\PowerShell\7` | 终端执行环境 |
| VS Code | 已安装 | `D:\VScode\Microsoft VS Code` | 代码编辑器 |
| Python | 3.14.5 | `D:\python` | 辅助脚本环境 |

用户级 PATH 已优先包含：

```text
D:\DevTools\NodeJS
D:\DevTools\npm-global
D:\DevTools\Git\cmd
D:\DevTools\SQLite
D:\DevTools\Ollama
```

npm 配置：

```text
prefix=D:\DevTools\npm-global
cache=D:\DevTools\npm-cache
```

Ollama 配置：

```text
OLLAMA_MODELS=D:\FOREXCELTECHClientManager\ollama-models
```

Ollama 自动生成的用户目录已迁移到：

```text
D:\FOREXCELTECHClientManager\ollama-home
```

`C:\Users\songmu\.ollama` 当前仅作为目录联接指向上述 D 盘目录，避免 Ollama 身份文件和缓存落到 C 盘。

Ollama 服务默认地址：

```text
http://localhost:11434
```

当前已安装并验证的本地模型：

```text
qwen3:8b
```

## 5. 产品功能范围

MVP 优先实现：

- 客户管理
- 联系人/关键人管理
- 拜访/沟通记录
- 项目机会管理
- 待办与提醒
- 全局搜索
- SQLite 本地数据存储
- Excel 导入/导出

关键人信息需要包含：

- 学历
- 专业背景
- 工作年限
- 过往任职经历
- 影响力等级
- 关系状态
- 沟通偏好
- 个人兴趣
- 下次可以提及的话题

## 6. 界面风格

- Windows 桌面应用风格。
- 商务、清爽、信息密度高。
- 不做营销型首页。
- 第一屏直接进入可用工作台。
- 主布局采用左侧导航、顶部搜索、右侧内容区。
- 颜色以深蓝、灰白为主，少量橙色或绿色用于状态提示。
- 第一版不需要复杂动画、不需要多语言、不需要移动端。

## 7. 数据要求

- 默认使用 SQLite 保存在本地。
- 数据库文件固定默认位置：

  ```text
  D:\FOREXCELTECHClientManager\data.db
  ```

- 附件固定默认位置：

  ```text
  D:\FOREXCELTECHClientManager\attachments
  ```

- 后续导入导出、备份、日志、缓存和临时工作文件也必须放在 `D:\FOREXCELTECHClientManager` 下的明确子目录中。
- 当前应用会自动创建 `backups`、`exports`、`logs`、`temp` 子目录。
- Ollama 本地模型默认保存到 `D:\FOREXCELTECHClientManager\ollama-models`。
- 顶部“备份”按钮会把当前 SQLite 数据库复制到 `D:\FOREXCELTECHClientManager\backups`。
- 顶部“导出”按钮会把客户、联系人、拜访记录导出为 CSV，放入 `D:\FOREXCELTECHClientManager\exports`。
- 应用启动时执行 SQLite `integrity_check`，用于基础数据库健康检查。
- 打包后的应用必须随包携带 SQLite CLI，并优先使用 `resources\sqlite\sqlite3.exe`，避免依赖开发机的 `D:\DevTools\SQLite`。
- Windows 安装包和免安装版输出到 `D:\FOREXCELTECHClientManager\release`。
- Windows 安装包必须允许自定义安装目录，安装时建议选择 `D:\FOREXCELTECHClientManager\app`。
- 如因第三方工具强制写入 C 盘，需要先说明原因，并优先寻找 D 盘路径覆盖方式。
- 后续如果增加云同步，必须先考虑数据加密、权限控制和备份恢复。

## 8. 工作流程要求

后续开发时应遵循：

1. 先检查项目现有文件和结构，再决定改动方式。
2. 文件修改前说明将要修改的内容。
3. 手工编辑文件优先使用 `apply_patch`。
4. 不删除用户已有文件或未确认的改动。
5. 每次完成代码或配置修改后，尽量运行可用的验证命令。
6. 每次完成代码修改后，必须重新执行打包，生成最新 Windows 安装包和免安装版，输出到 `D:\FOREXCELTECHClientManager\release`。
7. 如果启动本地开发服务，需要给出访问地址。
8. 如果新增依赖，需要说明依赖用途和安装位置。
9. 最终回复要简洁列出：
   - 已完成内容
   - 修改或新增文件
   - 验证结果
   - 打包产物位置
   - 后续建议

## 9. 文档维护

当项目技术选型、环境路径、功能范围、安装规则或关键约束发生变化时，需要同步更新本文档。

后续只要产品功能发生新增、删除、命名调整、入口调整、使用流程调整、数据路径调整或限制条件变化，必须同步更新：

- `docs/help.md`：面向用户说明实际可用功能、使用步骤、注意事项和当前版本边界。
- `docs/prd.md`：面向开发和产品说明需求范围、验收标准、TO DO 和优先级变化。
- `README.md`：当启动、打包、验证、数据目录或开发命令变化时同步更新。

不能把尚未实现的功能写入 `docs/help.md` 的“已可用功能”中。未实现但计划开发的功能应写入 `docs/prd.md` 的 TO DO 或规划章节。

`docs/prd.md` 的 TO DO 事项完成后，必须在对应事项文字上添加 Markdown 中横线标记，例如 `~~已完成事项~~`，并在该事项下方保留完成说明、完成日期或关联试用/验证记录。

