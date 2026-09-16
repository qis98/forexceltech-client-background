const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434';
const DEFAULT_OLLAMA_MODEL = 'qwen3:8b';

const DEFAULT_CONFIG = {
  aiMode: 'local',
  ollamaBaseUrl: DEFAULT_OLLAMA_BASE_URL,
  ollamaModel: DEFAULT_OLLAMA_MODEL,
  calendar: {
    visitedColor: '#B5EAD7',
    plannedColor: '#FFB7B2',
    badgeMax: 99
  },
  updatedAt: ''
};

function getConfigPath(databaseStatus) {
  return path.join(databaseStatus.baseDir, 'config.json');
}

function readAppConfig(databaseStatus) {
  const configPath = getConfigPath(databaseStatus);
  if (!fs.existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }
  try {
    return normalizeConfig(JSON.parse(fs.readFileSync(configPath, 'utf8')));
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function saveAppConfig(databaseStatus, payload) {
  const current = readAppConfig(databaseStatus);
  const next = normalizeConfig({
    ...current,
    ...payload,
    updatedAt: new Date().toISOString()
  });
  fs.mkdirSync(databaseStatus.baseDir, { recursive: true });
  fs.writeFileSync(getConfigPath(databaseStatus), JSON.stringify(next, null, 2), 'utf8');
  return getPublicConfig(databaseStatus);
}

function getEffectiveAiConfig(databaseStatus) {
  const saved = readAppConfig(databaseStatus);
  return {
    ...saved,
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || saved.ollamaBaseUrl || DEFAULT_OLLAMA_BASE_URL,
    ollamaModel: process.env.OLLAMA_MODEL || saved.ollamaModel || DEFAULT_OLLAMA_MODEL
  };
}

function getPublicConfig(databaseStatus) {
  const saved = readAppConfig(databaseStatus);
  const effective = getEffectiveAiConfig(databaseStatus);
  return {
    configPath: getConfigPath(databaseStatus),
    aiMode: saved.aiMode,
    ollamaBaseUrl: saved.ollamaBaseUrl,
    ollamaModel: saved.ollamaModel,
    calendar: saved.calendar,
    effectiveAiMode: effective.aiMode,
    effectiveOllamaBaseUrl: effective.ollamaBaseUrl,
    effectiveOllamaModel: effective.ollamaModel,
    updatedAt: saved.updatedAt || ''
  };
}

function normalizeConfig(input = {}) {
  const calendar = input.calendar || {};
  const badgeMax = Number(calendar.badgeMax);
  const visitedColor = normalizeColor(calendar.visitedColor, DEFAULT_CONFIG.calendar.visitedColor);
  const plannedColor = normalizeColor(calendar.plannedColor, DEFAULT_CONFIG.calendar.plannedColor);
  const usesLegacyDefaultCalendarColors = visitedColor.toLowerCase() === '#8fd6a3'
    && plannedColor.toLowerCase() === '#f5a6a6';
  return {
    aiMode: input.aiMode === 'ollama' ? 'ollama' : 'local',
    ollamaBaseUrl: String(input.ollamaBaseUrl || DEFAULT_OLLAMA_BASE_URL).trim().replace(/\/+$/, '') || DEFAULT_OLLAMA_BASE_URL,
    ollamaModel: String(input.ollamaModel || DEFAULT_OLLAMA_MODEL).trim() || DEFAULT_OLLAMA_MODEL,
    calendar: {
      visitedColor: usesLegacyDefaultCalendarColors ? DEFAULT_CONFIG.calendar.visitedColor : visitedColor,
      plannedColor: usesLegacyDefaultCalendarColors ? DEFAULT_CONFIG.calendar.plannedColor : plannedColor,
      badgeMax: Number.isFinite(badgeMax) ? Math.min(99, Math.max(1, Math.trunc(badgeMax))) : DEFAULT_CONFIG.calendar.badgeMax
    },
    updatedAt: input.updatedAt || ''
  };
}

function normalizeColor(value, fallback) {
  const text = String(value || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(text) ? text : fallback;
}

module.exports = {
  DEFAULT_OLLAMA_BASE_URL,
  DEFAULT_OLLAMA_MODEL,
  getEffectiveAiConfig,
  getPublicConfig,
  readAppConfig,
  saveAppConfig
};
