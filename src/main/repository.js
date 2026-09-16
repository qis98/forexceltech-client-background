const crypto = require('node:crypto');
const { runSqlite } = require('./database');

const REGION_OPTIONS = ['华东', '华南', '华北', '华中', '西南', '西北', '东北', '港澳台', '海外'];
const PROVINCE_REGION_MAP = {
  上海: '华东', 江苏: '华东', 浙江: '华东', 安徽: '华东',
  福建: '华南', 广东: '华南', 广西: '华南', 海南: '华南',
  北京: '华北', 天津: '华北', 河北: '华北', 山西: '华北', 山东: '华北', 内蒙古: '华北',
  河南: '华中', 湖北: '华中', 湖南: '华中', 江西: '华中',
  重庆: '西南', 四川: '西南', 贵州: '西南', 云南: '西南', 西藏: '西南',
  陕西: '西北', 甘肃: '西北', 青海: '西北', 宁夏: '西北', 新疆: '西北',
  辽宁: '东北', 吉林: '东北', 黑龙江: '东北',
  香港: '港澳台', 澳门: '港澳台', 台湾: '港澳台'
};
const PROVINCE_ALIASES = new Map(Object.keys(PROVINCE_REGION_MAP).flatMap((province) => [
  [province, province],
  [`${province}省`, province],
  [`${province}市`, province],
  [`${province}自治区`, province],
  [`${province}特别行政区`, province]
]));

[
  ['内蒙古', '内蒙古自治区'],
  ['广西', '广西壮族自治区'],
  ['西藏', '西藏自治区'],
  ['宁夏', '宁夏回族自治区'],
  ['新疆', '新疆维吾尔自治区'],
  ['香港', '香港特别行政区'],
  ['澳门', '澳门特别行政区']
].forEach(([shortName, fullName]) => PROVINCE_ALIASES.set(fullName, shortName));

