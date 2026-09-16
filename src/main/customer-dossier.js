const fs = require('node:fs');
const path = require('node:path');
const { BrowserWindow } = require('electron');

function timestampForFile() {
  return new Date().toISOString().slice(0, 10).replaceAll('-', '');
}

async function exportCustomerDossier(databaseStatus, repository, options = {}) {
  const customerId = options.customerId;
  if (!customerId) {
    throw new Error('未选择要导出的客户。');
  }
  const bundle = repository.getCustomerBundle(customerId);
  if (!bundle?.customer) {
    throw new Error('未找到客户档案。');
  }

  const formats = normalizeFormats(options.formats);
  const outputDir = options.outputDir || databaseStatus.exportsDir;
  fs.mkdirSync(outputDir, { recursive: true });

  const includeContacts = options.includeContacts !== false;
  const includeVisits = options.includeVisits !== false;
  const baseName = `客户档案-${safeFileName(bundle.customer.name)}-${timestampForFile()}`;
  const markdown = renderMarkdown(bundle, { includeContacts, includeVisits });
  const html = renderHtml(bundle, { includeContacts, includeVisits });
  const files = [];

  if (formats.includes('md')) {
    const filePath = path.join(outputDir, `${baseName}.md`);
    fs.writeFileSync(filePath, markdown, 'utf8');
    files.push(filePath);
  }

  if (formats.includes('pdf')) {
    const filePath = path.join(outputDir, `${baseName}.pdf`);
    const pdfWriter = options.pdfWriter || writePdf;
    await pdfWriter(filePath, html);
    files.push(filePath);
  }

  if (formats.includes('docx')) {
    const filePath = path.join(outputDir, `${baseName}.docx`);
    fs.writeFileSync(filePath, buildDocx(bundle, { includeContacts, includeVisits }));
    files.push(filePath);
  }

  return {
    ok: true,
    dir: outputDir,
    files
  };
}

async function exportCustomerDossiers(databaseStatus, repository, options = {}) {
  const filters = normalizeFilters(options.filters);
  const customers = repository.listCustomers(filters);
  if (!customers.length) {
    throw new Error('没有符合条件的客户可导出。');
  }

  const formats = normalizeFormats(options.formats);
  const outputDir = options.outputDir || databaseStatus.exportsDir;
  fs.mkdirSync(outputDir, { recursive: true });

  const includeContacts = options.includeContacts !== false;
  const includeVisits = options.includeVisits !== false;
  const bundles = customers
    .map((customer) => repository.getCustomerBundle(customer.id))
    .filter((bundle) => bundle?.customer);
  const baseName = `客户档案批量导出-${timestampForFile()}`;
  const markdown = renderBatchMarkdown(bundles, { includeContacts, includeVisits, filters });
  const html = renderBatchHtml(markdown);
  const files = [];

  if (formats.includes('md')) {
    const filePath = path.join(outputDir, `${baseName}.md`);
    fs.writeFileSync(filePath, markdown, 'utf8');
    files.push(filePath);
  }

  if (formats.includes('pdf')) {
    const filePath = path.join(outputDir, `${baseName}.pdf`);
    const pdfWriter = options.pdfWriter || writePdf;
    await pdfWriter(filePath, html);
    files.push(filePath);
  }

  if (formats.includes('docx')) {
    const filePath = path.join(outputDir, `${baseName}.docx`);
    fs.writeFileSync(filePath, buildBatchDocx(markdown));
    files.push(filePath);
  }

  return {
    ok: true,
    dir: outputDir,
    files,
    count: bundles.length
  };
}

function normalizeFilters(filters = {}) {
  return {
    search: String(filters.search || '').trim(),
    status: String(filters.status || '').trim(),
    industry: String(filters.industry || '').trim(),
    region: String(filters.region || '').trim()
  };
}

function normalizeFormats(formats) {
  const values = Array.isArray(formats) ? formats : [formats].filter(Boolean);
  const allowed = values.map((value) => String(value).toLowerCase()).filter((value) => ['md', 'pdf', 'docx'].includes(value));
  return allowed.length ? Array.from(new Set(allowed)) : ['md'];
}

