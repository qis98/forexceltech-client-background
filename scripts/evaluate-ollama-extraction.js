const fs = require('node:fs');
const path = require('node:path');
const { initializeDatabase } = require('../src/main/database');
const { createRepository } = require('../src/main/repository');
const { extractDraftsFromTranscript } = require('../src/main/ai-actions');

const samples = [
  {
    id: 'sample-01',
    text: '2026年6月21日上午，我拜访了Ollama评估样本-苏州封装设备有限公司，客户在苏州，属于半导体封装测试行业。参会人有生产设备部赵经理和工艺工程师孙工。赵经理关注交期、稳定性和售后响应；孙工反馈贴装段良率波动，希望了解精度补偿和节拍优化案例。下一步下周二前发送技术方案、配置清单和初步报价。',
    expectedCustomer: 'Ollama评估样本-苏州封装设备有限公司',
    expectedContacts: ['赵经理', '孙工'],
    expectedKeywords: ['技术方案', '配置清单', '初步报价']
  },
  {
    id: 'sample-02',
    text: '今天电话沟通了宁波华芯电子，客户属于汽车电子行业。采购负责人李经理主要问价格和交期，设备部王工补充说现有线体节拍不稳定，想看我们高速贴装方案。客户态度观望，要求周五前给两档报价。',
    expectedCustomer: '宁波华芯电子',
    expectedContacts: ['李经理', '王工'],
    expectedKeywords: ['报价']
  },
  {
    id: 'sample-03',
    text: '6月20日到上海精密制造拜访，地点在客户二楼会议室。张总负责拍板，周主任负责技术评估。客户准备升级检测设备，重点关注稳定性、售后和付款条件。下一步约下周三线上技术评审。',
    expectedCustomer: '上海精密制造',
    expectedContacts: ['张总', '周主任'],
    expectedKeywords: ['技术评审']
  },
  {
    id: 'sample-04',
    text: '同事转述：杭州新能智造的陈经理最近在看新能源产线自动化设备，工艺部刘工关注换型速度。客户没有明确预算，但希望先拿一份案例资料。下一步我负责发案例和典型配置。',
    expectedCustomer: '杭州新能智造',
    expectedContacts: ['陈经理', '刘工'],
    expectedKeywords: ['案例', '配置']
  },
  {
    id: 'sample-05',
    text: '微信沟通嘉兴电子，联系人是采购部沈经理。客户反馈旧设备维护成本高，想比较国产替代方案。沈经理让我们下周一前发报价，另外抄送技术部黄工确认规格。',
    expectedCustomer: '嘉兴电子',
    expectedContacts: ['沈经理', '黄工'],
    expectedKeywords: ['报价', '规格']
  },
  {
    id: 'sample-06',
    text: '上午拜访深圳先进微电子有限公司，区域华南，行业半导体。设备负责人林工说明新厂一期还在规划，采购总监何总关注付款方式和服务网点。下一步先给设备清单和华南案例。',
    expectedCustomer: '深圳先进微电子有限公司',
    expectedContacts: ['林工', '何总'],
    expectedKeywords: ['设备清单', '案例']
  },
  {
    id: 'sample-07',
    text: '客户名称：北京北方自动化设备厂。今天现场拜访，联系人王总和项目经理马经理都在。客户想改造老线，重点是减少人工和提升节拍。会后需要整理改造方案和投资回收测算。',
    expectedCustomer: '北京北方自动化设备厂',
    expectedContacts: ['王总', '马经理'],
    expectedKeywords: ['改造方案', '投资回收']
  },
  {
    id: 'sample-08',
    text: '电话会议：武汉精测科技。参会人包括技术部邓工、采购部罗经理。邓工要求确认精度参数，罗经理关注交期和付款节点。客户态度积极，希望月底前完成技术确认。',
    expectedCustomer: '武汉精测科技',
    expectedContacts: ['邓工', '罗经理'],
    expectedKeywords: ['技术确认']
  },
  {
    id: 'sample-09',
    text: '今天去无锡芯联半导体，客户属于半导体设备行业。主要和设备部许经理沟通备件和维护问题，另有质量部高工提到良率追溯需求。下一步准备维护方案和质量追溯案例。',
    expectedCustomer: '无锡芯联半导体',
    expectedContacts: ['许经理', '高工'],
    expectedKeywords: ['维护方案', '质量追溯']
  },
  {
    id: 'sample-10',
    text: '邮件往来：常州智能装备有限公司，联系人财务部钱经理、生产部孙主管。钱经理询问付款账期，孙主管要求确认交付周期。客户对方案认可，但希望价格再优化。',
    expectedCustomer: '常州智能装备有限公司',
    expectedContacts: ['钱经理', '孙主管'],
    expectedKeywords: ['付款账期', '交付周期', '价格']
  },
  {
    id: 'sample-11',
    text: '客户简称可能只说了“东莞智造”，全称是东莞智造电子科技有限公司。拜访对象是老板刘总和工程部谢工。刘总关注整体投入，谢工关注设备接口。下一步安排样机测试。',
    expectedCustomer: '东莞智造电子科技有限公司',
    expectedContacts: ['刘总', '谢工'],
    expectedKeywords: ['样机测试']
  },
  {
    id: 'sample-12',
    text: '内部记录：南京精密电子上周反馈新产线有扩产计划。采购部顾经理要预算报价，设备工程师韩工要技术参数表。客户暂时未定供应商，要求我们两天内补齐资料。',
    expectedCustomer: '南京精密电子',
    expectedContacts: ['顾经理', '韩工'],
    expectedKeywords: ['预算报价', '技术参数表']
  }
];

