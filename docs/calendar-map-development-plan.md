# 日历与客户地图技术开发文档

本文档用于指导和记录“工作台日历”和“客户地图”两个方向的开发。功能是否已上线仍以 `docs/help.md` 为准；本文档同时保留后续精细化方案。

## 1. 总体原则

- 本地优先：客户、地址、拜访计划和拜访记录均保存在本机数据库，不上传到第三方服务。
- D 盘优先：运行期数据、配置、导入导出、地图静态资源缓存均放在 `D:\FOREXCELTECHClientManager` 下。
- 先可用后精细：地图第一版只做到中国地图、省份和城市级标注，不做街道级定位。
- 人工确认优先：计划拜访、客户省市信息、地图定位异常均应允许人工维护。
- 不重复造轮子：地图模块优先采用成熟开源方案，例如 Apache ECharts + 中国地图 GeoJSON。

## 2. 开发方向一：工作台日历

### 2.1 产品目标

在工作台首页提供月视图日历，让销售快速看到：

- 哪些日期已有拜访记录。
- 哪些日期有计划拜访但尚未完成。
- 某天涉及几个客户。
- 点击某天后可直接维护当天计划和回看沟通记录。

### 2.2 推荐技术方案

第一版建议使用自研轻量日历组件，不引入大型日历库。

原因：

- 当前需求是月视图、日期标记、弹框维护，不需要复杂拖拽、周视图、资源排班等重功能。
- 自研组件更容易与现有工作台视觉风格统一。
- 后续如果出现复杂排程需求，再评估 `FullCalendar` 等成熟库。

### 2.3 数据模型建议

新增 `visit_plans` 表：

```sql
CREATE TABLE visit_plans (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  contact_id TEXT,
  planned_date TEXT NOT NULL,
  planned_time TEXT,
  purpose TEXT,
  priority TEXT DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'planned',
  linked_visit_id TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (contact_id) REFERENCES contacts(id),
  FOREIGN KEY (linked_visit_id) REFERENCES visits(id)
);
```

字段说明：

- `status` 建议取值：`planned`、`done`、`cancelled`。
- `planned_date` 使用 `YYYY-MM-DD`，用于日历聚合。
- `linked_visit_id` 用于把计划拜访和正式拜访记录关联起来。
- 删除采用软删除，避免误删计划历史。

设置项建议保存到 `D:\FOREXCELTECHClientManager\config.json`：

```json
{
  "calendar": {
    "visitedColor": "#8fd6a3",
    "plannedColor": "#f5a6a6",
    "mixedColor": "#b7c8ff",
    "badgeMax": 99
  }
}
```

### 2.4 后端接口建议

通过 Electron IPC 增加以下能力：

- `calendar:getMonthSummary`：按年月返回每日已拜访数量、计划数量、涉及客户数量。
- `calendar:getDayDetail`：返回某日已拜访记录和计划拜访。
- `visitPlans:create`：新增计划拜访。
- `visitPlans:update`：编辑计划拜访。
- `visitPlans:cancel`：取消计划拜访。
- `visitPlans:completeWithVisit`：关联或创建正式拜访记录，并标记计划完成。
- `settings:updateCalendar`：保存日历颜色和角标最大值。

### 2.5 前端交互建议

- 工作台统计卡片下方展示月视图日历。
- 日期格内优先展示日期数字，状态颜色作为背景或圆点，不压过日期。
- 多客户数量角标放在日期右上角。
- 点击日期打开弹框，不跳转页面。
- 弹框分为“已拜访”和“计划拜访”两个区域。
- 新增计划时必须选择客户；联系人可选。
- 将计划标记完成时，必须关联一条正式拜访记录，避免只有计划没有业务闭环。

### 2.6 验收重点

- 新增计划后重启应用仍可看到。
- 新增正式拜访记录后，日历对应日期自动变为已拜访状态。
- 同一天多个客户时数量角标正确。
- 颜色配置保存后刷新仍生效。
- 取消计划不会删除正式拜访记录。

## 3. 开发方向二：客户地图

### 3.1 产品目标

提供一个区域视角，帮助销售理解客户在全国和省内城市的分布情况：

- 全国客户分布在哪里。
- 哪些省份客户多。
- 某个省内客户集中在哪些城市。
- 点击地图或列表后快速进入客户详情。

### 3.2 推荐技术方案

第一版建议采用：

- Apache ECharts 作为地图渲染库。
- 本地 GeoJSON 作为中国和省份地图数据。
- 城市级点位使用客户的结构化省市字段映射，不做在线地理编码。

当前已上线 MVP 采用更轻量的内置离线示意图：

- 不引入在线地图 API。
- 不随包分发第三方 GeoJSON，避免 license 尚未确认前产生分发风险。
- 在前端内置省份和常见城市的示意坐标，先完成省份分布、城市级点位、筛选、客户列表和详情跳转闭环。
- 2026-06-29 已完成精确行政边界升级：运行时使用本地 ECharts + 本地 GeoJSON，不改变客户省市字段，不调用在线地图 API。

原因：

- ECharts 对中国地图、区域高亮、散点、视觉映射支持成熟。
- 不需要在线瓦片地图，降低联网、隐私、授权和稳定性风险。
- 城市级标注可以通过预置城市坐标表完成，不需要精确街道地址。

候选地图数据来源：

- DataV GeoAtlas 类开源 GeoJSON 数据。
- GitHub 上维护较好的 China GeoJSON 数据仓库。
- ECharts 社区常用的中国省市地图数据。