function createRepository(dbPath) {
  function execute(sql) {
    runSqlite(dbPath, `PRAGMA foreign_keys = ON;\n${sql}`);
  }

  function query(sql) {
    const output = runSqlite(dbPath, `.mode json\n${sql}`);
    const trimmed = output.trim();
    return trimmed ? JSON.parse(trimmed) : [];
  }

  function quote(value) {
    if (value === undefined || value === null || value === '') {
      return 'NULL';
    }
    return `'${String(value).replaceAll("'", "''")}'`;
  }

  function numberValue(value, fallback = 'NULL') {
    if (value === undefined || value === null || value === '') {
      return fallback;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? String(parsed) : fallback;
  }

  function now() {
    return new Date().toISOString();
  }

  function localDateKey(date = new Date()) {
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 10);
  }

  function id(prefix) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  function normalizeTags(tags) {
    if (!tags) {
      return null;
    }
    return JSON.stringify(String(tags).split(',').map((tag) => tag.trim()).filter(Boolean));
  }

  function normalizeProvince(value = '') {
    const text = String(value || '').trim();
    if (!text) {
      return '';
    }
    if (PROVINCE_ALIASES.has(text)) {
      return PROVINCE_ALIASES.get(text);
    }
    return Object.keys(PROVINCE_REGION_MAP).find((province) => text.includes(province) || province.includes(text)) || '';
  }

  function normalizeCity(value = '') {
    return String(value || '').trim().replace(/市$/, '');
  }

  function normalizeCustomerLocation(payload = {}) {
    const province = normalizeProvince(payload.province);
    const region = province ? PROVINCE_REGION_MAP[province] : (REGION_OPTIONS.includes(payload.region) ? payload.region : '');
    return {
      ...payload,
      region,
      province,
      city: normalizeCity(payload.city)
    };
  }

  function normalizeListFilters(input = {}) {
    if (typeof input === 'string') {
      return { search: input };
    }
    return {
      search: input.search || '',
      status: input.status || '',
      industry: input.industry || '',
      region: input.region || ''
    };
  }

  function buildCustomerWhere(input = {}) {
    const filters = normalizeListFilters(input);
    const clauses = ['c.deleted_at IS NULL'];

    if (filters.search.trim()) {
      const keyword = `%${filters.search.trim()}%`;
      clauses.push(`(
        c.name LIKE ${quote(keyword)}
        OR c.short_name LIKE ${quote(keyword)}
        OR c.industry LIKE ${quote(keyword)}
        OR c.region LIKE ${quote(keyword)}
        OR c.province LIKE ${quote(keyword)}
        OR c.city LIKE ${quote(keyword)}
        OR c.address LIKE ${quote(keyword)}
        OR c.main_products LIKE ${quote(keyword)}
      )`);
    }

    if (filters.status) {
      clauses.push(`c.status = ${quote(filters.status)}`);
    }

    if (filters.industry) {
      clauses.push(`c.industry = ${quote(filters.industry)}`);
    }

    if (filters.region) {
      clauses.push(`c.region = ${quote(filters.region)}`);
    }

    return clauses.join(' AND ');
  }

  function buildKeywordWhere(alias, fields, search = '') {
    const terms = String(search || '').split(/\s+/).map((term) => term.trim()).filter(Boolean);
    if (!terms.length) {
      return `${alias}.deleted_at IS NULL`;
    }

    const keywordClauses = terms.map((term) => {
      const keyword = `%${term}%`;
      return `(${fields.map((field) => `${field} LIKE ${quote(keyword)}`).join(' OR ')})`;
    });

    return [`${alias}.deleted_at IS NULL`, ...keywordClauses].join(' AND ');
  }

  function listCustomers(filters = {}) {
    const where = buildCustomerWhere(filters);

    return query(`
      SELECT
        c.id,
        c.name,
        c.short_name,
        c.industry,
        c.region,
        c.province,
        c.city,
        c.district,
        c.address,
        c.status,
        c.importance_level,
        c.owner_name,
        c.updated_at,
        (
          SELECT MAX(v.occurred_at)
          FROM visits v
          WHERE v.customer_id = c.id AND v.deleted_at IS NULL
        ) AS last_visit_at,
        (
          SELECT COUNT(*)
          FROM contacts ct
          WHERE ct.customer_id = c.id AND ct.deleted_at IS NULL
        ) AS contact_count,
        (
          SELECT COUNT(*)
          FROM visits v
          WHERE v.customer_id = c.id AND v.deleted_at IS NULL
        ) AS visit_count
      FROM customers c
      WHERE ${where}
      ORDER BY c.updated_at DESC;
    `);
  }

  function getCustomerFilterOptions() {
    const industries = query(`
      SELECT DISTINCT industry AS value
      FROM customers
      WHERE deleted_at IS NULL AND industry IS NOT NULL AND industry != ''
      ORDER BY industry COLLATE NOCASE;
    `);
    const regions = query(`
      SELECT DISTINCT region AS value
      FROM customers
      WHERE deleted_at IS NULL AND region IS NOT NULL AND region != ''
      ORDER BY region COLLATE NOCASE;
    `);
    return {
      industries: industries.map((row) => row.value),
      regions: regions.map((row) => row.value)
    };
  }

  function getCustomerBundle(customerId) {
    const customers = query(`
      SELECT *
      FROM customers
      WHERE id = ${quote(customerId)} AND deleted_at IS NULL
      LIMIT 1;
    `);

    if (customers.length === 0) {
      return null;
    }

    const contacts = query(`
      SELECT *
      FROM contacts
      WHERE customer_id = ${quote(customerId)} AND deleted_at IS NULL
      ORDER BY influence_level DESC, updated_at DESC;
    `);

    const visits = query(`
      SELECT
        v.*,
        (
          SELECT GROUP_CONCAT(c.name, ', ')
          FROM visit_participants vp
          JOIN contacts c ON c.id = vp.contact_id
          WHERE vp.visit_id = v.id AND c.deleted_at IS NULL
        ) AS participant_names,
        (
          SELECT GROUP_CONCAT(c.id, ',')
          FROM visit_participants vp
          JOIN contacts c ON c.id = vp.contact_id
          WHERE vp.visit_id = v.id AND c.deleted_at IS NULL
        ) AS participant_ids
      FROM visits v
      WHERE v.customer_id = ${quote(customerId)} AND v.deleted_at IS NULL
      ORDER BY v.occurred_at DESC;
    `);

    return {
      customer: customers[0],
      contacts,
      visits
    };
  }

  function listContacts(search = '') {
    const where = buildKeywordWhere('ct', [
      'ct.name',
      'ct.gender',
      'ct.native_place',
      'ct.title',
      'ct.department',
      'ct.phone',
      'ct.email',
      'ct.wechat',
      'ct.education',
      'ct.major',
      'ct.career_history',
      'ct.relationship_status',
      'ct.communication_preference',
      'ct.personal_interests',
      'ct.next_topics',
      'ct.decision_role',
      'ct.notes',
      'c.name',
      'c.short_name',
      'c.industry',
      'c.region'
    ], search);

    return query(`
      SELECT
        ct.*,
        c.name AS customer_name,
        c.short_name AS customer_short_name,
        c.industry AS customer_industry,
        c.region AS customer_region
      FROM contacts ct
      JOIN customers c ON c.id = ct.customer_id
      WHERE ${where} AND c.deleted_at IS NULL
      ORDER BY ct.updated_at DESC, ct.created_at DESC;
    `);
  }

  function listVisits(search = '') {
    const where = buildKeywordWhere('v', [
      'v.type',
      'v.subject',
      'v.location',
      'v.summary',
      'v.details',
      'v.customer_attitude',
      'v.next_action',
      'v.created_by',
      'c.name',
      'c.short_name',
      'c.industry',
      'c.region',
      `IFNULL((
        SELECT GROUP_CONCAT(ct.name, ', ')
        FROM visit_participants vp
        JOIN contacts ct ON ct.id = vp.contact_id
        WHERE vp.visit_id = v.id AND ct.deleted_at IS NULL
      ), '')`
    ], search);

    return query(`
      SELECT
        v.*,
        c.name AS customer_name,
        c.short_name AS customer_short_name,
        c.industry AS customer_industry,
        c.region AS customer_region,
        (
          SELECT GROUP_CONCAT(ct.name, ', ')
          FROM visit_participants vp
          JOIN contacts ct ON ct.id = vp.contact_id
          WHERE vp.visit_id = v.id AND ct.deleted_at IS NULL
        ) AS participant_names,
        (
          SELECT GROUP_CONCAT(ct.id, ',')
          FROM visit_participants vp
          JOIN contacts ct ON ct.id = vp.contact_id
          WHERE vp.visit_id = v.id AND ct.deleted_at IS NULL
        ) AS participant_ids
      FROM visits v
      JOIN customers c ON c.id = v.customer_id
      WHERE ${where} AND c.deleted_at IS NULL
      ORDER BY v.occurred_at DESC, v.updated_at DESC;
    `);
  }

  function saveCustomer(payload) {
    payload = normalizeCustomerLocation(payload);
    const timestamp = now();
    const customerId = payload.id || id('cus');
    const tags = normalizeTags(payload.tags);

    if (payload.id) {
      execute(`
        UPDATE customers
        SET
          name = ${quote(payload.name)},
          short_name = ${quote(payload.short_name)},
          industry = ${quote(payload.industry)},
          region = ${quote(payload.region)},
          province = ${quote(payload.province)},
          city = ${quote(payload.city)},
          district = ${quote(payload.district)},
          address = ${quote(payload.address)},
          website = ${quote(payload.website)},
          phone = ${quote(payload.phone)},
          status = ${quote(payload.status || 'potential')},
          importance_level = ${numberValue(payload.importance_level, '3')},
          owner_name = ${quote(payload.owner_name)},
          tags = ${quote(tags)},
          main_products = ${quote(payload.main_products)},
          background = ${quote(payload.background)},
          notes = ${quote(payload.notes)},
          updated_at = ${quote(timestamp)}
        WHERE id = ${quote(customerId)} AND deleted_at IS NULL;
      `);
      return customerId;
    }

    execute(`
      INSERT INTO customers (
        id, name, short_name, industry, region, province, city, district, address, website, phone, status,
        importance_level, owner_name, tags, main_products, background, notes, created_at, updated_at
      ) VALUES (
        ${quote(customerId)}, ${quote(payload.name)}, ${quote(payload.short_name)},
        ${quote(payload.industry)}, ${quote(payload.region)}, ${quote(payload.province)},
        ${quote(payload.city)}, ${quote(payload.district)}, ${quote(payload.address)},
        ${quote(payload.website)}, ${quote(payload.phone)}, ${quote(payload.status || 'potential')},
        ${numberValue(payload.importance_level, '3')}, ${quote(payload.owner_name)}, ${quote(tags)},
        ${quote(payload.main_products)}, ${quote(payload.background)}, ${quote(payload.notes)}, ${quote(timestamp)}, ${quote(timestamp)}
      );
    `);
    return customerId;
  }

  function deleteCustomer(customerId) {
    execute(`
      UPDATE customers
      SET deleted_at = ${quote(now())}, updated_at = ${quote(now())}
      WHERE id = ${quote(customerId)} AND deleted_at IS NULL;
    `);
  }

  function saveContact(payload) {
    const timestamp = now();
    const contactId = payload.id || id('con');
    const tags = normalizeTags(payload.tags);

    if (payload.id) {
      execute(`
        UPDATE contacts
        SET
          customer_id = ${quote(payload.customer_id)},
          name = ${quote(payload.name)},
          gender = ${quote(payload.gender)},
          native_place = ${quote(payload.native_place)},
          title = ${quote(payload.title)},
          department = ${quote(payload.department)},
          phone = ${quote(payload.phone)},
          email = ${quote(payload.email)},
          wechat = ${quote(payload.wechat)},
          education = ${quote(payload.education)},
          major = ${quote(payload.major)},
          years_of_experience = ${numberValue(payload.years_of_experience)},
          career_history = ${quote(payload.career_history)},
          influence_level = ${numberValue(payload.influence_level, '3')},
          relationship_status = ${quote(payload.relationship_status)},
          communication_preference = ${quote(payload.communication_preference)},
          personal_interests = ${quote(payload.personal_interests)},
          next_topics = ${quote(payload.next_topics)},
          decision_role = ${quote(payload.decision_role)},
          tags = ${quote(tags)},
          notes = ${quote(payload.notes)},
          updated_at = ${quote(timestamp)}
        WHERE id = ${quote(contactId)} AND deleted_at IS NULL;
      `);
      return contactId;
    }

    execute(`
      INSERT INTO contacts (
        id, customer_id, name, gender, native_place, title, department, phone, email, wechat,
        education, major, years_of_experience, career_history, influence_level,
        relationship_status, communication_preference, personal_interests, next_topics,
        decision_role, tags, notes, created_at, updated_at
      ) VALUES (
        ${quote(contactId)}, ${quote(payload.customer_id)}, ${quote(payload.name)},
        ${quote(payload.gender)}, ${quote(payload.native_place)}, ${quote(payload.title)}, ${quote(payload.department)},
        ${quote(payload.phone)}, ${quote(payload.email)}, ${quote(payload.wechat)},
        ${quote(payload.education)}, ${quote(payload.major)}, ${numberValue(payload.years_of_experience)},
        ${quote(payload.career_history)}, ${numberValue(payload.influence_level, '3')},
        ${quote(payload.relationship_status)}, ${quote(payload.communication_preference)},
        ${quote(payload.personal_interests)}, ${quote(payload.next_topics)}, ${quote(payload.decision_role)},
        ${quote(tags)}, ${quote(payload.notes)}, ${quote(timestamp)}, ${quote(timestamp)}
      );
    `);
    return contactId;
  }

  function deleteContact(contactId) {
    execute(`
      UPDATE contacts
      SET deleted_at = ${quote(now())}, updated_at = ${quote(now())}
      WHERE id = ${quote(contactId)} AND deleted_at IS NULL;
    `);
  }

  function saveVisit(payload) {
    const timestamp = now();
    const visitId = payload.id || id('vis');
    const occurredAt = payload.occurred_at || timestamp;

    if (payload.id) {
      execute(`
        BEGIN;
        UPDATE visits
        SET
          customer_id = ${quote(payload.customer_id)},
          type = ${quote(payload.type || 'visit')},
          subject = ${quote(payload.subject)},
          occurred_at = ${quote(occurredAt)},
          location = ${quote(payload.location)},
          summary = ${quote(payload.summary)},
          details = ${quote(payload.details)},
          customer_attitude = ${quote(payload.customer_attitude)},
          next_action = ${quote(payload.next_action)},
          created_by = ${quote(payload.created_by)},
          updated_at = ${quote(timestamp)}
        WHERE id = ${quote(visitId)} AND deleted_at IS NULL;
        DELETE FROM visit_participants WHERE visit_id = ${quote(visitId)};
        ${buildVisitParticipantInserts(visitId, payload.contact_ids)}
        COMMIT;
      `);
      return visitId;
    }

    execute(`
      BEGIN;
      INSERT INTO visits (
        id, customer_id, type, subject, occurred_at, location, summary, details,
        customer_attitude, next_action, created_by, created_at, updated_at
      ) VALUES (
        ${quote(visitId)}, ${quote(payload.customer_id)}, ${quote(payload.type || 'visit')},
        ${quote(payload.subject)}, ${quote(occurredAt)}, ${quote(payload.location)}, ${quote(payload.summary)},
        ${quote(payload.details)}, ${quote(payload.customer_attitude)}, ${quote(payload.next_action)},
        ${quote(payload.created_by)}, ${quote(timestamp)}, ${quote(timestamp)}
      );
      ${buildVisitParticipantInserts(visitId, payload.contact_ids)}
      COMMIT;
    `);
    return visitId;
  }

  function buildVisitParticipantInserts(visitId, contactIds = []) {
    return contactIds
      .filter(Boolean)
      .map((contactId) => `INSERT INTO visit_participants (visit_id, contact_id) VALUES (${quote(visitId)}, ${quote(contactId)});`)
      .join('\n');
  }

  function deleteVisit(visitId) {
    execute(`
      UPDATE visits
      SET deleted_at = ${quote(now())}, updated_at = ${quote(now())}
      WHERE id = ${quote(visitId)} AND deleted_at IS NULL;
    `);
  }

  function getCalendarMonthSummary(year, month) {
    const normalizedYear = Number(year);
    const normalizedMonth = Number(month);
    if (!Number.isInteger(normalizedYear) || !Number.isInteger(normalizedMonth) || normalizedMonth < 1 || normalizedMonth > 12) {
      throw new Error('日历月份参数无效。');
    }
    const monthKey = `${normalizedYear}-${String(normalizedMonth).padStart(2, '0')}`;

    const visitRows = query(`
      SELECT
        substr(v.occurred_at, 1, 10) AS date,
        COUNT(*) AS visited_count,
        COUNT(DISTINCT v.customer_id) AS visited_customer_count
      FROM visits v
      JOIN customers c ON c.id = v.customer_id
      WHERE v.deleted_at IS NULL
        AND c.deleted_at IS NULL
        AND substr(v.occurred_at, 1, 7) = ${quote(monthKey)}
      GROUP BY substr(v.occurred_at, 1, 10);
    `);

    const planRows = query(`
      SELECT
        vp.planned_date AS date,
        SUM(CASE WHEN vp.status = 'planned' THEN 1 ELSE 0 END) AS planned_count,
        SUM(CASE WHEN vp.status = 'done' THEN 1 ELSE 0 END) AS done_plan_count,
        COUNT(DISTINCT vp.customer_id) AS planned_customer_count
      FROM visit_plans vp
      JOIN customers c ON c.id = vp.customer_id
      WHERE vp.deleted_at IS NULL
        AND c.deleted_at IS NULL
        AND substr(vp.planned_date, 1, 7) = ${quote(monthKey)}
        AND vp.status != 'cancelled'
      GROUP BY vp.planned_date;
    `);

    const customerRows = query(`
      SELECT date, COUNT(DISTINCT customer_id) AS customer_count
      FROM (
        SELECT substr(v.occurred_at, 1, 10) AS date, v.customer_id AS customer_id
        FROM visits v
        JOIN customers c ON c.id = v.customer_id
        WHERE v.deleted_at IS NULL
          AND c.deleted_at IS NULL
          AND substr(v.occurred_at, 1, 7) = ${quote(monthKey)}
        UNION
        SELECT vp.planned_date AS date, vp.customer_id AS customer_id
        FROM visit_plans vp
        JOIN customers c ON c.id = vp.customer_id
        WHERE vp.deleted_at IS NULL
          AND c.deleted_at IS NULL
          AND vp.status != 'cancelled'
          AND substr(vp.planned_date, 1, 7) = ${quote(monthKey)}
      )
      GROUP BY date;
    `);

    const days = new Map();
    for (const row of visitRows) {
      days.set(row.date, {
        date: row.date,
        visited_count: Number(row.visited_count || 0),
        planned_count: 0,
        done_plan_count: 0,
        customer_count: Number(row.visited_customer_count || 0)
      });
    }
    for (const row of planRows) {
      const existing = days.get(row.date) || {
        date: row.date,
        visited_count: 0,
        planned_count: 0,
        done_plan_count: 0,
        customer_count: 0
      };
      existing.planned_count = Number(row.planned_count || 0);
      existing.done_plan_count = Number(row.done_plan_count || 0);
      existing.customer_count = Math.max(existing.customer_count, Number(row.planned_customer_count || 0));
      days.set(row.date, existing);
    }
    for (const row of customerRows) {
      const existing = days.get(row.date) || {
        date: row.date,
        visited_count: 0,
        planned_count: 0,
        done_plan_count: 0,
        customer_count: 0
      };
      existing.customer_count = Number(row.customer_count || 0);
      days.set(row.date, existing);
    }

    return {
      year: normalizedYear,
      month: normalizedMonth,
      days: Array.from(days.values()).sort((a, b) => a.date.localeCompare(b.date))
    };
  }

  function getCalendarDayDetail(date) {
    const day = String(date || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      throw new Error('日历日期参数无效。');
    }

    const visits = query(`
      SELECT
        v.*,
        c.name AS customer_name,
        c.short_name AS customer_short_name,
        (
          SELECT GROUP_CONCAT(ct.name, ', ')
          FROM visit_participants vp
          JOIN contacts ct ON ct.id = vp.contact_id
          WHERE vp.visit_id = v.id AND ct.deleted_at IS NULL
        ) AS participant_names,
        (
          SELECT GROUP_CONCAT(ct.id, ',')
          FROM visit_participants vp
          JOIN contacts ct ON ct.id = vp.contact_id
          WHERE vp.visit_id = v.id AND ct.deleted_at IS NULL
        ) AS participant_ids
      FROM visits v
      JOIN customers c ON c.id = v.customer_id
      WHERE v.deleted_at IS NULL
        AND c.deleted_at IS NULL
        AND substr(v.occurred_at, 1, 10) = ${quote(day)}
      ORDER BY v.occurred_at ASC, v.created_at ASC;
    `);

    const plans = query(`
      SELECT
        vp.*,
        c.name AS customer_name,
        c.short_name AS customer_short_name,
        ct.name AS contact_name,
        ct.title AS contact_title
      FROM visit_plans vp
      JOIN customers c ON c.id = vp.customer_id
      LEFT JOIN contacts ct ON ct.id = vp.contact_id AND ct.deleted_at IS NULL
      WHERE vp.deleted_at IS NULL
        AND c.deleted_at IS NULL
        AND vp.planned_date = ${quote(day)}
        AND vp.status != 'cancelled'
      ORDER BY
        CASE vp.status WHEN 'planned' THEN 0 WHEN 'done' THEN 1 ELSE 2 END,
        vp.planned_time IS NULL,
        vp.planned_time ASC,
        vp.created_at ASC;
    `);

    return { date: day, visits, plans };
  }

  function saveVisitPlan(payload) {
    const timestamp = now();
    const planId = payload.id || id('vpl');
    const status = ['planned', 'done', 'cancelled'].includes(payload.status) ? payload.status : 'planned';
    const plannedDate = String(payload.planned_date || '').slice(0, 10);
    if (!payload.customer_id) {
      throw new Error('计划拜访必须选择客户。');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(plannedDate)) {
      throw new Error('计划日期无效。');
    }
    if (status === 'planned' && plannedDate < localDateKey()) {
      throw new Error('不能在过去日期新增或保存计划拜访。可以补录正式拜访记录。');
    }

    if (payload.id) {
      execute(`
        UPDATE visit_plans
        SET
          customer_id = ${quote(payload.customer_id)},
          contact_id = ${quote(payload.contact_id)},
          planned_date = ${quote(plannedDate)},
          planned_time = ${quote(payload.planned_time)},
          purpose = ${quote(payload.purpose)},
          priority = ${quote(payload.priority || 'normal')},
          status = ${quote(status)},
          notes = ${quote(payload.notes)},
          updated_at = ${quote(timestamp)}
        WHERE id = ${quote(planId)} AND deleted_at IS NULL;
      `);
      return planId;
    }

    execute(`
      INSERT INTO visit_plans (
        id, customer_id, contact_id, planned_date, planned_time, purpose,
        priority, status, notes, created_at, updated_at
      ) VALUES (
        ${quote(planId)}, ${quote(payload.customer_id)}, ${quote(payload.contact_id)},
        ${quote(plannedDate)}, ${quote(payload.planned_time)}, ${quote(payload.purpose)},
        ${quote(payload.priority || 'normal')}, ${quote(status)}, ${quote(payload.notes)},
        ${quote(timestamp)}, ${quote(timestamp)}
      );
    `);
    return planId;
  }

  function cancelVisitPlan(planId) {
    execute(`
      UPDATE visit_plans
      SET status = 'cancelled', deleted_at = ${quote(now())}, updated_at = ${quote(now())}
      WHERE id = ${quote(planId)} AND deleted_at IS NULL;
    `);
  }

  function completeVisitPlan(planId, visitId) {
    execute(`
      UPDATE visit_plans
      SET status = 'done', linked_visit_id = ${quote(visitId)}, updated_at = ${quote(now())}
      WHERE id = ${quote(planId)} AND deleted_at IS NULL;
    `);
  }

  function getDashboard() {
    const rows = query(`
      SELECT
        (SELECT COUNT(*) FROM customers WHERE deleted_at IS NULL) AS customer_count,
        (SELECT COUNT(*) FROM contacts WHERE deleted_at IS NULL) AS contact_count,
        (SELECT COUNT(*) FROM visits WHERE deleted_at IS NULL) AS visit_count;
    `);
    return rows[0] || { customer_count: 0, contact_count: 0, visit_count: 0 };
  }

  function listCustomersForExport() {
    return query(`
      SELECT
        id, name, short_name, industry, region, province, city, district, status, importance_level,
        owner_name, phone, website, address, tags, main_products, background, notes,
        created_at, updated_at
      FROM customers
      WHERE deleted_at IS NULL
      ORDER BY updated_at DESC;
    `);
  }

  function listContactsForExport() {
    return query(`
      SELECT
        ct.id, c.name AS customer_name, ct.name, ct.gender, ct.department,
        ct.native_place,
        ct.title, ct.phone, ct.email, ct.wechat, ct.education, ct.major,
        ct.years_of_experience, ct.career_history, ct.influence_level,
        ct.relationship_status, ct.communication_preference,
        ct.personal_interests, ct.next_topics, ct.decision_role,
        ct.notes, ct.created_at, ct.updated_at
      FROM contacts ct
      JOIN customers c ON c.id = ct.customer_id
      WHERE ct.deleted_at IS NULL AND c.deleted_at IS NULL
      ORDER BY c.name COLLATE NOCASE, ct.influence_level DESC, ct.updated_at DESC;
    `);
  }

  function listVisitsForExport() {
    return query(`
      SELECT
        v.id, c.name AS customer_name, v.type, v.subject, v.occurred_at,
        v.location,
        (
          SELECT GROUP_CONCAT(ct.name, ', ')
          FROM visit_participants vp
          JOIN contacts ct ON ct.id = vp.contact_id
          WHERE vp.visit_id = v.id AND ct.deleted_at IS NULL
        ) AS participant_names,
        v.summary, v.details, v.customer_attitude, v.next_action,
        v.created_by, v.created_at, v.updated_at
      FROM visits v
      JOIN customers c ON c.id = v.customer_id
      WHERE v.deleted_at IS NULL AND c.deleted_at IS NULL
      ORDER BY v.occurred_at DESC;
    `);
  }

  return {
    listCustomers,
    listContacts,
    listVisits,
    getCustomerFilterOptions,
    getCustomerBundle,
    saveCustomer,
    deleteCustomer,
    saveContact,
    deleteContact,
    saveVisit,
    deleteVisit,
    getCalendarMonthSummary,
    getCalendarDayDetail,
    saveVisitPlan,
    cancelVisitPlan,
    completeVisitPlan,
    getDashboard,
    listCustomersForExport,
    listContactsForExport,
    listVisitsForExport
  };
}

module.exports = {
  createRepository
};
