const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const WORK_DIR = path.join(ROOT, 'new-client-development');
const CONFIG_DIR = path.join(WORK_DIR, 'config');
const INPUT_DIR = path.join(WORK_DIR, 'input');
const OUTPUT_DIR = path.join(WORK_DIR, 'output');
const KEYWORDS_PATH = path.join(CONFIG_DIR, 'keyword-library.json');
const SOURCES_PATH = path.join(CONFIG_DIR, 'source-seeds.json');
const MANUAL_SEEDS_PATH = path.join(INPUT_DIR, 'manual-seeds.csv');
const SEARCH_QUERIES_PATH = path.join(OUTPUT_DIR, 'search-queries.csv');
const SEARCH_URLS_PATH = path.join(OUTPUT_DIR, 'search-urls.html');
const RAW_LEADS_PATH = path.join(OUTPUT_DIR, 'raw-leads.json');
const SCORED_LEADS_PATH = path.join(OUTPUT_DIR, 'scored-leads.csv');
const QUALIFIED_LEADS_PATH = path.join(OUTPUT_DIR, 'qualified-leads.csv');
const TOP150_LEADS_PATH = path.join(OUTPUT_DIR, 'top150-leads.csv');
const TOP30_LEADS_PATH = path.join(OUTPUT_DIR, 'top30-leads.csv');

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/126.0 Safari/537.36';

function ensureDirs() {
  for (const dir of [CONFIG_DIR, INPUT_DIR, OUTPUT_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function csvEscape(value) {
  const text = value === undefined || value === null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsv(filePath, rows, headers) {
  const lines = [headers.map(csvEscape).join(',')];
  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header])).join(','));
  }
  fs.writeFileSync(filePath, `\uFEFF${lines.join('\n')}\n`, 'utf8');
}

function parseCsv(text) {
  const rows = [];
  let current = '';
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(current);
      current = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        index += 1;
      }
      row.push(current);
      if (row.some((cell) => cell.trim() !== '')) {
        rows.push(row);
      }
      row = [];
      current = '';
    } else {
      current += char;
    }
  }

  if (current || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map((header) => header.replace(/^\uFEFF/, '').trim());
  return rows.slice(1).map((cells) => {
    const item = {};
    headers.forEach((header, index) => {
      item[header] = (cells[index] || '').trim();
    });
    return item;
  });
}

function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeCompanyName(value) {
  return normalizeWhitespace(value)
    .replace(/[【】\[\]<>《》"'“”‘’]/g, '')
    .replace(/（.*?）/g, '')
    .replace(/\(.*?\)/g, '')
    .trim();
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractCompanyNames(text) {
  const names = new Set();
  const patterns = [
    /[\u4e00-\u9fa5A-Za-z0-9（）()·\-]{2,42}(?:股份有限公司|有限责任公司|集团有限公司|有限公司)/g
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const name = normalizeCompanyName(match[0]);
      if (name.length >= 4 && !/版权所有|主办单位|承办单位|技术支持/.test(name)) {
        names.add(name);
      }
    }
  }
  return [...names];
}

function getWindow(text, keyword, radius = 120) {
  const index = text.indexOf(keyword);
  if (index === -1) {
    return '';
  }
  return text.slice(Math.max(0, index - radius), Math.min(text.length, index + keyword.length + radius));
}

function keywordHits(text, groups) {
  const hits = {};
  for (const [group, words] of Object.entries(groups)) {
    hits[group] = words.filter((word) => text.toLowerCase().includes(String(word).toLowerCase()));
  }
  return hits;
}

function flattenGroups(groups, names) {
  return names.flatMap((name) => groups[name] || []);
}

function generateQueries(keywordLibrary) {
  const groups = keywordLibrary.keywordGroups;
  const regions = keywordLibrary.regions.districts;
  const products = groups.product;
  const processes = groups.process.slice(0, 12);
  const roles = groups.equipmentAndRole.slice(0, 12);
  const events = groups.event;
  const applications = groups.application;
  const templates = keywordLibrary.queryTemplates;
  const queries = new Map();

  for (const region of regions) {
    for (const template of templates) {
      const productPool = products.slice(0, 14);
      const processPool = processes;
      const rolePool = roles;
      const eventPool = events;
      const applicationPool = applications;

      for (const product of productPool) {
        const process = processPool[Math.abs(hash(`${region}${product}${template}`)) % processPool.length];
        const role = rolePool[Math.abs(hash(`${product}${region}${template}`)) % rolePool.length];
        const event = eventPool[Math.abs(hash(`${template}${product}${region}`)) % eventPool.length];
        const application = applicationPool[Math.abs(hash(`${event}${region}${product}`)) % applicationPool.length];
        const query = template
          .replaceAll('{region}', region)
          .replaceAll('{product}', product)
          .replaceAll('{process}', process)
          .replaceAll('{role}', role)
          .replaceAll('{event}', event)
          .replaceAll('{application}', application)
          .replace(/\s+/g, ' ')
          .trim();
        queries.set(query, {
          query,
          region,
          product,
          searchUrl: `https://www.bing.com/search?q=${encodeURIComponent(query)}`
        });
      }
    }
  }

  return [...queries.values()].sort((left, right) => scoreQuery(right.query) - scoreQuery(left.query) || left.query.localeCompare(right.query, 'zh-Hans-CN'));
}

function hash(value) {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) | 0;
  }
  return result;
}