function renderMarkdown(bundle, options) {
  const { customer, contacts, visits } = bundle;
  const lines = [
    `# 客户档案：${text(customer.name)}`,
    '',
    `导出时间：${formatDate(new Date().toISOString())}`,
    '',
    '## 1. 基础信息',
    '',
    mdTable([
      ['客户名称', customer.name],
      ['简称', customer.short_name],
      ['状态', statusLabel(customer.status)],
      ['行业', customer.industry],
      ['区域', customer.region],
      ['省份/城市', joinText([customer.province, customer.city])],
      ['地址', customer.address],
      ['负责人', customer.owner_name],
      ['电话', customer.phone],
      ['网站', customer.website],
      ['重要等级', customer.importance_level ? `${customer.importance_level}/5` : '']
    ]),
    '',
    '## 2. 主要产品信息',
    '',
    text(customer.main_products, '未记录'),
    '',
    '## 3. 客户背景',
    '',
    text(customer.background, '未记录'),
    '',
    '## 4. 备注',
    '',
    text(customer.notes, '未记录'),
    ''
  ];

  if (options.includeContacts) {
    lines.push('## 5. 关键联系人', '');
    if (contacts.length) {
      contacts.forEach((contact, index) => {
        lines.push(`### ${index + 1}. ${text(contact.name)}`, '');
        lines.push(mdTable([
          ['性别', contact.gender],
          ['户籍信息', contact.native_place],
          ['部门/职位', joinText([contact.department, contact.title])],
          ['电话', contact.phone],
          ['邮箱', contact.email],
          ['微信', contact.wechat],
          ['影响力', contact.influence_level ? `${contact.influence_level}/5` : ''],
          ['关系状态', contact.relationship_status],
          ['沟通偏好', contact.communication_preference],
          ['决策角色', contact.decision_role],
          ['下次可提及话题', contact.next_topics],
          ['备注', contact.notes]
        ]));
        lines.push('');
      });
    } else {
      lines.push('未记录。', '');
    }
  }

  if (options.includeVisits) {
    lines.push('## 6. 拜访/沟通记录', '');
    if (visits.length) {
      visits.forEach((visit, index) => {
        lines.push(`### ${index + 1}. ${text(visit.subject)}`, '');
        lines.push(mdTable([
          ['发生时间', formatDate(visit.occurred_at)],
          ['类型', visitTypeLabel(visit.type)],
          ['地点', visit.location],
          ['参与人', visit.participant_names],
          ['摘要', visit.summary],
          ['详细内容', visit.details],
          ['客户态度', visit.customer_attitude],
          ['下一步动作', visit.next_action],
          ['记录人', visit.created_by]
        ]));
        lines.push('');
      });
    } else {
      lines.push('未记录。', '');
    }
  }

  return `${lines.join('\n').trim()}\n`;
}

function renderBatchMarkdown(bundles, options) {
  const { filters } = options;
  const filterText = [
    filters.search ? `关键词：${filters.search}` : '',
    filters.status ? `状态：${statusLabel(filters.status)}` : '',
    filters.industry ? `行业：${filters.industry}` : '',
    filters.region ? `区域：${filters.region}` : ''
  ].filter(Boolean).join('；') || '未设置';
  const lines = [
    '# 客户档案批量导出',
    '',
    `导出时间：${formatDate(new Date().toISOString())}`,
    `客户数量：${bundles.length}`,
    `筛选条件：${filterText}`,
    ''
  ];

  bundles.forEach((bundle, index) => {
    lines.push(...renderCustomerMarkdownSection(bundle, options, index + 1), '');
  });

  return `${lines.join('\n').trim()}\n`;
}

