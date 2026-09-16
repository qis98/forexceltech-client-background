# FOREXCELTECH 客户背景管理系统 MVP 数据模型

本文档定义 MVP 阶段的 SQLite 数据结构。第一版目标是支撑客户、联系人、拜访记录、项目机会、待办提醒、附件和 Excel 导入导出的本地数据闭环。

## 数据库位置

默认数据库文件：

```text
D:\FOREXCELTECHClientManager\data.db
```

默认附件目录：

```text
D:\FOREXCELTECHClientManager\attachments
```

后续导入导出、备份、日志、缓存和临时工作文件也统一放在 `D:\FOREXCELTECHClientManager` 的明确子目录中，不使用 C 盘作为默认保存位置。

## 设计原则

- 使用本地 SQLite 作为主数据源。
- 业务主表统一使用文本主键，便于后续导入导出、同步和去重。
- 重要实体保留 `created_at`、`updated_at` 和 `deleted_at`。
- 删除默认按软删除设计，避免误删客户情报。
- 常用筛选字段建立索引。
- 多选或低频扩展信息优先用 JSON 文本字段，避免 MVP 阶段过度拆表。

## 表结构概览

| 表名 | 用途 |
|---|---|
| `customers` | 客户公司或组织 |
| `contacts` | 联系人/关键人 |
| `visits` | 拜访、电话、聊天、同事转述等沟通记录 |
| `visit_participants` | 拜访记录与联系人关系 |
| `opportunities` | 项目机会 |
| `todos` | 待办和提醒 |
| `attachments` | 本地附件元数据 |
| `import_export_logs` | Excel 导入导出记录 |

## customers

客户主数据。

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | TEXT PK | 客户 ID |
| `name` | TEXT NOT NULL | 客户名称 |
| `short_name` | TEXT | 简称 |
| `industry` | TEXT | 行业 |
| `region` | TEXT | 区域 |
| `province` | TEXT | 省、自治区、直辖市或特别行政区，用于客户地图 |
| `city` | TEXT | 城市，用于客户地图城市级点位 |
| `district` | TEXT | 兼容保留字段；当前界面不单独展示，区县和街道信息统一写入 `address` |
| `address` | TEXT | 地址 |
| `website` | TEXT | 官网 |
| `phone` | TEXT | 总机/联系电话 |
| `status` | TEXT | `active`、`inactive`、`potential` |
| `importance_level` | INTEGER | 重要等级，1-5 |
| `owner_name` | TEXT | 负责人/销售 |
| `tags` | TEXT | JSON 数组 |
| `main_products` | TEXT | 主要产品信息 |
| `background` | TEXT | 客户背景 |
| `notes` | TEXT | 备注 |
| `created_at` | TEXT NOT NULL | 创建时间 |
| `updated_at` | TEXT NOT NULL | 更新时间 |
| `deleted_at` | TEXT | 软删除时间 |

## contacts

客户联系人和关键人信息。

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | TEXT PK | 联系人 ID |
| `customer_id` | TEXT FK | 所属客户 |
| `name` | TEXT NOT NULL | 姓名 |
| `gender` | TEXT | 性别 |
| `native_place` | TEXT | 户籍/籍贯信息 |
| `title` | TEXT | 职位 |
| `department` | TEXT | 部门 |
| `phone` | TEXT | 电话 |
| `email` | TEXT | 邮箱 |
| `wechat` | TEXT | 微信 |
| `education` | TEXT | 学历 |
| `major` | TEXT | 专业背景 |
| `years_of_experience` | INTEGER | 工作年限 |
| `career_history` | TEXT | 过往任职经历 |
| `influence_level` | INTEGER | 影响力等级，1-5 |
| `relationship_status` | TEXT | 关系状态 |
| `communication_preference` | TEXT | 沟通偏好 |
| `personal_interests` | TEXT | 个人兴趣 |
| `next_topics` | TEXT | 下次可以提及的话题 |
| `decision_role` | TEXT | 决策角色 |
| `tags` | TEXT | JSON 数组 |
| `notes` | TEXT | 备注 |
| `created_at` | TEXT NOT NULL | 创建时间 |
| `updated_at` | TEXT NOT NULL | 更新时间 |
| `deleted_at` | TEXT | 软删除时间 |

## visits

拜访和沟通记录。记录范围包括现场拜访、电话、微信聊天、邮件、同事转述等。

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | TEXT PK | 记录 ID |
| `customer_id` | TEXT FK | 关联客户 |
| `opportunity_id` | TEXT FK | 可选关联项目机会 |
| `type` | TEXT NOT NULL | `visit`、`call`、`wechat`、`email`、`internal_note` |
| `subject` | TEXT NOT NULL | 主题 |
| `occurred_at` | TEXT NOT NULL | 发生时间 |
| `location` | TEXT | 地点 |
| `summary` | TEXT | 摘要 |
| `details` | TEXT | 详细内容 |
| `customer_attitude` | TEXT | 客户态度/倾向 |
| `next_action` | TEXT | 下一步动作 |
| `created_by` | TEXT | 记录人 |
| `created_at` | TEXT NOT NULL | 创建时间 |
| `updated_at` | TEXT NOT NULL | 更新时间 |
| `deleted_at` | TEXT | 软删除时间 |

