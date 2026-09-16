# 新客户开发自动化框架

本目录用于沉淀“从公开信息发现目标客户”的关键词、数据源、原始线索和评分结果。

## 目录结构

```text
new-client-development
├─ config
│  ├─ keyword-library.json      # 光通信客户开发关键词、地区、评分规则
│  └─ source-seeds.json         # 公开来源 URL 和可选 API 配置说明
├─ input
│  └─ manual-seeds.csv          # 人工补充种子客户，脚本会自动生成模板
└─ output
   ├─ search-queries.csv        # 组合搜索式
   ├─ search-urls.html          # 可人工打开的搜索入口
   ├─ raw-leads.json            # 原始线索
   ├─ scored-leads.csv          # 全量评分长名单
   ├─ qualified-leads.csv       # 50 分以上且非弱相关线索
   ├─ top150-leads.csv          # 150 家优先长名单
   └─ top30-leads.csv           # 优先跟进名单
```

## 使用命令

生成关键词组合和搜索入口：

```powershell
pwsh.exe -NoProfile -Command "& 'D:\DevTools\NodeJS\npm.cmd' run client-leads:queries"
```

采集公开来源、可选搜索 API、人工种子 CSV：

```powershell
pwsh.exe -NoProfile -Command "& 'D:\DevTools\NodeJS\npm.cmd' run client-leads:collect"
```

只导入并评分 `input/manual-seeds.csv`，不抓网页：

```powershell
pwsh.exe -NoProfile -Command "& 'D:\DevTools\NodeJS\npm.cmd' run client-leads:import"
```

评分并输出长名单：

```powershell
pwsh.exe -NoProfile -Command "& 'D:\DevTools\NodeJS\npm.cmd' run client-leads:score"
```

一键执行：

```powershell
pwsh.exe -NoProfile -Command "& 'D:\DevTools\NodeJS\npm.cmd' run client-leads:run"
```

## 可选环境变量

默认模式不需要新增依赖，也不需要 API Key。它会抓取配置里的公开来源，并读取 `input/manual-seeds.csv`。

公开来源模式偏保守：脚本只把可识别为企业实体的页面内容放入长名单，不会为了凑数量把新闻标题、政府栏目、园区介绍误当客户。要稳定形成 150 家长名单，需要接入搜索 API，或把企查查/天眼查/招聘网站/展会后台导出的候选公司补充到 `input/manual-seeds.csv`。

如需大规模自动搜索，可配置 Bing Web Search API：

```text
BING_SEARCH_API_KEY=<你的 key>
CLIENT_LEADS_SEARCH_MAX_QUERIES=80
```

如需使用 SerpApi：

```text
SERPAPI_KEY=<你的 key>
CLIENT_LEADS_SEARCH_MAX_QUERIES=80
```

如需使用 Brave Search API：

```text
BRAVE_SEARCH_API_KEY=<你的 key>
CLIENT_LEADS_SEARCH_MAX_QUERIES=200
```

多个搜索 API 同时配置时优先级为：Bing、SerpApi、Brave。Bing Web Search API 已不建议新接入，实际使用建议优先考虑 SerpApi 或 Brave。企查查、天眼查等工商数据建议通过官方授权导出 CSV 后放入 `input/manual-seeds.csv`，避免违反平台条款。

免费额度使用建议：

- SerpApi 免费计划如果只有 250 次/月，不要直接跑满 1106 条搜索式。
- 先设置 `CLIENT_LEADS_SEARCH_MAX_QUERIES=80` 验证质量。
- 质量可接受后再跑到 `200`，预留 50 次用于补充搜索。
- 脚本会把高价值搜索式排在前面，优先覆盖深圳/东莞/惠州、800G/CPO/硅光/TOSA/ROSA/COB/SIPLACE/DEK/招聘/扩产等强信号。

## 评分解释

脚本按 100 分制输出：

- 业务相关度：是否命中光模块、硅光、CPO、TOSA/ROSA、AOC 等。
- 工艺复杂度：是否命中 COB、裸 Die、微组装、高速互连、金丝键合等。
- 采购触发：是否命中融资、扩产、新基地、中试线、招聘、认证等。
- 地理便利：是否位于深圳、东莞、惠州等优先区域。
- 支付能力：是否命中融资、上市、头部客户、集团/资本等线索。
- 关键人可达性：是否出现设备、工艺、SMT、NPI、采购等岗位线索。

评分只是第一筛，第二周触达前仍需要人工复核来源链接和公司业务真实性。

`qualified-leads.csv`、`top150-leads.csv`、`top30-leads.csv` 只保留 50 分以上且非弱相关的对象。没有足够高质量输入时，这些文件可能只有表头，这是预期行为。