function renderCustomerMarkdownSection(bundle, options, index) {
  const { customer, contacts, visits } = bundle;
  const lines = [
    `## ${index}. ${text(customer.name)}`,
    '',
    '### 基础信息',
    '',
    mdTable([
      ['客户名称', customer.name],
      ['简称', customer.short_name],
      ['状态', statusLabel(customer.status)],
      ['行业', customer.industry],
      ['区域', customer.region],
      ['省份/城市', joinText([customer.province, customer.city])],
      ['地址', customer.address],
      ['负责人', customer.owner_name],
      ['电话', customer.phone],
      ['网站', customer.website],
      ['重要等级', customer.importance_level ? `${customer.importance_level}/5` : ''],
      ['主要产品信息', customer.main_products],
      ['客户背景', customer.background],
      ['备注', customer.notes]
    ]),
    ''
  ];

  if (options.includeContacts) {
    lines.push('### 关键联系人', '');
    if (contacts.length) {
      contacts.forEach((contact, contactIndex) => {
        lines.push(`#### ${contactIndex + 1}. ${text(contact.name)}`, '');
        lines.push(mdTable([
          ['性别', contact.gender],
          ['户籍信息', contact.native_place],
          ['部门/职位', joinText([contact.department, contact.title])],
          ['电话', contact.phone],
          ['邮箱', contact.email],
          ['微信', contact.wechat],
          ['影响力', contact.influence_level ? `${contact.influence_level}/5` : ''],
          ['关系状态', contact.relationship_status],
          ['沟通偏好', contact.communication_preference],
          ['决策角色', contact.decision_role],
          ['下次可提及话题', contact.next_topics],
          ['备注', contact.notes]
        ]));
        lines.push('');
      });
    } else {
      lines.push('未记录。', '');
    }
  }

  if (options.includeVisits) {
    lines.push('### 拜访/沟通记录', '');
    if (visits.length) {
      visits.forEach((visit, visitIndex) => {
        lines.push(`#### ${visitIndex + 1}. ${text(visit.subject)}`, '');
        lines.push(mdTable([
          ['发生时间', formatDate(visit.occurred_at)],
          ['类型', visitTypeLabel(visit.type)],
          ['地点', visit.location],
          ['参与人', visit.participant_names],
          ['摘要', visit.summary],
          ['详细内容', visit.details],
          ['客户态度', visit.customer_attitude],
          ['下一步动作', visit.next_action],
          ['记录人', visit.created_by]
        ]));
        lines.push('');
      });
    } else {
      lines.push('未记录。', '');
    }
  }

  return lines;
}

function renderHtml(bundle, options) {
  const markdown = renderMarkdown(bundle, options);
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif; color: #172033; margin: 36px; line-height: 1.55; }
    h1 { font-size: 24px; margin: 0 0 16px; }
    h2 { font-size: 18px; margin: 26px 0 10px; padding-bottom: 6px; border-bottom: 1px solid #dbe5ef; }
    h3 { font-size: 15px; margin: 18px 0 8px; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0 14px; page-break-inside: avoid; }
    th, td { border: 1px solid #dbe5ef; padding: 7px 9px; vertical-align: top; font-size: 12px; }
    th { width: 130px; background: #f5f7fa; text-align: left; color: #667085; }
    p { margin: 7px 0; white-space: pre-wrap; }
  </style>
</head>
<body>
  ${markdownToHtml(markdown)}
</body>
</html>`;
}

function renderBatchHtml(markdown) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif; color: #172033; margin: 36px; line-height: 1.55; }
    h1 { font-size: 24px; margin: 0 0 16px; }
    h2 { font-size: 19px; margin: 28px 0 10px; padding-bottom: 6px; border-bottom: 1px solid #dbe5ef; }
    h3 { font-size: 16px; margin: 20px 0 8px; }
    h4 { font-size: 14px; margin: 16px 0 7px; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0 14px; page-break-inside: avoid; }
    th, td { border: 1px solid #dbe5ef; padding: 7px 9px; vertical-align: top; font-size: 12px; }
    th { width: 130px; background: #f5f7fa; text-align: left; color: #667085; }
    p { margin: 7px 0; white-space: pre-wrap; }
  </style>
</head>
<body>
  ${markdownToHtml(markdown)}
</body>
</html>`;
}

async function writePdf(filePath, html) {
  if (typeof BrowserWindow !== 'function') {
    throw new Error('PDF 导出需要在 Electron 主进程中运行。');
  }
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      sandbox: true
    }
  });
  try {
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    const pdf = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      margins: {
        marginType: 'custom',
        top: 0.4,
        bottom: 0.4,
        left: 0.4,
        right: 0.4
      }
    });
    fs.writeFileSync(filePath, pdf);
  } finally {
    win.destroy();
  }
}

function buildDocx(bundle, options) {
  const paragraphs = renderMarkdown(bundle, options)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => markdownLineToParagraph(line));
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphs.join('\n')}
    <w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/></w:sectPr>
  </w:body>
