const UNKNOWN_VALUE = '未知，待人为补充';

const CUSTOMER_FIELDS = [
  ['name', '客户名称', true],
  ['short_name', '客户简称', false],
  ['industry', '行业', false],
  ['region', '区域', false],
  ['address', '地址', false],
  ['phone', '电话', false],
  ['website', '网站', false],
  ['status', '客户状态', false],
  ['importance_level', '重要等级', false],
  ['owner_name', '负责人', false],
  ['tags', '标签', false],
  ['main_products', '主要产品信息', false],
  ['background', '客户背景', false],
  ['notes', '备注', false]
];

const CONTACT_FIELDS = [
  ['customer_name', '所属客户', true],
  ['name', '姓名', true],
  ['gender', '性别', false],
  ['native_place', '户籍信息', false],
  ['department', '部门', false],
  ['title', '职位', false],
  ['phone', '电话', false],
  ['email', '邮箱', false],
  ['wechat', '微信', false],
  ['education', '学历', false],
  ['major', '专业背景', false],
  ['career_history', '过往任职经历', false],
  ['relationship_status', '关系状态', false],
  ['communication_preference', '沟通偏好', false],
  ['decision_role', '决策角色', false],
  ['influence_level', '影响力', false],
  ['personal_interests', '个人兴趣', false],
  ['next_topics', '下次可提及话题', false],
  ['notes', '备注', false]
];

const VISIT_FIELDS = [
  ['customer_name', '所属客户', true],
  ['type', '拜访类型', false],
  ['subject', '拜访主题', true],
  ['occurred_at', '发生时间', true],
  ['location', '地点', false],
  ['participants', '参与联系人', false],
  ['summary', '摘要', false],
  ['details', '详细内容', false],
  ['customer_attitude', '客户态度', false],
  ['next_action', '下一步动作', false],
  ['created_by', '记录人', false]
];

function extractDrafts(transcript, context = {}) {
  const text = normalizeText(transcript);
  const sentences = splitSentences(text);
  const customerCandidates = findCustomerCandidates(text, context.customers || []);
  const matchedCustomer = customerCandidates[0] || null;
  const customerName = matchedCustomer?.name || findCustomerName(text);
  const contacts = findContacts(text);
  const primaryContact = contacts[0] || emptyContact();
  const visit = findVisit(text, sentences);
  const region = findRegion(text);
  const industry = findIndustry(text);
  const now = new Date().toISOString();

  const customerValues = {
    name: customerName,
    short_name: matchedCustomer?.short_name || '',
    industry,
    region,
    address: findLabeledValue(text, ['地址', '地点']),
    phone: findPhone(text),
    website: findWebsite(text),
    status: '',
    importance_level: '',
    owner_name: '',
    tags: industry || region ? [industry, region].filter(Boolean).join(', ') : '',
    main_products: pickEvidence(sentences, ['产品', '主营', '主要做', '生产', '产线']),
    background: pickEvidence(sentences, ['背景', '产线', '设备', '需求', '规模']),
    notes: ''
  };

  const contactValuesList = contacts.length ? contacts.map((contact) => ({
    customer_name: customerName,
    name: contact.name,
    gender: '',
    native_place: findNativePlace(text),
    department: contact.department,
    title: contact.title,
    phone: findPhone(text),
    email: findEmail(text),
    wechat: findWechat(text),
    education: '',
    major: '',
    career_history: '',
    relationship_status: findRelationship(text),
    communication_preference: findCommunicationPreference(text),
    decision_role: contact.decisionRole,
    influence_level: contact.influenceLevel,
    personal_interests: pickEvidence(sentences, ['兴趣', '喜欢', '爱好']),
    next_topics: pickEvidence(sentences, ['下次', '下回', '下次可以', '再聊']),
    notes: contact.evidence
  })) : [{
    customer_name: customerName,
    name: '',
    gender: '',
    native_place: findNativePlace(text),
    department: '',
    title: '',
    phone: findPhone(text),
    email: findEmail(text),
    wechat: findWechat(text),
    education: '',
    major: '',
    career_history: '',
    relationship_status: findRelationship(text),
    communication_preference: findCommunicationPreference(text),
    decision_role: '',
    influence_level: '',
    personal_interests: pickEvidence(sentences, ['兴趣', '喜欢', '爱好']),
    next_topics: pickEvidence(sentences, ['下次', '下回', '下次可以', '再聊']),
    notes: ''
  }];

  const visitValues = {
    customer_name: customerName,
    type: visit.type,
    subject: visit.subject,
    occurred_at: visit.occurredAt,
    location: visit.location,
    participants: contacts.map((contact) => contact.name).filter(Boolean).join(', ') || primaryContact.name,
    summary: visit.summary,
    details: text,
    customer_attitude: findCustomerAttitude(text),
    next_action: findNextAction(text),
    created_by: ''
  };

  const drafts = [
    buildDraft('customer', '客户草稿', customerValues, CUSTOMER_FIELDS, matchedCustomer),
    ...contactValuesList.map((contactValues, index) =>
      buildDraft('contact', contactValuesList.length > 1 ? `联系人草稿 ${index + 1}` : '联系人草稿', contactValues, CONTACT_FIELDS, null, `contact-${index + 1}`)
    ),
    buildDraft('visit', '拜访记录草稿', visitValues, VISIT_FIELDS)
  ];

  return {
    generated_at: now,
    source: 'local_rule_internal_validation',
    source_label: '本地规则抽取，内部验证版',
    unknown_value: UNKNOWN_VALUE,
    transcript_length: text.length,
    matched_customer: matchedCustomer ? {
      id: matchedCustomer.id,
      name: matchedCustomer.name,
      short_name: matchedCustomer.short_name || ''
    } : null,
    customer_candidates: customerCandidates,
    drafts
  };
}