function fieldsOf(draft) {
  return Object.fromEntries((draft?.fields || []).map((field) => [field.key, field.value]));
}

function includesAny(text, values) {
  return values.some((value) => String(text || '').includes(value));
}

function scoreSample(result, sample, elapsedMs) {
  const customer = fieldsOf(result.drafts.find((draft) => draft.type === 'customer'));
  const contacts = result.drafts.filter((draft) => draft.type === 'contact').map(fieldsOf);
  const visit = fieldsOf(result.drafts.find((draft) => draft.type === 'visit'));
  const contactText = contacts.map((contact) => Object.values(contact).join(' ')).join(' ');
  const visitText = Object.values(visit).join(' ');
  const customerName = customer.name || '';
  const expectedContactHits = sample.expectedContacts.filter((name) => contactText.includes(name));

  return {
    id: sample.id,
    source: result.source,
    elapsedMs,
    customerName,
    customerExactOrContains: customerName.includes(sample.expectedCustomer) || sample.expectedCustomer.includes(customerName),
    contactDraftCount: contacts.length,
    expectedContactCount: sample.expectedContacts.length,
    expectedContactHits,
    allExpectedContactsFound: expectedContactHits.length === sample.expectedContacts.length,
    subject: visit.subject || '',
    nextAction: visit.next_action || '',
    nextActionHit: includesAny(visitText, sample.expectedKeywords),
    draftPath: result.draft_path
  };
}

async function main() {
  const databaseStatus = initializeDatabase();
  const repository = createRepository(databaseStatus.dbPath);
  const rows = [];

  for (const sample of samples) {
    const started = Date.now();
    const result = await extractDraftsFromTranscript(databaseStatus, repository, sample.text);
    rows.push(scoreSample(result, sample, Date.now() - started));
    console.log(`[${sample.id}] ${rows[rows.length - 1].source} ${rows[rows.length - 1].elapsedMs}ms`);
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    sampleCount: rows.length,
    ollamaCount: rows.filter((row) => row.source === 'ollama_structured_extraction').length,
    customerAccuracy: rows.filter((row) => row.customerExactOrContains).length,
    allContactsFound: rows.filter((row) => row.allExpectedContactsFound).length,
    nextActionHit: rows.filter((row) => row.nextActionHit).length,
    averageElapsedMs: Math.round(rows.reduce((sum, row) => sum + row.elapsedMs, 0) / rows.length),
    rows
  };

  const reportPath = path.join(databaseStatus.baseDir, 'ai-drafts', `ollama-eval-${new Date().toISOString().replaceAll(':', '').replaceAll('.', '-')}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2), 'utf8');
  console.log(JSON.stringify({ reportPath, summary: { ...summary, rows: undefined } }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