</w:document>`;
  const files = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
    'word/document.xml': documentXml
  };
  return zipStore(files);
}

function buildBatchDocx(markdown) {
  const paragraphs = markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => markdownLineToParagraph(line));
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphs.join('\n')}
    <w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/></w:sectPr>
  </w:body>
</w:document>`;
  const files = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
    'word/document.xml': documentXml
  };
  return zipStore(files);
}

function markdownLineToParagraph(line) {
  let style = '';
  let textValue = line;
  if (line.startsWith('# ')) {
    style = '<w:pStyle w:val="Title"/>';
    textValue = line.slice(2);
  } else if (line.startsWith('## ')) {
    style = '<w:pStyle w:val="Heading1"/>';
    textValue = line.slice(3);
  } else if (line.startsWith('### ')) {
    style = '<w:pStyle w:val="Heading2"/>';
    textValue = line.slice(4);
  } else if (line.startsWith('#### ')) {
    style = '<w:pStyle w:val="Heading3"/>';
    textValue = line.slice(5);
  }
  return `<w:p><w:pPr>${style}</w:pPr><w:r><w:t xml:space="preserve">${xml(textValue)}</w:t></w:r></w:p>`;
}

function markdownToHtml(markdown) {
  const lines = markdown.split(/\r?\n/);
  const html = [];
  let tableRows = [];
  function flushTable() {
    if (!tableRows.length) {
      return;
    }
    html.push('<table>');
    tableRows.forEach(([label, value]) => {
      html.push(`<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`);
    });
    html.push('</table>');
    tableRows = [];
  }
  lines.forEach((line) => {
    if (/^\|.+\|$/.test(line)) {
      const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
      if (cells[0] !== '字段' && !/^[-:]+$/.test(cells[0])) {
        tableRows.push([cells[0] || '', cells[1] || '']);
      }
      return;
    }
    flushTable();
    if (line.startsWith('# ')) html.push(`<h1>${escapeHtml(line.slice(2))}</h1>`);
    else if (line.startsWith('## ')) html.push(`<h2>${escapeHtml(line.slice(3))}</h2>`);
    else if (line.startsWith('### ')) html.push(`<h3>${escapeHtml(line.slice(4))}</h3>`);
    else if (line.startsWith('#### ')) html.push(`<h4>${escapeHtml(line.slice(5))}</h4>`);
    else if (line.trim()) html.push(`<p>${escapeHtml(line)}</p>`);
  });
  flushTable();
  return html.join('\n');
}

function mdTable(rows) {
  const visibleRows = rows.map(([label, value]) => [label, text(value, '未记录')]);
  return [
    '| 字段 | 内容 |',
    '|---|---|',
    ...visibleRows.map(([label, value]) => `| ${escapeMarkdown(label)} | ${escapeMarkdown(value)} |`)
  ].join('\n');
}

function text(value, fallback = '') {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
}

function joinText(values) {
  return values.map((value) => String(value || '').trim()).filter(Boolean).join(' ');
}

function formatDate(value) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('zh-CN', { hour12: false });
}

function statusLabel(status) {
  return ({ potential: '潜在', active: '活跃', inactive: '停用' })[status] || status || '';
}

function visitTypeLabel(type) {
  return ({ visit: '现场拜访', phone: '电话沟通', wechat: '微信沟通', meeting: '会议' })[type] || type || '';
}

function safeFileName(value) {
  return text(value, '未命名客户').replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').slice(0, 80);
}

function escapeMarkdown(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function xml(value) {
  return escapeHtml(value);
}

function zipStore(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  Object.entries(files).forEach(([name, content]) => {
    const nameBuffer = Buffer.from(name);
    const data = Buffer.from(content, 'utf8');
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    writeDosTime(local, 10);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuffer.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, nameBuffer, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    writeDosTime(central, 12);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuffer.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, nameBuffer);
    offset += local.length + nameBuffer.length + data.length;
  });

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(Object.keys(files).length, 8);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, ...centralParts, end]);
}

function writeDosTime(buffer, offset) {
  const date = new Date();
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  buffer.writeUInt16LE(time, offset);
  buffer.writeUInt16LE(dosDate, offset + 2);
}

function crc32(buffer) {
  let crc = -1;
  for (const byte of buffer) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

module.exports = {
  exportCustomerDossier,
  exportCustomerDossiers,
  renderMarkdown,
  renderBatchMarkdown,
  buildDocx
};