function normalizeModelDrafts(payload, context = {}) {
  const text = normalizeText(context.transcript || '');
  const customers = context.customers || [];
  const customerValues = payload.customer || {};
  const contactValuesList = normalizeContactPayloads(payload);
  const primaryContactValues = contactValuesList[0] || {};
  const visitValues = payload.visit || {};
  const customerEvidenceText = [
    customerValues.name,
    customerValues.short_name,
    primaryContactValues.customer_name,
    visitValues.customer_name,
    text
  ].filter(Boolean).join('\n');
  const customerCandidates = findCustomerCandidates(customerEvidenceText, customers, customerValues);
  const matchedCustomer = customerCandidates[0] || null;

  if (!customerValues.name && matchedCustomer?.name) {
    customerValues.name = matchedCustomer.name;
  }
  contactValuesList.forEach((contactValues) => {
    if (!contactValues.customer_name && customerValues.name) {
      contactValues.customer_name = customerValues.name;
    }
  });
  if (!visitValues.customer_name && customerValues.name) {
    visitValues.customer_name = customerValues.name;
  }
  if (!visitValues.participants) {
    visitValues.participants = contactValuesList.map((contact) => contact.name).filter(Boolean).join(', ');
  }
  if (!visitValues.details) {
    visitValues.details = text;
  }

  const drafts = [
    buildDraft('customer', '客户草稿', customerValues, CUSTOMER_FIELDS, matchedCustomer),
    ...contactValuesList.map((contactValues, index) =>
      buildDraft('contact', contactValuesList.length > 1 ? `联系人草稿 ${index + 1}` : '联系人草稿', contactValues, CONTACT_FIELDS, null, `contact-${index + 1}`)
    ),
    buildDraft('visit', '拜访记录草稿', visitValues, VISIT_FIELDS)
  ];

  return {
    generated_at: new Date().toISOString(),
    source: context.source || 'model_structured_extraction',
    source_label: context.sourceLabel || '大模型结构化抽取',
    unknown_value: UNKNOWN_VALUE,
    transcript_length: text.length,
    matched_customer: matchedCustomer ? {
      id: matchedCustomer.id,
      name: matchedCustomer.name,
      short_name: matchedCustomer.short_name || ''
    } : null,
    customer_candidates: customerCandidates,
    drafts
  };
}

function normalizeText(value) {
  return String(value || '').replace(/\r/g, '\n').replace(/[ \t]+/g, ' ').trim();
}