## visit_participants

拜访记录与联系人之间的多对多关系。

| 字段 | 类型 | 说明 |
|---|---|---|
| `visit_id` | TEXT FK | 拜访记录 |
| `contact_id` | TEXT FK | 联系人 |
| `role` | TEXT | 参与角色 |

## visit_plans

工作台日历中的计划拜访。正式拜访仍写入 `visits`，计划完成后通过 `linked_visit_id` 关联正式拜访记录。

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | TEXT PK | 计划 ID |
| `customer_id` | TEXT FK | 关联客户，必填 |
| `contact_id` | TEXT FK | 可选关联联系人 |
| `planned_date` | TEXT NOT NULL | 计划日期，格式 `YYYY-MM-DD` |
| `planned_time` | TEXT | 计划时间，格式 `HH:mm` |
| `purpose` | TEXT | 拜访目的 |
| `priority` | TEXT | `low`、`normal`、`high` |
| `status` | TEXT NOT NULL | `planned`、`done`、`cancelled` |
| `linked_visit_id` | TEXT FK | 完成计划时关联的正式拜访记录 |
| `notes` | TEXT | 计划备注 |
| `created_at` | TEXT NOT NULL | 创建时间 |
| `updated_at` | TEXT NOT NULL | 更新时间 |
| `deleted_at` | TEXT | 软删除时间 |

## opportunities

项目机会。

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | TEXT PK | 项目机会 ID |
| `customer_id` | TEXT FK | 关联客户 |
| `name` | TEXT NOT NULL | 项目名称 |
| `stage` | TEXT NOT NULL | 阶段 |
| `amount` | REAL | 预计金额 |
| `currency` | TEXT | 币种，默认 CNY |
| `expected_close_date` | TEXT | 预计成交日期 |
| `probability` | INTEGER | 成交概率，0-100 |
| `competitors` | TEXT | 竞争对手 |
| `requirements` | TEXT | 客户需求 |
| `risks` | TEXT | 风险 |
| `next_step` | TEXT | 下一步 |
| `owner_name` | TEXT | 负责人 |
| `notes` | TEXT | 备注 |
| `created_at` | TEXT NOT NULL | 创建时间 |
| `updated_at` | TEXT NOT NULL | 更新时间 |
| `deleted_at` | TEXT | 软删除时间 |

## todos

待办和提醒。

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | TEXT PK | 待办 ID |
| `customer_id` | TEXT FK | 可选关联客户 |
| `contact_id` | TEXT FK | 可选关联联系人 |
| `opportunity_id` | TEXT FK | 可选关联项目机会 |
| `title` | TEXT NOT NULL | 标题 |
| `description` | TEXT | 说明 |
| `due_at` | TEXT | 到期时间 |
| `priority` | TEXT | `low`、`normal`、`high` |
| `status` | TEXT | `open`、`done`、`cancelled` |
| `completed_at` | TEXT | 完成时间 |
| `created_at` | TEXT NOT NULL | 创建时间 |
| `updated_at` | TEXT NOT NULL | 更新时间 |
| `deleted_at` | TEXT | 软删除时间 |

## attachments

本地附件元数据。文件本体保存在附件目录。

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | TEXT PK | 附件 ID |
| `entity_type` | TEXT NOT NULL | 关联实体类型 |
| `entity_id` | TEXT NOT NULL | 关联实体 ID |
| `file_name` | TEXT NOT NULL | 原始文件名 |
| `stored_name` | TEXT NOT NULL | 本地保存文件名 |
| `file_path` | TEXT NOT NULL | 本地路径 |
| `mime_type` | TEXT | MIME 类型 |
| `file_size` | INTEGER | 文件大小 |
| `created_at` | TEXT NOT NULL | 创建时间 |
| `deleted_at` | TEXT | 软删除时间 |

## import_export_logs

Excel 导入导出日志。

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | TEXT PK | 日志 ID |
| `operation` | TEXT NOT NULL | `import` 或 `export` |
| `entity_type` | TEXT NOT NULL | 数据类型 |
| `file_path` | TEXT | 文件路径 |
| `status` | TEXT NOT NULL | `success` 或 `failed` |
| `message` | TEXT | 结果说明 |
| `created_at` | TEXT NOT NULL | 创建时间 |

## 搜索策略

MVP 第一版先通过普通索引和 `LIKE` 查询支持基础搜索。后续当数据量增长后，再增加 SQLite FTS5 虚拟表，覆盖客户名称、联系人姓名、职位、拜访摘要、项目名称等字段。

## 迁移策略

- 每次 schema 变更新增迁移文件。
- 使用 `PRAGMA user_version` 记录数据库版本。
- 当前版本：`1`。

