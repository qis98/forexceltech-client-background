const fs = require('node:fs');
const path = require('node:path');
const { extractDrafts, normalizeModelDrafts } = require('./ai-draft-extractor');
const { getEffectiveAiConfig } = require('./app-config');

function timestampForFile() {
  return new Date().toISOString().replaceAll(':', '').replaceAll('.', '-');
}

async function selectAudioFile(databaseStatus) {
  throw new Error('当前 MVP 暂不处理录音文件。请先用其他工具把录音转为文字，再粘贴到智能录入。');
}

async function transcribeAudio(databaseStatus, audioPath) {
  throw new Error('当前 MVP 暂不处理录音转写。请先用其他工具把录音转为文字，再粘贴到智能录入。');
}

async function extractDraftsFromTranscript(databaseStatus, repository, transcript) {
  const context = {
    customers: repository.listCustomers({}),
    contacts: repository.listContacts('')
  };

  let result;
  let warning = '';
  const aiConfig = getEffectiveAiConfig(databaseStatus);
  if (aiConfig.aiMode === 'ollama') {
    try {
      result = await extractDraftsWithOllama(transcript, context, aiConfig);
    } catch (error) {
      warning = `本地模型抽取失败，已改用本地规则：${error.message}`;
      result = extractDrafts(transcript, context);
      result.warning = warning;
    }
  } else {
    result = extractDrafts(transcript, context);
    result.warning = '当前设置为仅本地规则模式，未调用本地模型。';
  }

  fs.mkdirSync(databaseStatus.aiDraftsDir, { recursive: true });
  const draftPath = path.join(databaseStatus.aiDraftsDir, `draft-${timestampForFile()}.json`);
  fs.writeFileSync(draftPath, JSON.stringify(result, null, 2), 'utf8');

  return {
    ...result,
    draft_path: draftPath
  };
}

async function extractDraftsWithOllama(transcript, context, aiConfig) {
  requireOllama(aiConfig);
  const customerHints = (context.customers || [])
    .slice(0, 100)
    .map((customer) => [customer.name, customer.short_name, customer.industry, customer.region].filter(Boolean).join(' / '))
    .join('\n');

  const response = await fetchOllama(aiConfig, '/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: aiConfig.ollamaModel,
      stream: false,
      prompt: [
        '你是销售 CRM 信息抽取助手。',
        '从中文拜访、电话、会议或销售笔记文字中抽取客户、联系人、拜访记录草稿。',
        '严格只输出 JSON，不要输出解释。',
        '不要编造信息。原文没有的信息必须填空字符串。',
        '联系人必须输出 contacts 数组；原文出现几位关键联系人，就输出几项，不要只保留第一位。',
        '客户名称必须尽量保留原文完整称呼，不要自行截短；只有原文确实只有简称时才使用简称。',
        '拜访主题应概括为“客户简称 + 核心事项”，不要只使用测试编号或泛泛标题。',
        '如果文字中没有客户名，不要仅凭行业、区域或联系人猜测客户名，客户名称留空字符串。',
        '已有客户线索只用于帮助识别原文中明确出现的客户，不允许替代原文自行合并客户。',
        '拜访类型只能用以下英文之一：visit, call, wechat, email, internal_note。',
        '',
        `已有客户线索：\n${customerHints || '无'}`,
        '',
        `文字内容：\n${transcript}`
      ].join('\n'),
      format: draftResponseSchema(),
      options: {
        temperature: 0
      }
    })
  });

  const payload = await readJsonResponse(response);
  const content = payload.response;
  if (!content) {
    throw new Error('Ollama 模型未返回结构化内容。');
  }
  const parsed = JSON.parse(content);
  const normalized = normalizeModelDrafts(parsed, {
    transcript,
    customers: context.customers || [],
    source: 'ollama_structured_extraction',
    sourceLabel: `Ollama 本地模型抽取：${aiConfig.ollamaModel}`
  });
  return normalized;
}

function draftResponseSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      customer: { $ref: '#/$defs/customer' },
      contacts: {
        type: 'array',
        items: { $ref: '#/$defs/contact' },
        minItems: 1
      },
      visit: { $ref: '#/$defs/visit' }
    },
    required: ['customer', 'contacts', 'visit'],
    $defs: {
      customer: draftSchema([
        'name', 'short_name', 'industry', 'region', 'address', 'phone', 'website',
        'status', 'importance_level', 'owner_name', 'tags', 'main_products', 'background', 'notes'
      ]),
      contact: draftSchema([
        'customer_name', 'name', 'gender', 'department', 'title', 'phone', 'email', 'wechat',
        'native_place', 'education', 'major', 'career_history', 'relationship_status', 'communication_preference',
        'decision_role', 'influence_level', 'personal_interests', 'next_topics', 'notes'
      ]),
      visit: draftSchema([
        'customer_name', 'type', 'subject', 'occurred_at', 'location', 'participants',
        'summary', 'details', 'customer_attitude', 'next_action', 'created_by'
      ])
    }
  };
}

function draftSchema(keys) {
  return {
    type: 'object',
    additionalProperties: false,
    properties: Object.fromEntries(keys.map((key) => [key, { type: 'string' }])),
    required: keys
  };
}

async function readJsonResponse(response) {
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }
  if (!response.ok) {
    throw new Error(payload.error?.message || payload.message || `HTTP ${response.status}`);
  }
  return payload;
}

async function fetchOllama(aiConfig, pathname, options) {
  try {
    return await fetch(`${aiConfig.ollamaBaseUrl}${pathname}`, options);
  } catch (error) {
    throw new Error(`无法连接 Ollama 服务 ${aiConfig.ollamaBaseUrl}。请确认 Ollama 已启动。`);
  }
}

function requireOllama(aiConfig) {
  if (aiConfig.aiMode !== 'ollama') {
    throw new Error('当前为仅本地规则模式，请先在设置中启用 Ollama 本地模型。');
  }
  if (!aiConfig.ollamaBaseUrl || !aiConfig.ollamaModel) {
    throw new Error('Ollama 服务地址或模型名称未配置。');
  }
}

module.exports = {
  selectAudioFile,
  transcribeAudio,
  extractDraftsFromTranscript
};