function splitSentences(text) {
  return text.split(/[。！？!?；;\n]+/).map((item) => item.trim()).filter(Boolean);
}

function normalizeContactPayloads(payload = {}) {
  if (Array.isArray(payload.contacts)) {
    const contacts = payload.contacts.filter((contact) => contact && typeof contact === 'object');
    if (contacts.length) {
      return contacts;
    }
  }
  if (payload.contact && typeof payload.contact === 'object') {
    return [payload.contact];
  }
  return [{}];
}

function buildDraft(type, title, values, fieldDefinitions, matchedCustomer = null, draftId = type) {
  const fields = fieldDefinitions.map(([key, label, required]) => {
    const rawValue = values[key];
    const missing = rawValue === undefined || rawValue === null || String(rawValue).trim() === '';
    return {
      key,
      label,
      required,
      value: missing ? UNKNOWN_VALUE : String(rawValue).trim(),
      missing,
      confidence: missing ? 'low' : confidenceFor(key, rawValue),
      evidence: missing ? '' : String(rawValue).trim()
    };
  });
  const validationErrors = fields
    .filter((field) => field.required && field.missing)
    .map((field) => `${field.label}缺失`);

  return {
    draft_id: draftId,
    type,
    title,
    status: validationErrors.length ? 'needs_human_input' : 'ready_for_review',
    confidence: validationErrors.length ? 'low' : 'medium',
    matched_existing_id: matchedCustomer?.id || '',
    fields,
    validation_errors: validationErrors
  };
}

function confidenceFor(key, value) {
  if (!value) {
    return 'low';
  }
  if (['details', 'summary', 'background', 'notes', 'main_products'].includes(key)) {
    return 'medium';
  }
  return 'high';
}

function findMatchedCustomer(text, customers) {
  return findCustomerCandidates(text, customers)[0] || null;
}

function findCustomerCandidates(text, customers, extractedCustomer = {}) {
  const evidence = normalizeCandidateText([
    text,
    extractedCustomer.name,
    extractedCustomer.short_name,
    extractedCustomer.industry,
    extractedCustomer.region
  ].filter(Boolean).join('\n'));
  if (!evidence) {
    return [];
  }

  return (customers || [])
    .map((customer) => scoreCustomerCandidate(customer, evidence, extractedCustomer))
    .filter((candidate) => candidate.score >= 60)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'zh-CN'))
    .slice(0, 5);
}

function scoreCustomerCandidate(customer, evidence, extractedCustomer = {}) {
  const names = [
    { value: customer.name, label: '客户全称' },
    { value: customer.short_name, label: '客户简称' }
  ].filter((item) => item.value);
  const extractedNames = [extractedCustomer.name, extractedCustomer.short_name].filter(Boolean).map(normalizeCandidateText);
  let score = 0;
  const reasons = [];

  names.forEach(({ value, label }) => {
    const normalizedName = normalizeCandidateText(value);
    if (!normalizedName) {
      return;
    }
    if (evidence.includes(normalizedName)) {
      const points = label === '客户全称' ? 100 : 82;
      if (points > score) {
        score = points;
      }
      reasons.push(`原文包含${label}`);
    }
    extractedNames.forEach((extractedName) => {
      if (!extractedName) {
        return;
      }
      if (extractedName === normalizedName) {
        score = Math.max(score, 96);
        reasons.push(`抽取名称与${label}一致`);
      } else if (extractedName.includes(normalizedName) || normalizedName.includes(extractedName)) {
        const overlapScore = Math.min(extractedName.length, normalizedName.length) >= 4 ? 74 : 58;
        score = Math.max(score, overlapScore);
        reasons.push(`抽取名称与${label}部分重合`);
      }
    });
  });

  if (customer.industry && evidence.includes(normalizeCandidateText(customer.industry))) {
    score += score ? 4 : 0;
    reasons.push('行业一致');
  }
  if (customer.region && evidence.includes(normalizeCandidateText(customer.region))) {
    score += score ? 4 : 0;
    reasons.push('区域一致');
  }

  return {
    id: customer.id,
    name: customer.name,
    short_name: customer.short_name || '',
    industry: customer.industry || '',
    region: customer.region || '',
    score: Math.min(score, 100),
    match_level: score >= 90 ? 'high' : score >= 75 ? 'medium' : 'low',
    reason: [...new Set(reasons)].join('、') || '名称相似'
  };
}