落地前必须确认：

- license 是否允许随软件分发。
- 数据是否包含中国地图、各省边界和城市中心点。
- 文件体积是否适合随应用打包。

### 3.3 静态资源位置

源代码中可保留开发用地图资源，例如：

```text
src/assets/maps/china.json
src/assets/maps/provinces/*.json
src/assets/maps/city-centers.json
```

运行期如需缓存或用户自定义地图资源，放在：

```text
D:\FOREXCELTECHClientManager\map-assets
```

### 3.4 数据模型建议

在 `customers` 表逐步增加结构化地址字段：

```sql
ALTER TABLE customers ADD COLUMN province TEXT;
ALTER TABLE customers ADD COLUMN city TEXT;
ALTER TABLE customers ADD COLUMN district TEXT;
ALTER TABLE customers ADD COLUMN geo_status TEXT DEFAULT 'pending';
ALTER TABLE customers ADD COLUMN geo_source TEXT DEFAULT 'manual';
ALTER TABLE customers ADD COLUMN geo_updated_at TEXT;
```

字段说明：

- `province`：省、自治区、直辖市。
- `city`：地级市或直辖市。
- `district`：兼容保留字段；当前界面不单独展示，区县和街道信息统一写入 `address`。
- `geo_status`：`ready`、`pending`、`invalid`。
- `geo_source`：`manual`、`import`、`rule`。
- `geo_updated_at`：定位信息最后更新时间。

第一版不建议保存客户经纬度。城市点位统一来自本地城市中心点字典，避免用户误以为系统已精确到街道。

### 3.5 后端接口建议

- `map:getChinaOverview`：返回各省客户数量、状态分布、行业分布。
- `map:getProvinceDetail`：返回某省各城市客户数量和客户列表。
- `map:getPendingLocationCustomers`：返回缺少省市信息的客户。
- `customers:updateLocation`：更新客户省、市、详细地址。
- `customers:listByProvinceCity`：按省市筛选客户。

### 3.6 前端交互建议

全国视图：

- 左侧导航显示“客户地图”，主页面不重复展示大标题，优先展示筛选和地图主体。
- 主区域展示中国地图。
- 右侧或右上提供状态、行业筛选。
- 省份颜色深浅代表客户数量或筛选后的客户密度。
- 点击省份进入省份视图。

省份视图：

- 地图放大到省份。
- 城市级标记点显示客户数量。
- 右侧抽屉展示该省客户列表。
- 客户列表支持滚动、搜索、按状态筛选。
- 点击客户后打开客户详情弹框或跳转到客户详情。

待补充定位：

- 地图页需要显示“待补充定位信息”入口。
- 缺少省份或城市的客户进入该列表。
- 用户可批量或逐个补充省市信息。

### 3.7 验收重点

- 断网状态下地图仍可打开。
- 新建客户填写省市后，地图能展示到对应省市。
- 修改客户省市后，地图刷新后位置变化正确。
- 缺少省市的客户不会导致地图报错。
- 点击地图标记点和客户列表项能进入正确客户。
- 行业、状态筛选能同时影响地图和侧边列表。

## 4. 推荐实施顺序

1. 日历数据模型和 IPC 接口。
2. 工作台月视图日历。
3. 日期详情弹框和计划拜访增删改。
4. 计划拜访关联正式拜访记录。
5. 设置页日历配色和角标最大值。
6. 客户结构化地址字段迁移。
7. 客户新增/编辑表单补充省份、城市字段。
8. 引入 ECharts 和本地地图 GeoJSON。
9. 客户地图全国视图。
10. 省份钻取、城市标记和侧边客户列表。
11. 待补充定位信息列表。
12. 真实用户场景测试和文档更新。

## 5. 风险与处理

### 5.1 地址不规范

风险：现有客户只有 `region` 或自由文本地址，无法稳定映射到省市。

处理：

- 新增结构化省市字段。
- 地图只展示 `geo_status = ready` 的客户。
- 其余客户进入“待补充定位信息”列表。

### 5.2 地图数据授权不清晰

风险：随软件分发开源 GeoJSON 前，如果 license 不明确，可能有合规风险。

处理：

- 开发前确认地图数据来源和 license。
- 在代码仓库中保留 `NOTICE` 或来源说明。
- 如 license 不适合分发，改用可商用数据源或用户自行导入地图资源。

### 5.3 地图文件体积过大

风险：全国和省份地图全部一次性加载，影响启动速度。

处理：

- 首页只加载中国地图。
- 点击省份时再懒加载对应省份 GeoJSON。
- 城市坐标字典单独维护，文件尽量小。

### 5.4 日历状态语义混乱

风险：同一天既有已拜访，又有未完成计划，用户可能误解状态。

处理：

- 设置“混合状态”样式。
- 日期详情弹框中分开展示“已拜访”和“计划拜访”。
- 计划完成必须关联正式拜访记录。

## 6. 测试计划

- 数据层测试：创建计划、取消计划、完成计划、关联正式拜访记录。
- 日历 UI 测试：单日无数据、仅已拜访、仅计划未完成、混合状态、多客户角标。
- 设置测试：修改配色和角标最大值后重启应用验证。
- 地图数据测试：客户有完整省市、缺少省市、省市修改、同城多客户。
- 地图 UI 测试：全国视图、省份钻取、筛选、侧边列表滚动、客户跳转。
- 真实用户模拟：新增客户，填写省市，创建计划拜访，完成一次拜访，检查工作台日历和客户地图是否同步变化。
