const fs = require('node:fs');
const path = require('node:path');
const { initializeDatabase, runSqlite } = require('../src/main/database');

const CUSTOMER_COUNT = Number(process.env.FOREXCELTECH_PERF_CUSTOMERS || 1001);
const CONTACT_COUNT = Number(process.env.FOREXCELTECH_PERF_CONTACTS || 1999);
const VISIT_COUNT = Number(process.env.FOREXCELTECH_PERF_VISITS || 599);
const CLEAN_PREVIOUS = process.argv.includes('--clean') || process.env.FOREXCELTECH_PERF_CLEAN === '1';
const RUN_ID = `perf_${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;

const industries = ['半导体设备', '汽车电子', '精密制造', '新能源', '工业自动化', '封装测试', '存储', '光模块'];
const regions = ['华东', '华南', '华北', '华中', '西南', '东北'];
const provinces = [
  ['上海', '上海'],
  ['江苏', '苏州'],
  ['浙江', '宁波'],
  ['广东', '深圳'],
  ['北京', '北京'],
  ['天津', '天津'],
  ['河北', '石家庄'],
  ['四川', '成都'],
  ['湖北', '武汉'],
  ['山东', '青岛']
];
const statuses = ['potential', 'active', 'inactive'];
const visitTypes = ['visit', 'phone', 'wechat', 'meeting'];

function quote(value) {
  if (value === undefined || value === null || value === '') {
    return 'NULL';
  }
  return `'${String(value).replaceAll("'", "''")}'`;
}

function jsonTags(...tags) {
  return JSON.stringify(tags.filter(Boolean));
}

function stamp(index, dayOffset = 0) {
  const date = new Date(Date.UTC(2026, 5, 1, 8, 0, 0));
  date.setUTCDate(date.getUTCDate() + dayOffset);
  date.setUTCMinutes(index % 60);
  date.setUTCSeconds(index % 60);
  return date.toISOString();
}

function localDateTime(index) {
  const date = new Date(Date.UTC(2026, 5, 1, 1, 0, 0));
  date.setUTCDate(date.getUTCDate() + (index % 29));
  date.setUTCHours(1 + (index % 9));
  date.setUTCMinutes((index * 7) % 60);
  date.setUTCSeconds((index * 11) % 60);
  return date.toISOString();
}