function normalizeCandidateText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[，。；、,.()（）\-_/\\]/g, '');
}

function findCustomerName(text) {
  const labeled = findStrictLabeledValue(text, ['客户名称', '公司名称', '单位名称']);
  if (labeled) {
    return cleanupName(labeled);
  }

  const match = text.match(/([\u4e00-\u9fa5A-Za-z0-9（）()\-]{2,40}(?:有限公司|股份有限公司|科技公司|电子公司|半导体|设备厂|制造厂|集团|公司))/);
  return match ? cleanupName(match[1]) : '';
}

function cleanupName(value) {
  return String(value || '')
    .replace(/^(是|为|叫|在|和|与)/, '')
    .replace(/[，。；、\s].*$/, '')
    .trim();
}

function emptyContact() {
  return {
    name: '',
    title: '',
    department: '',
    decisionRole: '',
    influenceLevel: '',
    evidence: ''
  };
}

function findContacts(text) {
  const contactPattern = /(?:([\u4e00-\u9fa5]{2,8}部|[\u4e00-\u9fa5]{2,8}中心|[\u4e00-\u9fa5]{2,8}部门))?([\u4e00-\u9fa5]{1,4})(总经理|副总|总监|经理|主任|主管|工程师|负责人|老板|总|工)/g;
  const contacts = [];
  let match;
  while ((match = contactPattern.exec(text)) !== null) {
    const [, department = '', namePart, title] = match;
    const name = cleanupContactName(`${namePart}${title}`);
    if (!name || contacts.some((contact) => contact.name === name)) {
      continue;
    }
    const sentence = splitSentences(text).find((item) => item.includes(name)) || '';
    contacts.push({
      name,
      title: normalizeContactTitle(title),
      department: department || findDepartment(sentence),
      decisionRole: /决策|拍板|负责人|老板|总经理|总监|总/.test(sentence || name) ? '决策影响人' : '',
      influenceLevel: /决策|拍板|老板|总经理|总监|总/.test(sentence || name) ? '5' : '',
      evidence: sentence
    });
  }

  if (!contacts.length) {
    const labeled = findLabeledValue(text, ['联系人', '关键人', '对接人', '参会人']);
    if (labeled) {
      contacts.push({
        ...emptyContact(),
        name: cleanupContactName(labeled),
        department: findDepartment(text),
        evidence: pickEvidence(splitSentences(text), ['联系人', '关键人', '对接人', '参会人'])
      });
    }
  }

  return contacts;
}

function normalizeContactTitle(title) {
  if (title === '工') {
    return '工程师';
  }
  if (title === '总') {
    return '负责人';
  }
  return title;
}

function cleanupContactName(value) {
  return String(value || '')
    .replace(/^(可能是|应该是|大概是|是|为|叫)/, '')
    .replace(/^(联系人|关键人|对接人|参会人)/, '')
    .replace(/[，。；、\s].*$/, '')
    .trim();
}

function findDepartment(text) {
  const departments = ['采购部', '设备部', '工程部', '生产部', '技术部', '研发部', '制造部', '工艺部', '财务部'];
  return departments.find((department) => text.includes(department)) || '';
}

function findVisit(text, sentences) {
  const occurredAt = findDateTime(text);
  const location = findLabeledValue(text, ['地点', '会议地点', '拜访地点']) || (/线上|视频会议|电话会议/.test(text) ? '线上会议' : '');
  const type = /电话沟通|通话|打电话|电话会议/.test(text) ? '电话' : /微信/.test(text) ? '微信' : /邮件/.test(text) ? '邮件' : '现场拜访';
  const nextAction = findNextAction(text);
  const demandSentence = pickEvidence(sentences, ['需求', '痛点', '设备', '产线', '报价', '方案', '升级']);
  const subject = findLabeledValue(text, ['拜访主题', '主题']) || buildSubject(demandSentence);

  return {
    type,
    subject,
    occurredAt,
    location,
    summary: demandSentence || nextAction || firstUsefulSentence(sentences)
  };
}