function scoreQuery(query) {
  const text = String(query || '').toLowerCase();
  const strongRegions = ['深圳光明', '深圳宝安', '深圳南山', '东莞松山湖', '惠州仲恺'];
  const advancedTerms = ['800g', '1.6t', 'cpo', '硅光', 'silicon photonics', '光引擎', 'optical engine', 'tosa', 'rosa'];
  const processTerms = ['cob', '裸die', '裸芯片', '微组装', '高频高速互连', '精密贴装', '01005'];
  const buyingTerms = ['招聘', '扩产', '新基地', '中试线', '量产', '产能建设', '设备采购'];
  const equipmentTerms = ['siplace', 'dek', 'asmpt', 'smt工程师', '设备工程师', '工艺工程师', 'npi工程师'];

  let score = 0;
  if (strongRegions.some((term) => query.includes(term))) score += 30;
  if (advancedTerms.some((term) => text.includes(term))) score += 30;
  if (processTerms.some((term) => text.includes(term))) score += 20;
  if (buyingTerms.some((term) => query.includes(term))) score += 20;
  if (equipmentTerms.some((term) => text.includes(term))) score += 20;
  if (/ems|贴片|产线/i.test(query)) score += 10;
  return score;
}

function writeSearchUrlsHtml(queries) {
  const topQueries = queries.slice(0, 240);
  const links = topQueries
    .map((item) => `<li><a href="${item.searchUrl}" target="_blank">${escapeHtml(item.query)}</a></li>`)
    .join('\n');
  const html =
    '<!doctype html>\n' +
    '<meta charset="utf-8">\n' +
    '<title>光通信客户搜索入口</title>\n' +
    '<style>body{font-family:Arial,"Microsoft YaHei",sans-serif;line-height:1.5;max-width:1080px;margin:24px auto;padding:0 16px}li{margin:6px 0}</style>\n' +
    '<h1>光通信客户搜索入口</h1>\n' +
    '<p>这些链接用于人工复核和补充种子客户。自动搜索建议配置 Bing Web Search API 或 SerpApi。</p>\n' +
    `<ol>\n${links}\n</ol>\n`;
  fs.writeFileSync(SEARCH_URLS_PATH, html, 'utf8');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function ensureManualSeedTemplate() {
  if (fs.existsSync(MANUAL_SEEDS_PATH)) {
    return;
  }
  const headers = [
    'companyName',
    'city',
    'district',
    'address',
    'businessDescription',
    'sourceUrl',
    'sourceType',
    'contactSignal',
    'note'
  ];
  writeCsv(MANUAL_SEEDS_PATH, [], headers);
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': USER_AGENT,
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.text();
}

async function collectPublicSources(keywordLibrary, sourcesConfig) {
  const leads = [];
  const groups = keywordLibrary.keywordGroups;
  for (const source of sourcesConfig.publicSources || []) {
    try {
      const html = await fetchText(source.url);
      const text = stripHtml(html);
      const names = extractCompanyNames(text);
      for (const name of names) {
        const context = getWindow(text, name, 180);
        const matchedKeywords = collectMatchedKeywords(`${name} ${context}`, groups);
        if (matchedKeywords.length === 0) {
          continue;
        }
        leads.push({
          companyName: name,
          city: inferCity(`${name} ${context}`, keywordLibrary),
          district: inferDistrict(`${name} ${context}`, keywordLibrary),
          address: '',
          businessDescription: context,
          sourceUrl: source.url,
          sourceType: source.type || 'public',
          sourceName: source.name,
          contactSignal: '',
          matchedKeywords: matchedKeywords.join('|'),
          confidence: 'low'
        });
      }
      if (names.length === 0) {
        continue;
      }
    } catch (error) {
      console.warn(`Fetch failed: ${source.name} ${source.url} ${error.message}`);
    }
  }
  return leads;
}

async function collectSearchApiResults(keywordLibrary, queries) {
  if (process.env.BING_SEARCH_API_KEY) {
    return collectBingResults(keywordLibrary, queries);
  }
  if (process.env.SERPAPI_KEY) {
    return collectSerpApiResults(keywordLibrary, queries);
  }
  if (process.env.BRAVE_SEARCH_API_KEY) {
    return collectBraveResults(keywordLibrary, queries);
  }
  return [];
}

async function collectBingResults(keywordLibrary, queries) {
  const maxQueries = getMaxSearchQueries();
  const selected = queries.slice(0, maxQueries);
  const leads = [];

  for (const item of selected) {
    const url = `https://api.bing.microsoft.com/v7.0/search?mkt=zh-CN&count=10&q=${encodeURIComponent(item.query)}`;
    try {
      const response = await fetch(url, {
        headers: {
          'Ocp-Apim-Subscription-Key': process.env.BING_SEARCH_API_KEY,
          'user-agent': USER_AGENT
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json();
      for (const result of payload.webPages?.value || []) {
        leads.push(...searchResultToLeads(keywordLibrary, item.query, result.name, result.snippet, result.url));
      }
    } catch (error) {
      leads.push({
        companyName: `Bing 搜索失败：${item.query}`,
        city: item.region,
        district: item.region,
        address: '',
        businessDescription: error.message,
        sourceUrl: url,
        sourceType: 'search-error',
        sourceName: 'Bing Web Search API',
        contactSignal: '',
        matchedKeywords: '',
        confidence: 'fetch-failed'
      });
    }
  }

  return leads;
}

async function collectSerpApiResults(keywordLibrary, queries) {
  const maxQueries = getMaxSearchQueries();
  const selected = queries.slice(0, maxQueries);
  const leads = [];

  for (const item of selected) {
    const url =
      `https://serpapi.com/search.json?engine=bing&cc=CN&q=${encodeURIComponent(item.query)}` +
      `&api_key=${encodeURIComponent(process.env.SERPAPI_KEY)}`;
    try {
      const response = await fetch(url, { headers: { 'user-agent': USER_AGENT } });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json();
      for (const result of payload.organic_results || []) {
        leads.push(...searchResultToLeads(keywordLibrary, item.query, result.title, result.snippet, result.link));
      }
    } catch (error) {
      leads.push({
        companyName: `SerpApi 搜索失败：${item.query}`,
        city: item.region,
        district: item.region,
        address: '',
        businessDescription: error.message,
        sourceUrl: url.replace(process.env.SERPAPI_KEY, '<redacted>'),
        sourceType: 'search-error',
        sourceName: 'SerpApi',
        contactSignal: '',
        matchedKeywords: '',
        confidence: 'fetch-failed'
      });
    }
  }

  return leads;
}

async function collectBraveResults(keywordLibrary, queries) {
  const maxQueries = getMaxSearchQueries();
  const selected = queries.slice(0, maxQueries);
  const leads = [];

  for (const item of selected) {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(item.query)}&country=cn&search_lang=zh-hans&count=10`;
    try {
      const response = await fetch(url, {
        headers: {
          accept: 'application/json',
          'accept-encoding': 'gzip',
          'user-agent': USER_AGENT,
          'x-subscription-token': process.env.BRAVE_SEARCH_API_KEY
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json();
      for (const result of payload.web?.results || []) {
        leads.push(...searchResultToLeads(keywordLibrary, item.query, result.title, result.description, result.url));
      }
    } catch (error) {
      leads.push({
        companyName: `Brave 搜索失败：${item.query}`,
        city: item.region,
        district: item.region,
        address: '',
        businessDescription: error.message,
        sourceUrl: url,
        sourceType: 'search-error',
        sourceName: 'Brave Search API',
        contactSignal: '',
        matchedKeywords: '',
        confidence: 'fetch-failed'
      });
    }
  }

  return leads;
}

function getMaxSearchQueries() {
  const value = Number.parseInt(process.env.CLIENT_LEADS_SEARCH_MAX_QUERIES || '60', 10);
  return Number.isFinite(value) && value > 0 ? value : 60;
}

function searchResultToLeads(keywordLibrary, query, title, snippet, url) {
  const text = normalizeWhitespace(`${title || ''} ${snippet || ''}`);
  const names = extractCompanyNames(text);
  const groups = keywordLibrary.keywordGroups;
  if (names.length === 0) {
    return [
      {
        companyName: normalizeWhitespace(title || query).slice(0, 80),
        city: inferCity(text, keywordLibrary),
        district: inferDistrict(text, keywordLibrary),
        address: '',
        businessDescription: snippet || '',
        sourceUrl: url || '',
        sourceType: 'search',
        sourceName: query,
        contactSignal: '',
        matchedKeywords: collectMatchedKeywords(text, groups).join('|'),
        confidence: 'needs-review'
      }
    ];
  }
  return names.map((name) => ({
    companyName: name,
    city: inferCity(`${name} ${text}`, keywordLibrary),
    district: inferDistrict(`${name} ${text}`, keywordLibrary),
    address: '',
    businessDescription: snippet || title || '',
    sourceUrl: url || '',
    sourceType: 'search',
    sourceName: query,
    contactSignal: '',
    matchedKeywords: collectMatchedKeywords(`${name} ${text}`, groups).join('|'),
    confidence: 'medium'
  }));
}

function readManualSeeds(keywordLibrary) {
  ensureManualSeedTemplate();
  const rows = parseCsv(fs.readFileSync(MANUAL_SEEDS_PATH, 'utf8'));
  const groups = keywordLibrary.keywordGroups;
  return rows
    .filter((row) => row.companyName)
    .map((row) => {
      const text = `${row.companyName} ${row.city} ${row.district} ${row.address} ${row.businessDescription} ${row.contactSignal} ${row.note}`;
      return {
        companyName: normalizeCompanyName(row.companyName),
        city: row.city || inferCity(text, keywordLibrary),
        district: row.district || inferDistrict(text, keywordLibrary),
        address: row.address || '',
        businessDescription: row.businessDescription || row.note || '',
        sourceUrl: row.sourceUrl || '',
        sourceType: row.sourceType || 'manual',
        sourceName: 'manual-seeds.csv',
        contactSignal: row.contactSignal || '',
        matchedKeywords: collectMatchedKeywords(text, groups).join('|'),
        confidence: 'manual'
      };
    });
}

function inferCity(text, keywordLibrary) {
  const allCities = [...keywordLibrary.regions.primaryCities, ...keywordLibrary.regions.secondaryCities];
  return allCities.find((city) => text.includes(city)) || '';
}

function inferDistrict(text, keywordLibrary) {
  return keywordLibrary.regions.districts.find((district) => text.includes(district)) || '';
}

function collectMatchedKeywords(text, groups) {
  return Object.values(groups)
    .flat()
    .filter((keyword) => text.toLowerCase().includes(String(keyword).toLowerCase()));
}

function mergeLeads(leads) {
  const byCompany = new Map();

  for (const lead of leads) {
    const companyName = normalizeCompanyName(lead.companyName);
    if (!companyName || /^Bing 搜索失败|^SerpApi 搜索失败/.test(companyName)) {
      continue;
    }
    const key = companyName.toLowerCase();
    const existing = byCompany.get(key);
    const normalized = {
      ...lead,
      companyName,
      businessDescription: normalizeWhitespace(lead.businessDescription),
      sourceUrl: lead.sourceUrl || '',
      sourceType: lead.sourceType || '',
      sourceName: lead.sourceName || '',
      matchedKeywords: normalizeKeywordList(lead.matchedKeywords)
    };

    if (!existing) {
      byCompany.set(key, {
        ...normalized,
        sourceUrls: normalized.sourceUrl ? [normalized.sourceUrl] : [],
        sourceTypes: normalized.sourceType ? [normalized.sourceType] : [],
        sourceNames: normalized.sourceName ? [normalized.sourceName] : []
      });
      continue;
    }

    existing.city ||= normalized.city;
    existing.district ||= normalized.district;
    existing.address ||= normalized.address;
    existing.contactSignal ||= normalized.contactSignal;
    existing.businessDescription = mergeText(existing.businessDescription, normalized.businessDescription, 700);
    existing.matchedKeywords = mergeKeywordStrings(existing.matchedKeywords, normalized.matchedKeywords);
    if (normalized.sourceUrl && !existing.sourceUrls.includes(normalized.sourceUrl)) {
      existing.sourceUrls.push(normalized.sourceUrl);
    }
    if (normalized.sourceType && !existing.sourceTypes.includes(normalized.sourceType)) {
      existing.sourceTypes.push(normalized.sourceType);
    }
    if (normalized.sourceName && !existing.sourceNames.includes(normalized.sourceName)) {
      existing.sourceNames.push(normalized.sourceName);
    }
  }

  return [...byCompany.values()].map((lead) => ({
    ...lead,
    sourceUrl: lead.sourceUrls.join('|'),
    sourceType: lead.sourceTypes.join('|'),
    sourceName: lead.sourceNames.join('|')
  }));
}

function normalizeKeywordList(value) {
  return [...new Set(String(value || '').split('|').map((item) => item.trim()).filter(Boolean))].join('|');
}

function mergeKeywordStrings(left, right) {
  return normalizeKeywordList(`${left || ''}|${right || ''}`);
}

function mergeText(left, right, maxLength) {
  const parts = [left, right].map(normalizeWhitespace).filter(Boolean);
  return [...new Set(parts)].join(' | ').slice(0, maxLength);
}

function scoreLead(lead, keywordLibrary) {
  const groups = keywordLibrary.keywordGroups;
  const scoreConfig = keywordLibrary.scoring;
  const text = `${lead.companyName} ${lead.city} ${lead.district} ${lead.address} ${lead.businessDescription} ${lead.contactSignal} ${lead.matchedKeywords}`;
  const hits = keywordHits(text, groups);
  const scoreParts = {
    businessFit: proportionalScore(hits.product.length, 4, scoreConfig.businessFit),
    processComplexity: proportionalScore(hits.process.length, 3, scoreConfig.processComplexity),
    buyingTrigger: proportionalScore(hits.event.length, 3, scoreConfig.buyingTrigger),
    geoConvenience: geoScore(text, keywordLibrary, scoreConfig.geoConvenience),
    payingAbility: payingAbilityScore(text, groups, scoreConfig.payingAbility),
    contactReachability: contactScore(text, groups, scoreConfig.contactReachability),
    bonus: 0,
    penalty: 0
  };

  const asmptStack = ['SIPLACE', 'DEK', 'ASMPT'].some((word) => text.toLowerCase().includes(word.toLowerCase()));
  if (asmptStack) {
    scoreParts.bonus += scoreConfig.bonus.asmptStack;
  }

  const advancedProduct = ['800G', '1.6T', 'CPO', '硅光', 'Silicon Photonics', '光引擎'].some((word) =>
    text.toLowerCase().includes(word.toLowerCase())
  );
  if (advancedProduct) {
    scoreParts.bonus += scoreConfig.bonus.advancedProduct;
  }

  const capacityEvent = ['扩产', '新基地', '中试线', '量产', '产能建设', '设备采购'].some((word) => text.includes(word));
  if (capacityEvent) {
    scoreParts.bonus += scoreConfig.bonus.capacityEvent;
  }

  if (hits.customerChain.length > 0) {
    scoreParts.bonus += scoreConfig.bonus.customerChain;
  }

  const hasOnlyWeakBusiness =
    hits.weakSignals.length > 0 && hits.product.length === 0 && hits.process.length === 0 && hits.equipmentAndRole.length === 0;
  if (hasOnlyWeakBusiness) {
    scoreParts.penalty += scoreConfig.penalty.weakBusinessOnly;
  }

  const total = Math.max(
    0,
    Math.min(
      100,
      scoreParts.businessFit +
        scoreParts.processComplexity +
        scoreParts.buyingTrigger +
        scoreParts.geoConvenience +
        scoreParts.payingAbility +
        scoreParts.contactReachability +
        scoreParts.bonus -
        scoreParts.penalty
    )
  );

  return {
    total,
    scoreParts,
    hits
  };
}

function proportionalScore(count, fullCount, maxScore) {
  return Math.min(maxScore, Math.round((count / fullCount) * maxScore));
}

function geoScore(text, keywordLibrary, maxScore) {
  if (keywordLibrary.regions.primaryCities.some((city) => text.includes(city))) {
    return maxScore;
  }
  if (keywordLibrary.regions.secondaryCities.some((city) => text.includes(city))) {
    return Math.round(maxScore * 0.6);
  }
  return 0;
}

function payingAbilityScore(text, groups, maxScore) {
  const terms = ['融资', 'A轮', 'B轮', '上市', '集团', '资本', '产能建设', ...groups.customerChain];
  const count = terms.filter((term) => text.toLowerCase().includes(String(term).toLowerCase())).length;
  return proportionalScore(count, 2, maxScore);
}

function contactScore(text, groups, maxScore) {
  const contactTerms = flattenGroups(groups, ['equipmentAndRole']).concat(['采购', '制造经理', '生产经理', 'SMT主管']);
  const count = contactTerms.filter((term) => text.toLowerCase().includes(String(term).toLowerCase())).length;
  return proportionalScore(count, 2, maxScore);
}

function classifyLead(lead, hits) {
  const text = `${lead.companyName} ${lead.businessDescription} ${lead.matchedKeywords}`;
  if (hits.product.some((word) => /硅光|Silicon Photonics|光引擎|CPO|800G|1\.6T/i.test(word))) {
    return 'B类-NPI研发/先进光模块';
  }
  if (hits.process.length > 0 && /EMS|代工|贴片|SMT|PCBA/i.test(text)) {
    return 'C类-EMS代工/制造服务';
  }
  if (hits.event.length > 0 && hits.product.length > 0) {
    return 'A类-量产扩产型';
  }
  if (/SPI|AOI|锡膏|夹治具|测试|点胶|回流焊/.test(text)) {
    return 'D类-供应链情报入口';
  }
  if (hits.product.length > 0 || hits.process.length > 0) {
    return '待复核-光通信相关';
  }
  return '待复核-弱相关';
}

function buildReason(lead, score, type) {
  const reasons = [];
  if (score.hits.product.length > 0) {
    reasons.push(`产品:${score.hits.product.slice(0, 4).join('/')}`);
  }
  if (score.hits.process.length > 0) {
    reasons.push(`工艺:${score.hits.process.slice(0, 3).join('/')}`);
  }
  if (score.hits.event.length > 0) {
    reasons.push(`触发:${score.hits.event.slice(0, 3).join('/')}`);
  }
  if (lead.district || lead.city) {
    reasons.push(`地区:${lead.district || lead.city}`);
  }
  reasons.unshift(type);
  return reasons.join('；');
}

async function commandQueries() {
  ensureDirs();
  const keywordLibrary = readJson(KEYWORDS_PATH);
  const queries = generateQueries(keywordLibrary);
  writeCsv(SEARCH_QUERIES_PATH, queries, ['query', 'region', 'product', 'searchUrl']);
  writeSearchUrlsHtml(queries);
  console.log(`Generated ${queries.length} search queries.`);
  console.log(SEARCH_QUERIES_PATH);
  console.log(SEARCH_URLS_PATH);
}

async function commandCollect() {
  ensureDirs();
  ensureManualSeedTemplate();
  const keywordLibrary = readJson(KEYWORDS_PATH);
  const sourcesConfig = readJson(SOURCES_PATH);
  const queries = fs.existsSync(SEARCH_QUERIES_PATH)
    ? parseCsv(fs.readFileSync(SEARCH_QUERIES_PATH, 'utf8'))
    : generateQueries(keywordLibrary);
  const publicLeads = await collectPublicSources(keywordLibrary, sourcesConfig);
  const apiLeads = await collectSearchApiResults(keywordLibrary, queries);
  const manualLeads = readManualSeeds(keywordLibrary);
  const merged = mergeLeads([...publicLeads, ...apiLeads, ...manualLeads]);
  writeJson(RAW_LEADS_PATH, {
    generatedAt: new Date().toISOString(),
    searchApi: process.env.BING_SEARCH_API_KEY ? 'bing' : process.env.SERPAPI_KEY ? 'serpapi' : 'none',
    count: merged.length,
    leads: merged
  });
  console.log(`Collected ${merged.length} raw leads.`);
  console.log(RAW_LEADS_PATH);
  if (!process.env.BING_SEARCH_API_KEY && !process.env.SERPAPI_KEY) {
    console.log('No search API key detected. Public sources and manual seeds were used only.');
  }
}

async function commandImport() {
  ensureDirs();
  ensureManualSeedTemplate();
  const keywordLibrary = readJson(KEYWORDS_PATH);
  const manualLeads = mergeLeads(readManualSeeds(keywordLibrary));
  writeJson(RAW_LEADS_PATH, {
    generatedAt: new Date().toISOString(),
    searchApi: 'manual-import-only',
    count: manualLeads.length,
    leads: manualLeads
  });
  console.log(`Imported ${manualLeads.length} manual seed leads.`);
  console.log(RAW_LEADS_PATH);
  await commandScore();
}

async function commandScore() {
  ensureDirs();
  const keywordLibrary = readJson(KEYWORDS_PATH);
  if (!fs.existsSync(RAW_LEADS_PATH)) {
    throw new Error(`Missing raw leads file. Run client-leads:collect first: ${RAW_LEADS_PATH}`);
  }
  const payload = readJson(RAW_LEADS_PATH);
  const scored = payload.leads
    .map((lead) => {
      const score = scoreLead(lead, keywordLibrary);
      const leadType = classifyLead(lead, score.hits);
      return {
        companyName: lead.companyName,
        city: lead.city,
        district: lead.district,
        leadType,
        score: score.total,
        reason: buildReason(lead, score, leadType),
        matchedKeywords: normalizeKeywordList(lead.matchedKeywords),
        sourceType: lead.sourceType,
        sourceName: lead.sourceName,
        sourceUrl: lead.sourceUrl,
        contactSignal: lead.contactSignal,
        businessDescription: lead.businessDescription,
        confidence: lead.confidence || ''
      };
    })
    .sort((left, right) => right.score - left.score || left.companyName.localeCompare(right.companyName, 'zh-Hans-CN'));

  const headers = [
    'companyName',
    'city',
    'district',
    'leadType',
    'score',
    'reason',
    'matchedKeywords',
    'sourceType',
    'sourceName',
    'sourceUrl',
    'contactSignal',
    'businessDescription',
    'confidence'
  ];
  const qualifiedLeads = scored
    .filter((lead) => lead.score >= 50 && !lead.leadType.includes('弱相关'))
  const top150Leads = qualifiedLeads.slice(0, 150);
  const topLeads = qualifiedLeads.slice(0, 30);
  writeCsv(SCORED_LEADS_PATH, scored, headers);
  writeCsv(QUALIFIED_LEADS_PATH, qualifiedLeads, headers);
  writeCsv(TOP150_LEADS_PATH, top150Leads, headers);
  writeCsv(TOP30_LEADS_PATH, topLeads, headers);
  console.log(`Scored ${scored.length} leads.`);
  console.log(SCORED_LEADS_PATH);
  console.log(QUALIFIED_LEADS_PATH);
  console.log(TOP150_LEADS_PATH);
  console.log(TOP30_LEADS_PATH);
}

async function commandRun() {
  await commandQueries();
  await commandCollect();
  await commandScore();
}

async function main() {
  const command = process.argv[2];
  try {
    if (command === 'queries') {
      await commandQueries();
    } else if (command === 'collect') {
      await commandCollect();
    } else if (command === 'import') {
      await commandImport();
    } else if (command === 'score') {
      await commandScore();
    } else if (command === 'run') {
      await commandRun();
    } else {
      console.error('Usage: node scripts/client-leads.js <queries|collect|import|score|run>');
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}

main();