function buildCustomer(index) {
  const [province, city] = provinces[index % provinces.length];
  const industry = industries[index % industries.length];
  const region = regions[index % regions.length];
  const status = statuses[index % statuses.length];
  const id = `${RUN_ID}_cus_${String(index).padStart(4, '0')}`;
  return {
    id,
    sql: `INSERT INTO customers (
      id, name, short_name, industry, region, province, city, district, address, website, phone, status,
      importance_level, owner_name, tags, main_products, background, notes, created_at, updated_at
    ) VALUES (
      ${quote(id)},
      ${quote(`压测客户-${String(index).padStart(4, '0')}-${city}智能制造有限公司`)},
      ${quote(`压测${index}`)},
      ${quote(industry)},
      ${quote(region)},
      ${quote(province)},
      ${quote(city)},
      ${quote(`${city}测试区`)},
      ${quote(`${province}${city}高新区压测路${index}号，覆盖详细地址字段`)},
      ${quote(`https://perf-${index}.forexceltech.test`)},
      ${quote(`400-${String(index).padStart(4, '0')}-${String(1000 + index).slice(-4)}`)},
      ${quote(status)},
      ${(index % 5) + 1},
      ${quote(`销售${(index % 12) + 1}`)},
      ${quote(jsonTags('压测', industry, region, status))},
      ${quote(`主要产品信息压测：${industry} 产线设备、关键工艺模块和售后备件，编号 ${index}。`)},
      ${quote(`客户背景字段压测内容：第 ${index} 个客户，行业 ${industry}，区域 ${region}，用于验证长文本存储、检索和导出。`)},
      ${quote(`客户备注字段压测内容：含标点、数字 ${index}、英文 PERF-${index}，检查 SQLite 文本保存。`)},
      ${quote(stamp(index))},
      ${quote(stamp(index, 1))}
    );`
  };
}

function buildContact(index, customerId) {
  const id = `${RUN_ID}_con_${String(index).padStart(4, '0')}`;
  const gender = index % 2 === 0 ? '男' : '女';
  return {
    id,
    customerId,
    sql: `INSERT INTO contacts (
      id, customer_id, name, gender, native_place, title, department, phone, email, wechat,
      education, major, years_of_experience, career_history, influence_level,
      relationship_status, communication_preference, personal_interests, next_topics,
      decision_role, tags, notes, created_at, updated_at
    ) VALUES (
      ${quote(id)},
      ${quote(customerId)},
      ${quote(`压测联系人-${String(index).padStart(4, '0')}`)},
      ${quote(gender)},
      ${quote(['浙江宁波', '江苏苏州', '山东青岛', '广东深圳'][index % 4])},
      ${quote(['采购经理', '设备工程师', '生产负责人', '总经理'][index % 4])},
      ${quote(['采购部', '设备工程部', '生产部', '管理层'][index % 4])},
      ${quote(`138${String(10000000 + index).slice(-8)}`)},
      ${quote(`perf.contact.${index}@forexceltech.test`)},
      ${quote(`perf_wechat_${index}`)},
      ${quote(['本科', '硕士', '博士', '大专'][index % 4])},
      ${quote(['机械工程', '自动化', '电子信息', '供应链管理'][index % 4])},
      ${(index % 30) + 1},
      ${quote(`职业经历字段压测：曾负责 ${industries[index % industries.length]} 产线设备导入，编号 ${index}。`)},
      ${(index % 5) + 1},
      ${quote(['陌生', '初步接触', '熟悉', '信任'][index % 4])},
      ${quote(['微信优先', '电话优先', '邮件优先', '现场拜访'][index % 4])},
      ${quote(`个人兴趣字段压测：关注技术方案、交期、售后、行业案例 ${index}。`)},
      ${quote(`下次话题字段压测：讨论升级方案、价格边界、试用安排 ${index}。`)},
      ${quote(['决策人', '影响者', '使用者', '把关人'][index % 4])},
      ${quote(jsonTags('压测联系人', gender, `影响${(index % 5) + 1}`))},
      ${quote(`联系人备注字段压测：覆盖长备注、特殊字符 + / # % &，编号 ${index}。`)},
      ${quote(stamp(index, 2))},
      ${quote(stamp(index, 3))}
    );`
  };
}

function buildOpportunity(index, customerId) {
  const id = `${RUN_ID}_opp_${String(index).padStart(4, '0')}`;
  return {
    id,
    sql: `INSERT INTO opportunities (
      id, customer_id, name, stage, amount, currency, expected_close_date, probability,
      competitors, requirements, risks, next_step, owner_name, notes, created_at, updated_at
    ) VALUES (
      ${quote(id)},
      ${quote(customerId)},
      ${quote(`压测商机-${String(index).padStart(4, '0')}`)},
      ${quote(['lead', 'qualified', 'proposal', 'negotiation'][index % 4])},
      ${(index + 1) * 10000.5},
      ${quote('CNY')},
      ${quote(`2026-${String((index % 12) + 1).padStart(2, '0')}-${String((index % 27) + 1).padStart(2, '0')}`)},
      ${index % 101},
      ${quote(`竞争对手字段压测-${index}`)},
      ${quote(`需求字段压测：产线升级、节拍稳定、良率提升 ${index}。`)},
      ${quote(`风险字段压测：预算、交期、现场资源 ${index}。`)},
      ${quote(`下一步字段压测：提交方案并预约复盘 ${index}。`)},
      ${quote(`销售${(index % 12) + 1}`)},
      ${quote(`商机备注字段压测，用于激活 visits.opportunity_id 外键 ${index}。`)},
      ${quote(stamp(index, 4))},
      ${quote(stamp(index, 5))}
    );`
  };
}

function buildVisit(index, customerId, opportunityId, contactIds) {
  const id = `${RUN_ID}_vis_${String(index).padStart(4, '0')}`;
  const participantSql = contactIds
    .map((contactId, participantIndex) => `INSERT INTO visit_participants (visit_id, contact_id, role) VALUES (${quote(id)}, ${quote(contactId)}, ${quote(participantIndex === 0 ? '主联系人' : '参与人')});`)
    .join('\n');
  return {
    id,
    sql: `INSERT INTO visits (
      id, customer_id, opportunity_id, type, subject, occurred_at, location, summary, details,
      customer_attitude, next_action, created_by, created_at, updated_at
    ) VALUES (
      ${quote(id)},
      ${quote(customerId)},
      ${quote(opportunityId)},
      ${quote(visitTypes[index % visitTypes.length])},
      ${quote(`压测拜访-${String(index).padStart(4, '0')} 产线升级沟通`)},
      ${quote(localDateTime(index))},
      ${quote(`客户会议室-${index % 20}`)},
      ${quote(`拜访摘要字段压测：讨论设备选型、商务条件、交期和售后响应，编号 ${index}。`)},
      ${quote(`拜访详情字段压测：本次沟通覆盖客户现状、关键痛点、预算周期、决策链、竞品情况和下一步推进动作。该字段模拟较长文本，确认列表、弹框、导出和数据库保存不会截断。编号 ${index}。`)},
      ${quote(['积极', '谨慎', '观望', '需内部评估'][index % 4])},
      ${quote(`下一步动作字段压测：${String((index % 7) + 1)} 天内发送技术方案和报价，安排二次评审。`)},
      ${quote(`压测销售${(index % 12) + 1}`)},
      ${quote(stamp(index, 6))},
      ${quote(stamp(index, 7))}
    );
    ${participantSql}`
  };
}

function queryJson(dbPath, sql) {
  const output = runSqlite(dbPath, `.mode json\n${sql}`).trim();
  return output ? JSON.parse(output) : [];
}

function queryValue(dbPath, sql) {
  return runSqlite(dbPath, sql).trim();
}

function timed(label, fn) {
  const start = performance.now();
  const result = fn();
  const ms = performance.now() - start;
  return { label, ms, result };
}

function removePreviousPerfData(dbPath) {
  runSqlite(dbPath, `
    PRAGMA foreign_keys = ON;
    BEGIN;
    DELETE FROM visit_participants WHERE visit_id LIKE 'perf_%';
    DELETE FROM visits WHERE id LIKE 'perf_%';
    DELETE FROM opportunities WHERE id LIKE 'perf_%';
    DELETE FROM contacts WHERE id LIKE 'perf_%';
    DELETE FROM customers WHERE id LIKE 'perf_%';
    COMMIT;
  `);
}

function buildSeedSql() {
  const customers = [];
  const contacts = [];
  const opportunities = [];
  const visits = [];

  for (let index = 1; index <= CUSTOMER_COUNT; index += 1) {
    customers.push(buildCustomer(index));
  }

  for (let index = 1; index <= CONTACT_COUNT; index += 1) {
    const customer = customers[(index - 1) % customers.length];
    contacts.push(buildContact(index, customer.id));
  }

  for (let index = 1; index <= VISIT_COUNT; index += 1) {
    const customer = customers[(index - 1) % customers.length];
    const opportunity = buildOpportunity(index, customer.id);
    const firstContact = contacts[(index - 1) % contacts.length];
    const secondContact = contacts[(index * 7) % contacts.length];
    const thirdContact = contacts[(index * 13) % contacts.length];
    const participantIds = [...new Set([firstContact.id, secondContact.id, thirdContact.id])];
    opportunities.push(opportunity);
    visits.push(buildVisit(index, customer.id, opportunity.id, participantIds));
  }

  return {
    customers,
    contacts,
    opportunities,
    visits,
    sql: [
      'PRAGMA foreign_keys = ON;',
      'BEGIN;',
      ...customers.map((item) => item.sql),
      ...contacts.map((item) => item.sql),
      ...opportunities.map((item) => item.sql),
      ...visits.map((item) => item.sql),
      'COMMIT;'
    ].join('\n')
  };
}

function verify(dbPath) {
  const counts = queryJson(dbPath, `
    SELECT
      (SELECT COUNT(*) FROM customers WHERE id LIKE '${RUN_ID}_cus_%') AS customers,
      (SELECT COUNT(*) FROM contacts WHERE id LIKE '${RUN_ID}_con_%') AS contacts,
      (SELECT COUNT(*) FROM opportunities WHERE id LIKE '${RUN_ID}_opp_%') AS opportunities,
      (SELECT COUNT(*) FROM visits WHERE id LIKE '${RUN_ID}_vis_%') AS visits,
      (SELECT COUNT(*) FROM visit_participants WHERE visit_id LIKE '${RUN_ID}_vis_%') AS participants;
  `)[0];

  const nullCoverage = queryJson(dbPath, `
    SELECT
      (SELECT COUNT(*) FROM customers WHERE id LIKE '${RUN_ID}_cus_%' AND (
        name IS NULL OR short_name IS NULL OR industry IS NULL OR region IS NULL OR province IS NULL OR city IS NULL OR district IS NULL OR address IS NULL OR website IS NULL OR phone IS NULL OR status IS NULL OR importance_level IS NULL OR owner_name IS NULL OR tags IS NULL OR main_products IS NULL OR background IS NULL OR notes IS NULL OR created_at IS NULL OR updated_at IS NULL
      )) AS customers_with_missing_fields,
      (SELECT COUNT(*) FROM contacts WHERE id LIKE '${RUN_ID}_con_%' AND (
        customer_id IS NULL OR name IS NULL OR gender IS NULL OR native_place IS NULL OR title IS NULL OR department IS NULL OR phone IS NULL OR email IS NULL OR wechat IS NULL OR education IS NULL OR major IS NULL OR years_of_experience IS NULL OR career_history IS NULL OR influence_level IS NULL OR relationship_status IS NULL OR communication_preference IS NULL OR personal_interests IS NULL OR next_topics IS NULL OR decision_role IS NULL OR tags IS NULL OR notes IS NULL OR created_at IS NULL OR updated_at IS NULL
      )) AS contacts_with_missing_fields,
      (SELECT COUNT(*) FROM visits WHERE id LIKE '${RUN_ID}_vis_%' AND (
        customer_id IS NULL OR opportunity_id IS NULL OR type IS NULL OR subject IS NULL OR occurred_at IS NULL OR location IS NULL OR summary IS NULL OR details IS NULL OR customer_attitude IS NULL OR next_action IS NULL OR created_by IS NULL OR created_at IS NULL OR updated_at IS NULL
      )) AS visits_with_missing_fields;
  `)[0];

  const relationIssues = queryJson(dbPath, `
    SELECT
      (SELECT COUNT(*) FROM contacts ct LEFT JOIN customers c ON c.id = ct.customer_id WHERE ct.id LIKE '${RUN_ID}_con_%' AND c.id IS NULL) AS orphan_contacts,
      (SELECT COUNT(*) FROM visits v LEFT JOIN customers c ON c.id = v.customer_id WHERE v.id LIKE '${RUN_ID}_vis_%' AND c.id IS NULL) AS orphan_visits,
      (SELECT COUNT(*) FROM visits v LEFT JOIN opportunities o ON o.id = v.opportunity_id WHERE v.id LIKE '${RUN_ID}_vis_%' AND o.id IS NULL) AS orphan_visit_opportunities,
      (SELECT COUNT(*) FROM visit_participants vp LEFT JOIN visits v ON v.id = vp.visit_id LEFT JOIN contacts ct ON ct.id = vp.contact_id WHERE vp.visit_id LIKE '${RUN_ID}_vis_%' AND (v.id IS NULL OR ct.id IS NULL)) AS orphan_participants;
  `)[0];

  const sample = queryJson(dbPath, `
    SELECT
      c.name AS customer_name,
      c.province,
      c.city,
      ct.name AS contact_name,
      v.subject,
      v.occurred_at,
      v.details
    FROM visits v
    JOIN customers c ON c.id = v.customer_id
    JOIN visit_participants vp ON vp.visit_id = v.id
    JOIN contacts ct ON ct.id = vp.contact_id
    WHERE v.id LIKE '${RUN_ID}_vis_%'
    ORDER BY v.occurred_at DESC
    LIMIT 1;
  `)[0];

  const searchMetrics = [
    timed('客户列表关键字检索', () => queryJson(dbPath, `
      SELECT id, name, short_name, industry, region, province, city, updated_at
      FROM customers
      WHERE deleted_at IS NULL AND (
        name LIKE '%压测客户%' OR short_name LIKE '%压测客户%' OR industry LIKE '%压测客户%' OR region LIKE '%压测客户%'
      )
      ORDER BY updated_at DESC
      LIMIT 50;
    `).length),
    timed('联系人列表关键字检索', () => queryJson(dbPath, `
      SELECT ct.id, ct.name, c.name AS customer_name
      FROM contacts ct
      JOIN customers c ON c.id = ct.customer_id
      WHERE ct.deleted_at IS NULL AND c.deleted_at IS NULL AND (
        ct.name LIKE '%压测联系人%' OR ct.title LIKE '%压测联系人%' OR c.name LIKE '%压测联系人%'
      )
      ORDER BY ct.updated_at DESC
      LIMIT 50;
    `).length),
    timed('拜访记录关键字检索', () => queryJson(dbPath, `
      SELECT v.id, v.subject, c.name AS customer_name
      FROM visits v
      JOIN customers c ON c.id = v.customer_id
      WHERE v.deleted_at IS NULL AND c.deleted_at IS NULL AND (
        v.subject LIKE '%压测拜访%' OR v.summary LIKE '%压测拜访%' OR v.details LIKE '%压测拜访%' OR c.name LIKE '%压测拜访%'
      )
      ORDER BY v.occurred_at DESC
      LIMIT 50;
    `).length),
    timed('工作台统计查询', () => queryJson(dbPath, `
      SELECT
        (SELECT COUNT(*) FROM customers WHERE deleted_at IS NULL) AS customer_count,
        (SELECT COUNT(*) FROM contacts WHERE deleted_at IS NULL) AS contact_count,
        (SELECT COUNT(*) FROM visits WHERE deleted_at IS NULL) AS visit_count;
    `)[0])
  ];

  const integrity = queryValue(dbPath, 'PRAGMA integrity_check;');
  const foreignKeys = queryJson(dbPath, 'PRAGMA foreign_key_check;');
  const dbStats = fs.statSync(dbPath);

  return {
    counts,
    expected: {
      customers: CUSTOMER_COUNT,
      contacts: CONTACT_COUNT,
      opportunities: VISIT_COUNT,
      visits: VISIT_COUNT
    },
    nullCoverage,
    relationIssues,
    integrity,
    foreignKeyIssueCount: foreignKeys.length,
    sample,
    searchMetrics: searchMetrics.map((metric) => ({
      label: metric.label,
      ms: Number(metric.ms.toFixed(2)),
      result: metric.result
    })),
    dbSizeMB: Number((dbStats.size / 1024 / 1024).toFixed(2))
  };
}

function main() {
  const paths = initializeDatabase();
  const resultPath = path.join(paths.logsDir, `${RUN_ID}-performance-seed-report.json`);

  if (CLEAN_PREVIOUS) {
    const clean = timed('清理历史 perf_ 压测数据', () => removePreviousPerfData(paths.dbPath));
    console.log(`${clean.label}: ${clean.ms.toFixed(2)} ms`);
  }

  const seedData = buildSeedSql();
  const seed = timed('批量写入压测数据', () => runSqlite(paths.dbPath, seedData.sql));
  const verification = timed('校验压测数据', () => verify(paths.dbPath));

  const report = {
    runId: RUN_ID,
    dbPath: paths.dbPath,
    sqliteBin: paths.sqliteBin,
    inserted: {
      customers: seedData.customers.length,
      contacts: seedData.contacts.length,
      opportunities: seedData.opportunities.length,
      visits: seedData.visits.length
    },
    timings: {
      insertMs: Number(seed.ms.toFixed(2)),
      verifyMs: Number(verification.ms.toFixed(2))
    },
    verification: verification.result
  };

  fs.writeFileSync(resultPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify(report, null, 2));
  console.log(`Report saved: ${resultPath}`);
}

main();