function buildSubject(sentence) {
  if (!sentence) {
    return '';
  }
  if (/报价|价格|商务|合同/.test(sentence)) {
    return '商务条件沟通';
  }
  if (/设备|产线|升级|需求|方案/.test(sentence)) {
    return '设备需求沟通';
  }
  return sentence.slice(0, 24);
}

function firstUsefulSentence(sentences) {
  return sentences.find((sentence) => sentence.length >= 8) || '';
}

function findLabeledValue(text, labels) {
  for (const label of labels) {
    const match = text.match(new RegExp(`${label}[：:是为]?\\s*([^。；;\\n，,]{2,60})`));
    if (match) {
      return match[1].trim();
    }
  }
  return '';
}

function findStrictLabeledValue(text, labels) {
  for (const label of labels) {
    const match = text.match(new RegExp(`${label}[：:是为]\\s*([^。；;\\n，,]{2,60})`));
    if (match) {
      return match[1].trim();
    }
  }
  return '';
}

function findDateTime(text) {
  if (/今天|今日/.test(text)) {
    return new Date().toISOString();
  }
  if (/昨天/.test(text)) {
    return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  }
  const match = text.match(/(20\d{2})[年/-](\d{1,2})[月/-](\d{1,2})日?(?:\s*(\d{1,2})[:点](\d{1,2})?)?/);
  if (!match) {
    return '';
  }
  const [, year, month, day, hour = '9', minute = '0'] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function findPhone(text) {
  const match = text.match(/(?:\+?86[-\s]?)?(1[3-9]\d{9})|(?:0\d{2,3}[-\s]?\d{7,8})/);
  return match ? match[0] : '';
}

function findEmail(text) {
  const match = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  return match ? match[0] : '';
}

function findWebsite(text) {
  const match = text.match(/https?:\/\/[^\s，。；]+|www\.[^\s，。；]+/i);
  return match ? match[0] : '';
}

function findWechat(text) {
  return findLabeledValue(text, ['微信', '微信号']);
}

function findNativePlace(text) {
  return findLabeledValue(text, ['户籍', '籍贯', '老家']);
}

function findRegion(text) {
  const regions = ['华东', '华南', '华北', '华中', '西南', '西北', '东北', '苏州', '上海', '深圳', '杭州', '宁波', '嘉兴', '广州', '北京'];
  return regions.find((region) => text.includes(region)) || '';
}

function findIndustry(text) {
  const industries = ['半导体设备', '半导体', '电子制造', '自动化设备', '精密制造', '智能装备', '新能源', '汽车电子', '存储', '光模块'];
  return industries.find((industry) => text.includes(industry)) || '';
}

function findRelationship(text) {
  if (/熟悉|老客户|关系不错|信任/.test(text)) {
    return '熟悉';
  }
  if (/第一次|初次|刚认识/.test(text)) {
    return '已认识';
  }
  if (/风险|不满意|投诉/.test(text)) {
    return '风险';
  }
  return '';
}

function findCommunicationPreference(text) {
  if (/电话/.test(text)) {
    return '电话';
  }
  if (/微信/.test(text)) {
    return '微信';
  }
  if (/邮件|邮箱/.test(text)) {
    return '邮件';
  }
  if (/现场|当面/.test(text)) {
    return '现场沟通';
  }
  return '';
}

function findCustomerAttitude(text) {
  if (/认可|满意|有兴趣|愿意|积极/.test(text)) {
    return '积极';
  }
  if (/犹豫|观望|担心|比较价格/.test(text)) {
    return '观望';
  }
  if (/不满意|拒绝|暂缓|投诉/.test(text)) {
    return '消极';
  }
  return '';
}

function findNextAction(text) {
  const match = text.match(/(?:下一步|后续|下周|明天|会后|需要|请我们|我们要)[^。；;\n]{4,80}/);
  return match ? match[0].trim() : '';
}

function pickEvidence(sentences, keywords) {
  return sentences.find((sentence) => keywords.some((keyword) => sentence.includes(keyword))) || '';
}

module.exports = {
  extractDrafts,
  normalizeModelDrafts,
  UNKNOWN_VALUE
};
