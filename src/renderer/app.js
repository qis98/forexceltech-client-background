const state = {
  activeView: 'dashboard',
  customers: [],
  contacts: [],
  visits: [],
  aiCustomers: [],
  aiContacts: [],
  aiDraftResult: null,
  aiBaseDraftResult: null,
  aiAudioFile: null,
  aiConfirmed: {
    customerId: '',
    contactIds: {},
    visitId: ''
  },
  aiLinked: {
    customerId: '',
    contactId: ''
  },
  aiCustomerDecision: {
    mode: '',
    customerId: ''
  },
  aiPicker: {
    type: '',
    query: '',
    page: 1,
    pageSize: 10
  },
  settings: null,
  calendar: {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    summary: { days: [] },
    selectedDate: ''
  },
  map: {
    customers: [],
    selectedProvince: '',
    filters: {
      status: '',
      industry: ''
    }
  },
  selectedCustomerId: null,
  selectedBundle: null,
  customerViewMode: 'list',
  search: '',
  filters: {
    status: '',
    industry: '',
    region: ''
  },
  filterOptions: {
    industries: [],
    regions: []
  },
  pagination: {
    customers: { page: 1, pageSize: 10 },
    contacts: { page: 1, pageSize: 50 },
    visits: { page: 1, pageSize: 50 }
  }
};

let mapChart = null;
const registeredEchartsMaps = new Set();
const CHINA_ECHARTS_MAP = 'forexceltech-china';
const CHINA_CONTEXT_ECHARTS_MAP = 'forexceltech-china-context';
const CHINA_CONTEXT_BOUNDS = [[67, 58], [145, 0]];
const CHINA_CONTEXT_INITIAL_ZOOM = 1.34;
const CHINA_ROAM_LIMIT = {
  lng: [88, 122],
  lat: [12, 47],
  minZoom: CHINA_CONTEXT_INITIAL_ZOOM,
  maxZoom: 12
};
const CALENDAR_YEAR_MIN = 1949;
const CALENDAR_YEAR_MAX = 2099;
const CALENDAR_PICKER_VISIBLE_COUNT = 4;
const CALENDAR_COLOR_SCHEMES = [
  { id: 'mint', visitedColor: '#B5EAD7', plannedColor: '#FFB7B2' },
  { id: 'morandi', visitedColor: '#A3E1D4', plannedColor: '#F8C4CC' },
  { id: 'warm', visitedColor: '#E2F0CB', plannedColor: '#FFDAC1' }
];
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const AI_PICKER_PAGE_SIZE = 10;
const CHINA_MAP_LABEL_OVERRIDES = {
  北京: { offset: [-16, -12], fontSize: 10 },
  天津: { offset: [20, 10], fontSize: 10 },
  河北: { offset: [0, 22], fontSize: 10 },
  上海: { offset: [24, 0], fontSize: 10 },
  香港: { offset: [24, 12], fontSize: 9 },
  澳门: { offset: [-22, 14], fontSize: 9 },
  广东: { offset: [-8, 18], fontSize: 10 },
  海南: { offset: [0, 18], fontSize: 10 }
};
let calendarWheelLock = false;
let mapRoamGuardLock = false;

const els = {
  databasePath: document.querySelector('#database-path'),
  globalSearch: document.querySelector('#global-search'),
  customerListMode: document.querySelector('#customer-list-mode'),
  customerList: document.querySelector('#customer-list'),
  customerPagination: document.querySelector('#customer-pagination'),
  allContactsList: document.querySelector('#all-contacts-list'),
  contactsPagination: document.querySelector('#contacts-pagination'),
  allVisitsList: document.querySelector('#all-visits-list'),
  visitsPagination: document.querySelector('#visits-pagination'),
  aiTranscript: document.querySelector('#ai-transcript'),
  aiLinkedCustomer: document.querySelector('#ai-linked-customer'),
  aiLinkedContact: document.querySelector('#ai-linked-contact'),
  aiSelectAudio: document.querySelector('#ai-select-audio'),
  aiTranscribeAudio: document.querySelector('#ai-transcribe-audio'),
  aiAudioStatus: document.querySelector('#ai-audio-status'),
  aiGenerateDrafts: document.querySelector('#ai-generate-drafts'),
  aiLoadSample: document.querySelector('#ai-load-sample'),
  aiClearDrafts: document.querySelector('#ai-clear-drafts'),
  aiConfirmDrafts: document.querySelector('#ai-confirm-drafts'),
  aiDraftResults: document.querySelector('#ai-draft-results'),
  aiResultMeta: document.querySelector('#ai-result-meta'),
  aiLinkedCustomerTrigger: document.querySelector('#ai-linked-customer-trigger'),
  aiLinkedContactTrigger: document.querySelector('#ai-linked-contact-trigger'),
  recentCustomers: document.querySelector('#recent-customers'),
  metricCustomers: document.querySelector('#metric-customers'),
  metricContacts: document.querySelector('#metric-contacts'),
  metricVisits: document.querySelector('#metric-visits'),
  calendarGrid: document.querySelector('#calendar-grid'),
  calendarYearPicker: document.querySelector('#calendar-year-picker'),
  calendarMonthPicker: document.querySelector('#calendar-month-picker'),
  calendarTodayButton: document.querySelector('#calendar-today-button'),
  mapFilterStatus: document.querySelector('#map-filter-status'),
  mapFilterIndustry: document.querySelector('#map-filter-industry'),
  mapBackChina: document.querySelector('#map-back-china'),
  mapTitle: document.querySelector('#map-title'),
  mapSubtitle: document.querySelector('#map-subtitle'),
  mapSummary: document.querySelector('#map-summary'),
  mapCanvas: document.querySelector('#customer-map-canvas'),
  filterStatus: document.querySelector('#filter-status'),
  filterIndustry: document.querySelector('#filter-industry'),
  filterRegion: document.querySelector('#filter-region'),
  exportCustomers: document.querySelector('#export-customers'),
  newCustomerPage: document.querySelector('#new-customer-page'),
  settingsTop: document.querySelector('#settings-top'),
  dialog: document.querySelector('#entity-dialog'),
  dialogTitle: document.querySelector('#dialog-title'),
  dialogFields: document.querySelector('#dialog-fields'),
  entityForm: document.querySelector('#entity-form'),
  dialogClose: document.querySelector('#dialog-close'),
  dialogCancel: document.querySelector('#dialog-cancel'),
  detailDialog: document.querySelector('#detail-dialog'),
  detailDialogTitle: document.querySelector('#detail-dialog-title'),
  detailDialogBody: document.querySelector('#detail-dialog-body'),
  detailDialogActions: document.querySelector('#detail-dialog-actions'),
  detailDialogClose: document.querySelector('#detail-dialog-close'),
  duplicateDialog: document.querySelector('#visit-duplicate-dialog'),
  duplicateVisitBody: document.querySelector('#duplicate-visit-body'),
  duplicateCreateVisit: document.querySelector('#duplicate-create-visit'),
  duplicateMergeVisit: document.querySelector('#duplicate-merge-visit'),
  duplicateDialogClose: document.querySelector('#duplicate-dialog-close'),
  settingsForm: document.querySelector('#settings-form'),
  settingsStatus: document.querySelector('#settings-status'),
  settingsAiMode: document.querySelector('#settings-ai-mode'),
  settingsBaseUrl: document.querySelector('#settings-base-url'),
  settingsExtractionModel: document.querySelector('#settings-extraction-model'),
  settingsCalendarVisited: document.querySelector('#settings-calendar-visited'),
  settingsCalendarPlanned: document.querySelector('#settings-calendar-planned'),
  settingsCalendarBadgeMax: document.querySelector('#settings-calendar-badge-max'),
  settingsCalendarPreview: document.querySelector('#settings-calendar-preview'),
  settingsConfigPath: document.querySelector('#settings-config-path'),
  settingsDbPath: document.querySelector('#settings-db-path'),
  settingsBackupData: document.querySelector('#settings-backup-data'),
  settingsExportCsv: document.querySelector('#settings-export-csv'),
  settingsRestoreBackup: document.querySelector('#settings-restore-backup'),
  settingsTest: document.querySelector('#settings-test'),
  settingsSave: document.querySelector('#settings-save'),
  toast: document.querySelector('#toast')
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function display(value, fallback = '-') {
  return value === undefined || value === null || value === '' ? fallback : escapeHtml(value);
}

function iconMarkup(name, className = '') {
  const classes = ['ui-icon', className].filter(Boolean).join(' ');
  return `<svg class="${classes}" aria-hidden="true"><use href="#icon-${name}"></use></svg>`;
}

function formatDate(value) {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return escapeHtml(value);
  }
  return date.toLocaleString('zh-CN', { hour12: false });
}

function formatDateOnly(value) {
  if (!value) {
    return '-';
  }
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return escapeHtml(value);
  }
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
}

function toDateKey(date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function todayDateKey() {
  return toDateKey(new Date());
}

function isPastDateKey(dateKey) {
  return String(dateKey || '').slice(0, 10) < todayDateKey();
}

function calendarMonthLabel(year = state.calendar.year, month = state.calendar.month) {
  return `${year}年${month}月`;
}

const LUNAR_INFO = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
  0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5d0, 0x14573, 0x052d0, 0x0a9a8, 0x0e950, 0x06aa0,
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6,
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x05ac0, 0x0ab60, 0x096d5, 0x092e0,
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
  0x05aa0, 0x076a3, 0x096d0, 0x04bd7, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0,
  0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0,
  0x0a2e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4,
  0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0,
  0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160,
  0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a2d0, 0x0d150, 0x0f252,
  0x0d520
];

const LUNAR_MONTH_NAMES = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];
const LUNAR_DAY_PREFIX = ['初', '十', '廿', '三'];
const LUNAR_DAY_NAMES = ['十', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const SOLAR_HOLIDAYS = {
  '01-01': '元旦',
  '04-05': '清明',
  '05-01': '劳动',
  '10-01': '国庆'
};
const LUNAR_HOLIDAYS = {
  '1-1': '春节',
  '1-15': '元宵',
  '5-5': '端午',
  '7-7': '七夕',
  '8-15': '中秋',
  '9-9': '重阳',
  '12-8': '腊八',
  '12-23': '小年'
};

const PROVINCE_MAP_POINTS = [
  ['新疆', 14, 30], ['西藏', 20, 62], ['青海', 34, 52], ['甘肃', 42, 43], ['内蒙古', 58, 25],
  ['黑龙江', 82, 14], ['吉林', 82, 24], ['辽宁', 78, 32], ['北京', 69, 36], ['天津', 72, 39],
  ['河北', 68, 43], ['山西', 61, 44], ['陕西', 55, 52], ['宁夏', 50, 45], ['山东', 73, 48],
  ['河南', 64, 55], ['江苏', 75, 58], ['安徽', 71, 62], ['上海', 81, 65], ['浙江', 78, 70],
  ['湖北', 62, 65], ['湖南', 60, 74], ['江西', 69, 75], ['福建', 74, 81], ['台湾', 82, 86],
  ['四川', 47, 66], ['重庆', 54, 70], ['贵州', 52, 79], ['云南', 42, 86], ['广西', 58, 88],
  ['广东', 66, 88], ['海南', 61, 96], ['香港', 69, 91], ['澳门', 67, 92]
].map(([name, x, y]) => ({ name, x, y }));

const PROVINCE_ALIASES = new Map(PROVINCE_MAP_POINTS.flatMap((province) => [
  [province.name, province.name],
  [`${province.name}省`, province.name],
  [`${province.name}市`, province.name],
  [`${province.name}自治区`, province.name],
  [`${province.name}特别行政区`, province.name]
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

const CITY_COORDS = {
  北京: [50, 36], 天津: [58, 44], 上海: [52, 50], 重庆: [50, 50], 广州: [48, 62], 深圳: [58, 70],
  东莞: [54, 66], 佛山: [44, 66], 苏州: [50, 44], 南京: [42, 48], 无锡: [54, 46], 宁波: [60, 58],
  杭州: [48, 54], 温州: [62, 68], 绍兴: [54, 56], 金华: [48, 66], 成都: [45, 50], 绵阳: [50, 42],
  武汉: [50, 50], 长沙: [50, 54], 南昌: [52, 52], 福州: [55, 58], 厦门: [60, 72], 泉州: [55, 68],
  郑州: [50, 48], 洛阳: [42, 50], 西安: [48, 54], 青岛: [62, 48], 济南: [50, 46], 烟台: [66, 38],
  沈阳: [50, 48], 大连: [58, 66], 长春: [50, 48], 哈尔滨: [50, 46], 合肥: [48, 52], 芜湖: [56, 60],
  太原: [50, 50], 石家庄: [50, 52], 唐山: [58, 42], 呼和浩特: [48, 50], 银川: [50, 50],
  兰州: [48, 52], 西宁: [50, 50], 乌鲁木齐: [48, 46], 拉萨: [48, 52], 昆明: [48, 52],
  贵阳: [50, 52], 南宁: [50, 50], 海口: [50, 55], 香港: [50, 55], 澳门: [50, 55]
};

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
const PROVINCE_CITY_OPTIONS = {
  北京: ['北京'], 天津: ['天津'], 上海: ['上海'], 重庆: ['重庆'],
  广东: ['广州', '深圳', '东莞', '佛山', '惠州', '珠海', '中山', '江门', '肇庆', '汕头', '韶关', '河源', '梅州', '汕尾', '阳江', '湛江', '茂名', '清远', '潮州', '揭阳', '云浮'],
  江苏: ['南京', '苏州', '无锡', '常州', '南通', '扬州', '镇江', '泰州', '徐州', '连云港', '淮安', '盐城', '宿迁'],
  浙江: ['杭州', '宁波', '绍兴', '温州', '金华', '嘉兴', '湖州', '台州', '舟山', '衢州', '丽水'],
  山东: ['济南', '青岛', '烟台', '潍坊', '淄博', '济宁', '威海', '枣庄', '东营', '泰安', '日照', '临沂', '德州', '聊城', '滨州', '菏泽'],
  安徽: ['合肥', '芜湖', '马鞍山', '滁州', '蚌埠', '淮南', '淮北', '铜陵', '安庆', '黄山', '阜阳', '宿州', '六安', '亳州', '池州', '宣城'],
  福建: ['福州', '厦门', '泉州', '漳州', '莆田', '三明', '南平', '龙岩', '宁德'],
  江西: ['南昌', '九江', '赣州', '宜春', '景德镇', '萍乡', '新余', '鹰潭', '吉安', '抚州', '上饶'],
  河南: ['郑州', '洛阳', '新乡', '许昌', '南阳', '开封', '平顶山', '安阳', '鹤壁', '焦作', '濮阳', '漯河', '三门峡', '商丘', '信阳', '周口', '驻马店', '济源'],
  湖北: ['武汉', '襄阳', '宜昌', '黄石', '十堰', '鄂州', '荆门', '孝感', '荆州', '黄冈', '咸宁', '随州', '恩施'],
  湖南: ['长沙', '株洲', '湘潭', '岳阳', '衡阳', '邵阳', '常德', '张家界', '益阳', '郴州', '永州', '怀化', '娄底', '湘西'],
  四川: ['成都', '绵阳', '德阳', '宜宾', '自贡', '攀枝花', '泸州', '广元', '遂宁', '内江', '乐山', '南充', '眉山', '广安', '达州', '雅安', '巴中', '资阳', '阿坝', '甘孜', '凉山'],
  陕西: ['西安', '咸阳', '宝鸡', '铜川', '渭南', '延安', '汉中', '榆林', '安康', '商洛'],
  辽宁: ['沈阳', '大连', '鞍山', '抚顺', '本溪', '丹东', '锦州', '营口', '阜新', '辽阳', '盘锦', '铁岭', '朝阳', '葫芦岛'],
  吉林: ['长春', '吉林', '四平', '辽源', '通化', '白山', '松原', '白城', '延边'],
  黑龙江: ['哈尔滨', '齐齐哈尔', '牡丹江', '佳木斯', '大庆', '鸡西', '双鸭山', '伊春', '七台河', '鹤岗', '黑河', '绥化', '大兴安岭'],
  河北: ['石家庄', '唐山', '保定', '廊坊', '秦皇岛', '邯郸', '邢台', '张家口', '承德', '沧州', '衡水'],
  山西: ['太原', '大同', '阳泉', '长治', '晋城', '朔州', '晋中', '运城', '忻州', '临汾', '吕梁'],
  内蒙古: ['呼和浩特', '包头', '乌海', '赤峰', '通辽', '鄂尔多斯', '呼伦贝尔', '巴彦淖尔', '乌兰察布', '兴安', '锡林郭勒', '阿拉善'],
  广西: ['南宁', '柳州', '桂林', '梧州', '北海', '防城港', '钦州', '贵港', '玉林', '百色', '贺州', '河池', '来宾', '崇左'],
  海南: ['海口', '三亚', '三沙', '儋州'],
  贵州: ['贵阳', '遵义', '六盘水', '安顺', '毕节', '铜仁', '黔西南', '黔东南', '黔南'],
  云南: ['昆明', '曲靖', '玉溪', '保山', '昭通', '丽江', '普洱', '临沧', '楚雄', '红河', '文山', '西双版纳', '大理', '德宏', '怒江', '迪庆'],
  甘肃: ['兰州', '嘉峪关', '金昌', '白银', '天水', '武威', '张掖', '平凉', '酒泉', '庆阳', '定西', '陇南', '临夏', '甘南'],
  青海: ['西宁', '海东', '海北', '黄南', '海南', '果洛', '玉树', '海西'],
  宁夏: ['银川', '石嘴山', '吴忠', '固原', '中卫'],
  新疆: ['乌鲁木齐', '克拉玛依', '吐鲁番', '哈密', '昌吉', '博尔塔拉', '巴音郭楞', '阿克苏', '克孜勒苏', '喀什', '和田', '伊犁', '塔城', '阿勒泰'],
  西藏: ['拉萨', '日喀则', '昌都', '林芝', '山南', '那曲', '阿里'],
  香港: ['香港'], 澳门: ['澳门'], 台湾: ['台北', '新北', '桃园']
};
const CITY_PROVINCE_MAP = Object.entries(PROVINCE_CITY_OPTIONS).reduce((map, [province, cities]) => {
  cities.forEach((city) => map.set(city, province));
  return map;
}, new Map());

function getLunarDayMeta(date) {
  const lunar = solarToLunar(date);
  if (!lunar) {
    return { label: '', holiday: '' };
  }
  const dateKey = toDateKey(date).slice(5);
  const solarHoliday = SOLAR_HOLIDAYS[dateKey] || '';
  const lunarHoliday = LUNAR_HOLIDAYS[`${lunar.month}-${lunar.day}`] || '';
  const eve = lunar.month === 12 && lunar.day === lunarMonthDays(lunar.year, 12) ? '除夕' : '';
  const holiday = solarHoliday || lunarHoliday || eve;
  const label = holiday || (lunar.day === 1 ? `${lunar.isLeap ? '闰' : ''}${LUNAR_MONTH_NAMES[lunar.month - 1]}` : lunarDayName(lunar.day));
  return { label, holiday };
}

function lunarYearDays(year) {
  let sum = 348;
  const info = LUNAR_INFO[year - 1900];
  for (let bit = 0x8000; bit > 0x8; bit >>= 1) {
    sum += info & bit ? 1 : 0;
  }
  return sum + lunarLeapDays(year);
}

function lunarLeapMonth(year) {
  return LUNAR_INFO[year - 1900] & 0xf;
}

function lunarLeapDays(year) {
  if (!lunarLeapMonth(year)) {
    return 0;
  }
  return LUNAR_INFO[year - 1900] & 0x10000 ? 30 : 29;
}

function lunarMonthDays(year, month) {
  return LUNAR_INFO[year - 1900] & (0x10000 >> month) ? 30 : 29;
}

function solarToLunar(date) {
  const year = date.getFullYear();
  if (year < 1900 || year > 2100) {
    return null;
  }
  const baseDate = new Date(1900, 0, 31);
  let offset = Math.floor((new Date(year, date.getMonth(), date.getDate()) - baseDate) / 86400000);
  let lunarYear;
  let daysOfYear = 0;
  for (lunarYear = 1900; lunarYear < 2101 && offset > 0; lunarYear += 1) {
    daysOfYear = lunarYearDays(lunarYear);
    offset -= daysOfYear;
  }
  if (offset < 0) {
    offset += daysOfYear;
    lunarYear -= 1;
  }

  const leapMonth = lunarLeapMonth(lunarYear);
  let isLeap = false;
  let lunarMonth;
  let daysOfMonth = 0;
  for (lunarMonth = 1; lunarMonth < 13 && offset > 0; lunarMonth += 1) {
    if (leapMonth > 0 && lunarMonth === leapMonth + 1 && !isLeap) {
      lunarMonth -= 1;
      isLeap = true;
      daysOfMonth = lunarLeapDays(lunarYear);
    } else {
      daysOfMonth = lunarMonthDays(lunarYear, lunarMonth);
    }
    if (isLeap && lunarMonth === leapMonth + 1) {
      isLeap = false;
    }
    offset -= daysOfMonth;
  }
  if (offset < 0) {
    offset += daysOfMonth;
    lunarMonth -= 1;
  }
  return {
    year: lunarYear,
    month: lunarMonth,
    day: offset + 1,
    isLeap
  };
}

function lunarDayName(day) {
  if (day === 10) {
    return '初十';
  }
  if (day === 20) {
    return '二十';
  }
  if (day === 30) {
    return '三十';
  }
  return `${LUNAR_DAY_PREFIX[Math.floor(day / 10)]}${LUNAR_DAY_NAMES[day % 10]}`;
}

function visitTimeBadge(value) {
  if (!value) {
    return '<div class="visit-time-badge"><strong>-</strong><span>-</span></div>';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return `<div class="visit-time-badge"><strong>${escapeHtml(value)}</strong><span>-</span></div>`;
  }
  return `
    <div class="visit-time-badge">
      <strong>${date.toLocaleDateString('zh-CN')}</strong>
      <span>${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
    </div>
  `;
}

function visitListTimeBlock(value) {
  if (!value) {
    return '<div class="record-time-block"><strong>-</strong><span>-</span></div>';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return `<div class="record-time-block"><strong>${escapeHtml(value)}</strong><span>-</span></div>`;
  }
  const shortDate = `${String(date.getFullYear()).slice(2)}/${date.getMonth() + 1}/${date.getDate()}`;
  return `
    <div class="record-time-block">
      <strong>${shortDate}</strong>
      <span>${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
    </div>
  `;
}

function toDatetimeLocal(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function fromDatetimeLocal(value) {
  return value ? new Date(value).toISOString() : '';
}

function parseTags(value) {
  if (!value) {
    return [];
  }
  try {
    return JSON.parse(value);
  } catch {
    return String(value).split(',').map((tag) => tag.trim()).filter(Boolean);
  }
}

async function bootstrap() {
  const status = await window.forexceltechApp.getBootstrapStatus();
  els.databasePath.textContent = status.database.dbPath;
  if (els.settingsDbPath) {
    els.settingsDbPath.textContent = status.database.dbPath;
  }
  bindAppMenuEvents();
  bindEvents();
  await refreshAll();
}

function bindAppMenuEvents() {
  window.forexceltechApp.onMenuNavigate?.((view) => {
    if (view === 'customers:new') {
      openCustomerDialog();
      return;
    }
    if (view === 'about') {
      showToast('FOREXCELTECH 客户背景管理系统');
      return;
    }
    safeAction(() => switchView(view));
  });
}

function bindEvents() {
  document.querySelectorAll('.nav-item').forEach((button) => {
    button.addEventListener('click', () => switchView(button.dataset.view));
  });

  document.querySelectorAll('[data-view-target]').forEach((button) => {
    button.addEventListener('click', () => switchView(button.dataset.viewTarget));
  });

  els.settingsTop?.addEventListener('click', () => switchView('settings'));

  els.newCustomerPage?.addEventListener('click', () => openCustomerDialog());
  els.exportCustomers?.addEventListener('click', () => openCustomerBatchExportDialog());

  els.globalSearch.addEventListener('input', async (event) => {
    state.search = event.target.value;
    resetPaginationForActiveView();
    await runActiveSearch();
  });

  [els.filterStatus, els.filterIndustry, els.filterRegion].forEach((select) => {
    select?.addEventListener('change', async () => {
      state.filters.status = els.filterStatus.value;
      state.filters.industry = els.filterIndustry.value;
      state.filters.region = els.filterRegion.value;
      resetPagination('customers');
      await loadCustomers();
      renderCustomers();
    });
  });

  [
    ['customers', els.customerPagination],
    ['contacts', els.contactsPagination],
    ['visits', els.visitsPagination]
  ].forEach(([type, container]) => {
    container?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-page-action]');
      if (!button || button.disabled) {
        return;
      }
      updatePagination(type, button.dataset.pageAction);
    });
    container?.addEventListener('change', (event) => {
      if (!event.target.matches('[data-page-size]')) {
        return;
      }
      updatePagination(type, 'size', Number(event.target.value));
    });
  });

  [els.mapFilterStatus, els.mapFilterIndustry].forEach((select) => {
    select?.addEventListener('change', async () => {
      state.map.filters.status = els.mapFilterStatus.value;
      state.map.filters.industry = els.mapFilterIndustry.value;
      await loadMapCustomers();
      renderCustomerMap();
    });
  });

  els.mapBackChina?.addEventListener('click', () => {
    state.map.selectedProvince = '';
    renderCustomerMap();
  });

  els.settingsBackupData?.addEventListener('click', () => safeAction(async () => {
    const result = await window.forexceltechApp.backupData();
    showToast(`备份完成：${result.path}`);
  }));

  els.settingsExportCsv?.addEventListener('click', () => safeAction(async () => {
    const result = await window.forexceltechApp.exportCsv();
    showToast(`导出完成：${result.dir}`);
  }));

  els.aiSelectAudio?.addEventListener('click', () => safeAction(selectAiAudio));
  els.aiTranscribeAudio?.addEventListener('click', () => safeAction(transcribeAiAudio));
  els.aiGenerateDrafts.addEventListener('click', () => safeAction(generateAiDrafts));
  els.aiConfirmDrafts.addEventListener('click', () => safeAction(confirmAiDrafts));
  els.aiLinkedCustomerTrigger?.addEventListener('click', () => openAiAssociationPicker('customer'));
  els.aiLinkedContactTrigger?.addEventListener('click', () => openAiAssociationPicker('contact'));
  els.aiLoadSample.addEventListener('click', () => {
    els.aiTranscript.value = getAiSampleTranscript();
    els.aiTranscript.focus();
  });
  els.aiClearDrafts.addEventListener('click', () => {
    els.aiTranscript.value = '';
    state.aiDraftResult = null;
    state.aiBaseDraftResult = null;
    state.aiAudioFile = null;
    state.aiLinked = { customerId: '', contactId: '' };
    state.aiCustomerDecision = { mode: '', customerId: '' };
    updateAiAudioStatus();
    renderAiAssociationOptions();
    renderAiDrafts();
  });

  els.settingsForm.addEventListener('submit', (event) => {
    event.preventDefault();
    safeAction(saveSettings);
  });
  els.settingsTest.addEventListener('click', () => safeAction(testAiConnection));
  els.settingsRestoreBackup?.addEventListener('click', () => safeAction(restoreBackupDatabase));
  els.settingsAiMode.addEventListener('change', updateSettingsModeState);
  document.querySelectorAll('[data-calendar-scheme]').forEach((button) => {
    button.addEventListener('click', () => applyCalendarColorScheme(button));
  });
  [els.settingsCalendarVisited, els.settingsCalendarPlanned].forEach((input) => {
    input?.addEventListener('input', updateCalendarColorPreview);
  });
  els.calendarYearPicker?.addEventListener('click', () => openCalendarYearPicker());
  els.calendarMonthPicker?.addEventListener('click', () => openCalendarMonthPicker());
  els.calendarTodayButton?.addEventListener('click', () => safeAction(showCurrentCalendarMonth));
  els.calendarGrid?.addEventListener('wheel', (event) => handleCalendarWheel(event), { passive: false });

  els.dialogClose.addEventListener('click', closeDialog);
  els.dialogCancel.addEventListener('click', closeDialog);
  els.detailDialogClose.addEventListener('click', closeDetailDialog);
  window.addEventListener('resize', () => {
    mapChart?.resize();
  });
}

async function refreshAll() {
  await Promise.all([loadDashboard(), loadFilterOptions(), loadCustomers(), loadContacts(), loadVisits(), loadAiAssociationData(), loadSettings(), loadCalendarSummary(), loadMapCustomers()]);
  renderFilterOptions();
  renderMapFilterOptions();
  renderDashboard();
  renderCustomers();
  renderAllContacts();
  renderAllVisits();
  renderCustomerMap();
  renderAiAssociationOptions();
  renderSettings();
  if (state.customerViewMode === 'detail' && state.selectedCustomerId) {
    state.customerViewMode = 'list';
  }
  updateCustomerViewMode();
}

async function loadDashboard() {
  const dashboard = await window.forexceltechApp.getDashboard();
  els.metricCustomers.textContent = String(dashboard.customer_count || 0);
  els.metricContacts.textContent = String(dashboard.contact_count || 0);
  els.metricVisits.textContent = String(dashboard.visit_count || 0);
}

async function loadCustomers() {
  state.customers = await window.forexceltechApp.listCustomers({
    search: state.search,
    ...state.filters
  });
  if (!state.customers.some((customer) => customer.id === state.selectedCustomerId)) {
    state.selectedCustomerId = null;
    state.selectedBundle = null;
    state.customerViewMode = 'list';
  }
}

async function loadContacts() {
  state.contacts = await window.forexceltechApp.listContacts(state.search);
}

async function loadVisits() {
  state.visits = await window.forexceltechApp.listVisits(state.search);
}

async function loadAiAssociationData() {
  const [customers, contacts] = await Promise.all([
    window.forexceltechApp.listCustomers({ search: '' }),
    window.forexceltechApp.listContacts('')
  ]);
  state.aiCustomers = customers;
  state.aiContacts = contacts;
}

async function loadFilterOptions() {
  state.filterOptions = await window.forexceltechApp.getCustomerFilterOptions();
}

async function loadSettings() {
  state.settings = await window.forexceltechApp.getSettings();
}

async function loadCalendarSummary() {
  state.calendar.summary = await window.forexceltechApp.getCalendarMonthSummary({
    year: state.calendar.year,
    month: state.calendar.month
  });
}

async function loadMapCustomers() {
  state.map.customers = await window.forexceltechApp.listCustomers({
    search: state.activeView === 'customer-map' ? state.search : '',
    status: state.map.filters.status,
    industry: state.map.filters.industry,
    region: ''
  });
}

function renderSettings() {
  const settings = state.settings;
  if (!settings) {
    return;
  }
  els.settingsAiMode.value = settings.aiMode || 'local';
  els.settingsBaseUrl.value = settings.ollamaBaseUrl || 'http://localhost:11434';
  els.settingsExtractionModel.value = settings.ollamaModel || 'qwen3:8b';
  els.settingsCalendarVisited.value = settings.calendar?.visitedColor || '#B5EAD7';
  els.settingsCalendarPlanned.value = settings.calendar?.plannedColor || '#FFB7B2';
  els.settingsCalendarBadgeMax.value = String(settings.calendar?.badgeMax || 99);
  els.settingsConfigPath.textContent = settings.configPath || 'D:\\FOREXCELTECHClientManager\\config.json';
  els.settingsStatus.textContent = settings.aiMode === 'ollama'
    ? `Ollama 本地模型：${settings.ollamaModel || 'qwen3:8b'}`
    : '仅本地规则模式';
  updateSettingsModeState();
  updateCalendarColorPreview();
}

function updateSettingsModeState() {
  const ollama = els.settingsAiMode.value === 'ollama';
  [els.settingsBaseUrl, els.settingsExtractionModel, els.settingsTest]
    .forEach((control) => {
      control.disabled = !ollama;
    });
}

function applyCalendarColorScheme(button) {
  const visited = String(button?.dataset?.visited || '').trim();
  const planned = String(button?.dataset?.planned || '').trim();
  if (!visited || !planned) {
    return;
  }
  els.settingsCalendarVisited.value = visited;
  els.settingsCalendarPlanned.value = planned;
  updateCalendarColorPreview();
}

function updateCalendarColorPreview() {
  const visited = els.settingsCalendarVisited?.value || '#B5EAD7';
  const planned = els.settingsCalendarPlanned?.value || '#FFB7B2';
  const visitedPreview = els.settingsCalendarPreview?.querySelector('[data-preview="visited"]');
  const plannedPreview = els.settingsCalendarPreview?.querySelector('[data-preview="planned"]');
  if (visitedPreview) {
    visitedPreview.style.background = visited;
  }
  if (plannedPreview) {
    plannedPreview.style.background = planned;
  }
  document.querySelectorAll('[data-calendar-scheme]').forEach((button) => {
    const active = button.dataset.visited?.toLowerCase() === visited.toLowerCase()
      && button.dataset.planned?.toLowerCase() === planned.toLowerCase();
    button.classList.toggle('active', active);
  });
}

async function saveSettings() {
  const payload = {
    aiMode: els.settingsAiMode.value,
    ollamaBaseUrl: els.settingsBaseUrl.value,
    ollamaModel: els.settingsExtractionModel.value,
    calendar: {
      visitedColor: els.settingsCalendarVisited.value,
      plannedColor: els.settingsCalendarPlanned.value,
      badgeMax: els.settingsCalendarBadgeMax.value
    }
  };

  els.settingsSave.disabled = true;
  els.settingsSave.textContent = '保存中';
  try {
    state.settings = await window.forexceltechApp.saveSettings(payload);
    renderSettings();
    renderCalendar();
    updateAiAudioStatus();
    showToast('设置已保存');
  } finally {
    els.settingsSave.disabled = false;
    els.settingsSave.textContent = '保存设置';
  }
}

async function testAiConnection() {
  els.settingsTest.disabled = true;
  els.settingsTest.textContent = '测试中';
  try {
    const result = await window.forexceltechApp.testAiConnection();
    showToast(`Ollama 连接成功：${result.baseUrl}，模型 ${result.model} 可用`);
  } finally {
    els.settingsTest.disabled = els.settingsAiMode.value !== 'ollama';
    els.settingsTest.textContent = '测试连接';
  }
}

async function restoreBackupDatabase() {
  const confirmed = confirm('确认从备份数据库恢复当前数据？\n\n恢复前系统会自动备份当前数据库。恢复后，当前数据将被备份文件替换。');
  if (!confirmed) {
    return;
  }
  const result = await window.forexceltechApp.restoreBackup();
  if (result.canceled) {
    showToast('已取消数据恢复', 'warning');
    return;
  }
  state.selectedCustomerId = null;
  state.selectedBundle = null;
  state.customerViewMode = 'list';
  await refreshAll();
  showToast(`数据恢复完成，恢复前备份已保存：${result.currentBackupPath}`);
}

function renderFilterOptions() {
  fillSelect(els.filterIndustry, '全部行业', state.filterOptions.industries, state.filters.industry);
  fillSelect(els.filterRegion, '全部区域', getRegionOptions(), state.filters.region);
}

function renderMapFilterOptions() {
  fillSelect(els.mapFilterIndustry, '全部行业', state.filterOptions.industries, state.map.filters.industry);
}

function fillSelect(select, emptyLabel, values, selectedValue) {
  select.innerHTML = [
    `<option value="">${escapeHtml(emptyLabel)}</option>`,
    ...values.map((value) => `<option value="${escapeHtml(value)}" ${value === selectedValue ? 'selected' : ''}>${escapeHtml(value)}</option>`)
  ].join('');
}

async function switchView(view, options = {}) {
  state.activeView = view;
  document.querySelectorAll('.view').forEach((section) => {
    section.classList.toggle('active', section.id === `${view}-view`);
  });
  document.querySelectorAll('.nav-item').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === view);
  });
  updateSearchPlaceholder();

  if (view === 'dashboard') {
    await loadCalendarSummary();
    renderDashboard();
  } else if (view === 'contacts') {
    await loadContacts();
    renderAllContacts();
  } else if (view === 'visits') {
    await loadVisits();
    renderAllVisits();
  } else if (view === 'customers') {
    if (!options.keepCustomerDetail) {
      state.customerViewMode = 'list';
      state.selectedBundle = null;
    }
    await loadCustomers();
    renderCustomers();
  } else if (view === 'ai-entry') {
    await loadAiAssociationData();
    renderAiAssociationOptions();
    updateAiAudioStatus();
    renderAiDrafts();
  } else if (view === 'customer-map') {
    await loadMapCustomers();
    renderCustomerMap();
  } else if (view === 'settings') {
    await loadSettings();
    renderSettings();
  }
}

async function runActiveSearch() {
  if (state.activeView === 'ai-entry') {
    return;
  }

  if (state.activeView === 'contacts') {
    await loadContacts();
    renderAllContacts();
    return;
  }

  if (state.activeView === 'visits') {
    await loadVisits();
    renderAllVisits();
    return;
  }

  if (state.activeView === 'customer-map') {
    await loadMapCustomers();
    renderCustomerMap();
    return;
  }

  await loadCustomers();
  renderCustomers();
  renderDashboard();
  if (state.activeView !== 'customers') {
    await switchView('customers');
  }
}

function updateSearchPlaceholder() {
  const placeholders = {
    dashboard: '搜索客户名称、简称、行业或区域',
    customers: '搜索客户名称、简称、行业或区域',
    contacts: '搜索联系人、客户、职位、部门、关系或偏好',
    visits: '搜索拜访主题、客户、参与人、摘要或下一步动作',
    'ai-entry': '智能录入页不使用全局搜索',
    'customer-map': '搜索地图中的客户名称、简称、行业、省份、城市或地址',
    settings: '设置页不使用全局搜索'
  };
  els.globalSearch.placeholder = placeholders[state.activeView] || placeholders.customers;
  els.globalSearch.disabled = state.activeView === 'ai-entry' || state.activeView === 'settings';
}

function resetPagination(type) {
  if (state.pagination[type]) {
    state.pagination[type].page = 1;
  }
}

function resetPaginationForActiveView() {
  if (state.activeView === 'contacts') {
    resetPagination('contacts');
  } else if (state.activeView === 'visits') {
    resetPagination('visits');
  } else if (state.activeView === 'customers') {
    resetPagination('customers');
  }
}

function getPageItems(type, items) {
  const pager = state.pagination[type];
  if (!pager) {
    return items;
  }
  pager.pageSize = PAGE_SIZE_OPTIONS.includes(Number(pager.pageSize)) ? Number(pager.pageSize) : 50;
  const totalPages = Math.max(1, Math.ceil(items.length / pager.pageSize));
  pager.page = Math.min(Math.max(1, Number(pager.page) || 1), totalPages);
  const start = (pager.page - 1) * pager.pageSize;
  return items.slice(start, start + pager.pageSize);
}

function setPaginationToItem(type, items, id) {
  const pager = state.pagination[type];
  if (!pager || !id) {
    return;
  }
  const index = items.findIndex((item) => item.id === id);
  if (index >= 0) {
    pager.page = Math.floor(index / pager.pageSize) + 1;
  }
}

function paginationContainer(type) {
  return {
    customers: els.customerPagination,
    contacts: els.contactsPagination,
    visits: els.visitsPagination
  }[type];
}

function renderPagination(type, total) {
  const container = paginationContainer(type);
  const pager = state.pagination[type];
  if (!container || !pager || total <= 0) {
    if (container) {
      container.hidden = true;
      container.innerHTML = '';
    }
    return;
  }

  const totalPages = Math.max(1, Math.ceil(total / pager.pageSize));
  pager.page = Math.min(Math.max(1, pager.page), totalPages);
  const firstItem = (pager.page - 1) * pager.pageSize + 1;
  const lastItem = Math.min(total, pager.page * pager.pageSize);
  container.hidden = false;
  container.innerHTML = `
    <div class="pagination-left">
      <span class="pagination-range">${firstItem}-${lastItem}</span>
      <label>
        <span>每页</span>
        <select data-page-size aria-label="每页显示条数">
          ${PAGE_SIZE_OPTIONS.map((size) => `<option value="${size}" ${size === pager.pageSize ? 'selected' : ''}>${size} 条</option>`).join('')}
        </select>
      </label>
      <span>共 ${total} 条</span>
    </div>
    <div class="pagination-actions" aria-label="分页">
      <button class="icon-button" type="button" data-page-action="first" aria-label="第一页" ${pager.page <= 1 ? 'disabled' : ''}>|&lt;</button>
      <button class="icon-button" type="button" data-page-action="prev" aria-label="上一页" ${pager.page <= 1 ? 'disabled' : ''}>&lt;</button>
      <span>第 ${pager.page} / ${totalPages} 页</span>
      <button class="icon-button" type="button" data-page-action="next" aria-label="下一页" ${pager.page >= totalPages ? 'disabled' : ''}>&gt;</button>
      <button class="icon-button" type="button" data-page-action="last" aria-label="最后一页" ${pager.page >= totalPages ? 'disabled' : ''}>&gt;|</button>
    </div>
  `;
}

function updatePagination(type, action, value) {
  const pager = state.pagination[type];
  if (!pager) {
    return;
  }
  const total = {
    customers: state.customers.length,
    contacts: state.contacts.length,
    visits: state.visits.length
  }[type] || 0;
  const totalPages = Math.max(1, Math.ceil(total / pager.pageSize));

  if (action === 'size') {
    pager.pageSize = PAGE_SIZE_OPTIONS.includes(value) ? value : 50;
    pager.page = 1;
  } else if (action === 'first') {
    pager.page = 1;
  } else if (action === 'prev') {
    pager.page = Math.max(1, pager.page - 1);
  } else if (action === 'next') {
    pager.page = Math.min(totalPages, pager.page + 1);
  } else if (action === 'last') {
    pager.page = totalPages;
  }

  if (type === 'customers') {
    renderCustomers();
  } else if (type === 'contacts') {
    renderAllContacts();
  } else if (type === 'visits') {
    renderAllVisits();
  }
}

function getCalendarSettings() {
  return {
    visitedColor: state.settings?.calendar?.visitedColor || '#B5EAD7',
    plannedColor: state.settings?.calendar?.plannedColor || '#FFB7B2',
    badgeMax: Number(state.settings?.calendar?.badgeMax || 99)
  };
}

function renderCalendar() {
  if (!els.calendarGrid) {
    return;
  }

  const { year, month } = state.calendar;
  const settings = getCalendarSettings();
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const leadingDays = (firstDay.getDay() + 6) % 7;
  const totalCells = Math.ceil((leadingDays + lastDay.getDate()) / 7) * 7;
  const summaryByDate = new Map((state.calendar.summary?.days || []).map((day) => [day.date, day]));
  const todayKey = toDateKey(new Date());

  if (els.calendarYearPicker) {
    els.calendarYearPicker.textContent = `${year}年`;
  }
  if (els.calendarMonthPicker) {
    els.calendarMonthPicker.textContent = `${month}月`;
  }
  els.calendarGrid.innerHTML = Array.from({ length: totalCells }, (_, index) => {
    const dayNumber = index - leadingDays + 1;
    const inMonth = dayNumber >= 1 && dayNumber <= lastDay.getDate();
    const date = inMonth ? new Date(year, month - 1, dayNumber) : null;
    const dateKey = date ? toDateKey(date) : '';
    const summary = summaryByDate.get(dateKey);
    const visited = Number(summary?.visited_count || 0);
    const planned = Number(summary?.planned_count || 0);
    const customerCount = Math.max(Number(summary?.customer_count || 0), visited, planned);
    const status = planned ? 'planned' : visited ? 'visited' : '';
    const color = status === 'visited'
      ? settings.visitedColor
      : status === 'planned'
        ? settings.plannedColor
        : '';
    const badge = customerCount > 0 ? Math.min(customerCount, settings.badgeMax) : '';
    const badgeText = customerCount > settings.badgeMax ? `${settings.badgeMax}+` : String(badge);
    const style = color ? ` style="--calendar-day-color: ${escapeHtml(color)}"` : '';
    const lunarMeta = date ? getLunarDayMeta(date) : { label: '', holiday: '' };
    const title = status
      ? `${dateKey}：${lunarMeta.label}，已拜访 ${visited}，计划未完成 ${planned}`
      : `${dateKey || '非本月日期'}：${lunarMeta.label || '暂无拜访安排'}`;

    return `
      <button class="calendar-day ${inMonth ? '' : 'muted'} ${status ? `has-${status}` : ''} ${lunarMeta.holiday ? 'is-holiday' : ''} ${dateKey === todayKey ? 'today' : ''}" type="button" ${inMonth ? `data-date="${dateKey}"` : 'disabled'}${style} title="${escapeHtml(title)}">
        <span class="calendar-date-stack">
          <span class="calendar-day-number">${inMonth ? dayNumber : ''}</span>
          <span class="calendar-lunar-label">${display(lunarMeta.label, '')}</span>
        </span>
        ${badge ? `<span class="calendar-badge">${escapeHtml(badgeText)}</span>` : ''}
        ${status ? `<span class="calendar-status-label">${calendarStatusLabel(status)}</span>` : ''}
      </button>
    `;
  }).join('');

  els.calendarGrid.querySelectorAll('[data-date]').forEach((button) => {
    button.addEventListener('click', () => safeAction(() => openCalendarDayDialog(button.dataset.date)));
  });
}

function calendarStatusLabel(status) {
  if (status === 'visited') {
    return '已访';
  }
  if (status === 'planned') {
    return '计划';
  }
  return '';
}

async function changeCalendarMonth(delta) {
  const date = new Date(state.calendar.year, state.calendar.month - 1 + delta, 1);
  state.calendar.year = date.getFullYear();
  state.calendar.month = date.getMonth() + 1;
  await loadCalendarSummary();
  renderCalendar();
}

async function showCurrentCalendarMonth() {
  const now = new Date();
  state.calendar.year = now.getFullYear();
  state.calendar.month = now.getMonth() + 1;
  await loadCalendarSummary();
  renderCalendar();
}

function handleCalendarWheel(event) {
  if (Math.abs(event.deltaY) < 18 || calendarWheelLock) {
    return;
  }
  event.preventDefault();
  calendarWheelLock = true;
  safeAction(async () => {
    await changeCalendarMonth(event.deltaY > 0 ? 1 : -1);
  }).finally(() => {
    window.setTimeout(() => {
      calendarWheelLock = false;
    }, 260);
  });
}

function openCalendarYearPicker() {
  openCalendarPickerPopover(els.calendarYearPicker, {
    label: '选择年份',
    className: 'calendar-year-popover',
    value: state.calendar.year,
    min: CALENDAR_YEAR_MIN,
    max: CALENDAR_YEAR_MAX,
    cyclic: false,
    formatLabel: (year) => `${year}年`,
    onSelect: async (year) => {
      state.calendar.year = Number(year);
      await loadCalendarSummary();
      renderCalendar();
      showToast(`已定位到 ${calendarMonthLabel()}`);
    }
  });
}

function openCalendarMonthPicker() {
  openCalendarPickerPopover(els.calendarMonthPicker, {
    label: '选择月份',
    className: 'calendar-month-popover',
    value: state.calendar.month,
    min: 1,
    max: 12,
    cyclic: true,
    formatLabel: (month) => `${month}月`,
    onSelect: async (month) => {
      state.calendar.month = Number(month);
      await loadCalendarSummary();
      renderCalendar();
      showToast(`已定位到 ${calendarMonthLabel()}`);
    }
  });
}

function openCalendarPickerPopover(anchor, config) {
  closeCalendarPickerPopover();
  if (!anchor) {
    return;
  }

  let activeValue = clampPickerValue(Number(config.value), config);
  const popover = document.createElement('div');
  popover.className = `calendar-picker-popover ${config.className || ''}`;
  popover.innerHTML = `
    <div class="calendar-picker-title">${escapeHtml(config.label)}</div>
    <div class="calendar-picker-options-wrap">
      <div class="calendar-picker-options"></div>
      <div class="calendar-picker-scrollbar" aria-hidden="true"><span></span></div>
    </div>
  `;
  document.body.appendChild(popover);

  function renderOptions() {
    const options = getCalendarPickerWindow(activeValue, config);
    const optionsEl = popover.querySelector('.calendar-picker-options');
    optionsEl.innerHTML = options.map((value) => `
      <button class="calendar-picker-option ${value === activeValue ? 'active' : ''}" type="button" data-value="${escapeHtml(value)}">
        ${escapeHtml(config.formatLabel(value))}
      </button>
    `).join('');
    optionsEl.querySelectorAll('[data-value]').forEach((button) => {
      button.addEventListener('click', () => {
        closeCalendarPickerPopover();
        document.removeEventListener('pointerdown', closeOnOutside);
        safeAction(() => config.onSelect(button.dataset.value));
      });
    });
    updateCalendarPickerScrollbar(popover, activeValue, config);
  }

  renderOptions();
  positionCalendarPickerPopover(anchor, popover);

  const closeOnOutside = (event) => {
    if (!popover.contains(event.target) && event.target !== anchor) {
      closeCalendarPickerPopover();
      document.removeEventListener('pointerdown', closeOnOutside);
    }
  };
  window.setTimeout(() => document.addEventListener('pointerdown', closeOnOutside), 0);

  popover.addEventListener('wheel', (event) => {
    if (Math.abs(event.deltaY) < 6) {
      return;
    }
    event.preventDefault();
    activeValue = nextCalendarPickerValue(activeValue, event.deltaY > 0 ? 1 : -1, config);
    renderOptions();
  });
}

function updateCalendarPickerScrollbar(popover, activeValue, config) {
  const thumb = popover.querySelector('.calendar-picker-scrollbar span');
  if (!thumb) {
    return;
  }
  const total = Math.max(1, config.max - config.min + 1);
  const height = Math.max(28, Math.min(58, (CALENDAR_PICKER_VISIBLE_COUNT / total) * 100));
  const denominator = Math.max(1, total - 1);
  const index = Math.max(0, Math.min(total - 1, activeValue - config.min));
  const top = (index / denominator) * (100 - height);
  thumb.style.height = `${height}%`;
  thumb.style.top = `${top}%`;
}

function clampPickerValue(value, config) {
  if (!Number.isFinite(value)) {
    return config.min;
  }
  return Math.min(config.max, Math.max(config.min, value));
}

function nextCalendarPickerValue(value, delta, config) {
  const next = value + delta;
  if (config.cyclic) {
    if (next > config.max) {
      return config.min;
    }
    if (next < config.min) {
      return config.max;
    }
    return next;
  }
  return clampPickerValue(next, config);
}

function getCalendarPickerWindow(activeValue, config) {
  const count = CALENDAR_PICKER_VISIBLE_COUNT;
  const values = [];
  if (config.cyclic) {
    for (let offset = -2; offset <= 1; offset += 1) {
      let value = activeValue + offset;
      while (value < config.min) {
        value += config.max - config.min + 1;
      }
      while (value > config.max) {
        value -= config.max - config.min + 1;
      }
      values.push(value);
    }
    return values;
  }

  const total = config.max - config.min + 1;
  const start = Math.min(
    Math.max(config.min, activeValue - 2),
    Math.max(config.min, config.max - Math.min(count, total) + 1)
  );
  for (let index = 0; index < Math.min(count, total); index += 1) {
    values.push(start + index);
  }
  return values;
}

function positionCalendarPickerPopover(anchor, popover) {
  const rect = anchor.getBoundingClientRect();
  const width = popover.offsetWidth;
  const left = Math.max(12, Math.min(window.innerWidth - width - 12, rect.right - width));
  const top = Math.min(window.innerHeight - popover.offsetHeight - 12, rect.bottom + 8);
  popover.style.left = `${left}px`;
  popover.style.top = `${Math.max(12, top)}px`;
}

function closeCalendarPickerPopover() {
  document.querySelector('.calendar-picker-popover')?.remove();
}

async function refreshCalendarAndDashboard() {
  await Promise.all([loadDashboard(), loadCalendarSummary(), loadCustomers(), loadVisits()]);
  renderDashboard();
  if (state.activeView === 'visits') {
    renderAllVisits();
  }
}

async function openCalendarDayDialog(date) {
  state.calendar.selectedDate = date;
  const detail = await window.forexceltechApp.getCalendarDayDetail(date);
  const isPast = isPastDateKey(date);
  els.detailDialogTitle.textContent = formatDateOnly(date);
  els.detailDialogBody.innerHTML = renderCalendarDayDetail(detail);
  els.detailDialogActions.innerHTML = `
    <div class="dialog-action-right detail-business-actions">
      ${isPast
        ? '<button class="secondary-button" type="button" disabled title="过去日期不能新增计划拜访">过去日期不可新增计划</button>'
        : '<button class="primary-button" type="button" data-action="add-plan">新增计划拜访</button>'}
    </div>
  `;
  bindCalendarDayActions(detail);
  els.detailDialog.showModal();
}

function renderCalendarDayDetail(detail) {
  const date = new Date(`${detail.date}T00:00:00`);
  const weekday = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][date.getDay()];
  const statusBadges = [
    detail.visits.length ? detailBadge(`已拜访 ${detail.visits.length}`, 'success') : detailBadge('暂无正式拜访', 'muted'),
    detail.plans.length ? detailBadge(`计划 ${detail.plans.length}`, 'warning') : detailBadge('暂无计划', 'muted')
  ].join('');
  return `
    ${detailHero({
      title: formatDateOnly(detail.date),
      subtitle: `${weekday} · 日历拜访安排`,
      badges: statusBadges
    })}
    <div class="calendar-detail-layout">
      <section class="calendar-detail-section detail-section-card">
        <div class="calendar-detail-section-head">
          <h3>已拜访</h3>
          <span>${detail.visits.length} 条</span>
        </div>
        ${detail.visits.length ? detail.visits.map(renderCalendarVisitItem).join('') : '<div class="empty inline-empty">当天暂无正式拜访记录。</div>'}
      </section>
      <section class="calendar-detail-section detail-section-card">
        <div class="calendar-detail-section-head">
          <h3>计划拜访</h3>
          <span>${detail.plans.length} 条</span>
        </div>
        ${detail.plans.length ? detail.plans.map(renderCalendarPlanItem).join('') : '<div class="empty inline-empty">当天暂无计划拜访。</div>'}
      </section>
    </div>
  `;
}

function renderCalendarVisitItem(visit) {
  return `
    <article class="calendar-detail-item">
      <div>
        <strong>${display(visit.subject)}</strong>
        <span>${display(visit.customer_name)} · ${visitTypeLabel(visit.type)} · ${formatDate(visit.occurred_at)}</span>
        <p>${display(visit.summary || visit.details, '暂无摘要')}</p>
      </div>
      <button class="ghost-button" type="button" data-action="open-visit" data-id="${escapeHtml(visit.id)}">查看</button>
    </article>
  `;
}

function renderCalendarPlanItem(plan) {
  const done = plan.status === 'done';
  return `
    <article class="calendar-detail-item ${done ? 'done' : ''}">
      <div>
        <strong>${display(plan.purpose || '计划拜访')}</strong>
        <span>${display(plan.customer_name)}${plan.contact_name ? ` · ${display(plan.contact_name)}` : ''} · ${display(plan.planned_time, '未定时间')} · ${planPriorityLabel(plan.priority)}</span>
        <p>${display(plan.notes, '暂无备注')}</p>
      </div>
      <div class="calendar-detail-actions">
        ${done ? '<span class="compact-note">已完成</span>' : `<button class="ghost-button" type="button" data-action="complete-plan" data-id="${escapeHtml(plan.id)}">完成</button>`}
        <button class="ghost-button" type="button" data-action="edit-plan" data-id="${escapeHtml(plan.id)}">编辑</button>
        <button class="ghost-button danger-text" type="button" data-action="cancel-plan" data-id="${escapeHtml(plan.id)}">取消</button>
      </div>
    </article>
  `;
}

function bindCalendarDayActions(detail) {
  els.detailDialogActions.querySelector('[data-action="add-plan"]')?.addEventListener('click', () => {
    closeDetailDialog();
    safeAction(() => openVisitPlanDialog({ planned_date: detail.date }));
  });
  els.detailDialogBody.querySelectorAll('[data-action="open-visit"]').forEach((button) => {
    button.addEventListener('click', () => {
      closeDetailDialog();
      openVisitDetailDialog(button.dataset.id);
    });
  });
  els.detailDialogBody.querySelectorAll('[data-action="edit-plan"]').forEach((button) => {
    const plan = detail.plans.find((item) => item.id === button.dataset.id);
    button.addEventListener('click', () => {
      closeDetailDialog();
      safeAction(() => openVisitPlanDialog(plan));
    });
  });
  els.detailDialogBody.querySelectorAll('[data-action="complete-plan"]').forEach((button) => {
    const plan = detail.plans.find((item) => item.id === button.dataset.id);
    button.addEventListener('click', () => {
      closeDetailDialog();
      openCompleteVisitPlanDialog(plan);
    });
  });
  els.detailDialogBody.querySelectorAll('[data-action="cancel-plan"]').forEach((button) => {
    button.addEventListener('click', () => safeAction(async () => {
      if (!confirm('确认取消这条计划拜访？')) {
        return;
      }
      await window.forexceltechApp.cancelVisitPlan(button.dataset.id);
      await refreshCalendarAndDashboard();
      closeDetailDialog();
      await openCalendarDayDialog(detail.date);
      showToast('计划拜访已取消');
    }));
  });
}

function getCustomerMapLocation(customer) {
  const source = [
    customer.province,
    customer.city,
    customer.region,
    customer.address
  ].filter(Boolean).join(' ');
  const recognized = recognizeAddress(source);
  const province = normalizeProvince(customer.province) || recognized.province || inferProvince(source);
  const city = normalizeCity(customer.city) || recognized.city || inferCity(source, province);
  return { province, city };
}

function normalizeProvince(value = '') {
  const text = String(value || '').trim();
  if (!text) {
    return '';
  }
  if (PROVINCE_ALIASES.has(text)) {
    return PROVINCE_ALIASES.get(text);
  }
  const matched = PROVINCE_MAP_POINTS.find((province) => text.includes(province.name) || province.name.includes(text));
  return matched?.name || '';
}

function inferProvince(text = '') {
  return PROVINCE_MAP_POINTS.find((province) => text.includes(province.name))?.name || '';
}

function normalizeCity(value = '') {
  return String(value || '').trim().replace(/市$/, '');
}

function inferCity(text = '', province = '') {
  const explicit = String(text || '').match(/([\u4e00-\u9fa5]{2,8})市/);
  if (explicit) {
    return explicit[1];
  }
  const knownCity = Array.from(CITY_PROVINCE_MAP.keys()).find((city) => text.includes(city))
    || Object.keys(CITY_COORDS).find((city) => text.includes(city));
  if (knownCity && knownCity !== province) {
    return knownCity;
  }
  return '';
}

function provinceToRegion(province = '') {
  return PROVINCE_REGION_MAP[normalizeProvince(province) || province] || '';
}

function recognizeAddress(value = '') {
  const text = String(value || '').trim();
  if (!text) {
    return { region: '', province: '', city: '' };
  }

  let province = inferProvince(text);
  let city = '';

  const provinceCityMatch = text.match(/([\u4e00-\u9fa5]{2,8}?)(?:省|自治区|特别行政区)?\s*([\u4e00-\u9fa5]{2,8})市/);
  if (provinceCityMatch) {
    const candidateProvince = normalizeProvince(provinceCityMatch[1]);
    if (candidateProvince) {
      province = candidateProvince;
      city = normalizeCity(provinceCityMatch[2]);
    }
  }

  if (!province) {
    const cityMatch = Array.from(CITY_PROVINCE_MAP.keys())
      .sort((a, b) => b.length - a.length)
      .find((candidate) => text.includes(candidate));
    if (cityMatch) {
      city = cityMatch;
      province = CITY_PROVINCE_MAP.get(cityMatch) || '';
    }
  }

  if (province && !city) {
    if (['北京', '天津', '上海', '重庆', '香港', '澳门'].includes(province)) {
      city = province;
    } else {
      city = inferCity(text, province);
    }
  }

  return {
    region: provinceToRegion(province),
    province,
    city
  };
}

function enrichMapCustomers(customers = state.map.customers) {
  return customers.map((customer) => {
    const location = getCustomerMapLocation(customer);
    return { ...customer, mapProvince: location.province, mapCity: location.city };
  });
}

function groupBy(items, keyGetter) {
  return items.reduce((groups, item) => {
    const key = keyGetter(item) || '';
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(item);
    return groups;
  }, new Map());
}

function renderCustomerMap() {
  if (!els.mapCanvas) {
    return;
  }
  const customers = enrichMapCustomers();
  const located = customers.filter((customer) => customer.mapProvince && customer.mapCity);
  const missing = customers.filter((customer) => !customer.mapProvince || !customer.mapCity);

  renderMapSummary(located, missing);
  els.mapBackChina.hidden = !state.map.selectedProvince;

  if (!ensureMapChart()) {
    renderMapUnavailable();
    return;
  }

  if (state.map.selectedProvince) {
    renderProvinceMap(located, missing);
  } else {
    renderChinaMap(located, missing);
  }
}

function getMapGeojsonAssets() {
  const chinaAssets = window.FOREXCELTECH_MAP_GEOJSON;
  if (!chinaAssets) {
    return null;
  }
  return {
    ...chinaAssets,
    neighbors: window.FOREXCELTECH_NEIGHBOR_GEOJSON?.countries || null
  };
}

function buildChinaContextGeojson(assets) {
  const neighborFeatures = assets.neighbors?.features || [];
  return {
    type: 'FeatureCollection',
    features: [
      ...neighborFeatures.map((feature) => ({
        ...feature,
        properties: {
          ...feature.properties,
          context: true
        }
      })),
      ...assets.china.features.map((feature) => ({
        ...feature,
        properties: {
          ...feature.properties,
          province: normalizeProvince(feature.properties?.name)
        }
      }))
    ]
  };
}

function getMapAreaColor(count, maxCount) {
  if (!count) {
    return '#f4f8fc';
  }
  const ratio = Math.min(1, count / Math.max(1, maxCount));
  if (ratio > 0.75) {
    return '#6aaef2';
  }
  if (ratio > 0.45) {
    return '#9dccff';
  }
  return '#d8ebff';
}

function getChinaMapLabelStyle(count, maxCount) {
  if (!count) {
    return {
      color: '#5d6b7c',
      textBorderColor: 'rgba(255, 255, 255, 0.7)',
      textBorderWidth: 1
    };
  }
  const ratio = Math.min(1, count / Math.max(1, maxCount));
  if (ratio >= 0.45) {
    return {
      color: '#fff',
      fontWeight: 700,
      textBorderColor: 'rgba(15, 43, 86, 0.55)',
      textBorderWidth: 2
    };
  }
  return {
    color: '#244466',
    fontWeight: 600,
    textBorderColor: 'rgba(255, 255, 255, 0.8)',
    textBorderWidth: 1
  };
}

function ensureMapChart() {
  const assets = getMapGeojsonAssets();
  if (!window.echarts || !assets?.china || !assets?.provinces) {
    return false;
  }
  if (mapChart && els.mapCanvas.clientWidth > 0 && mapChart.getWidth() === 0) {
    mapChart.dispose();
    mapChart = null;
  }
  if (!mapChart) {
    mapChart = window.echarts.init(els.mapCanvas, null, { renderer: 'canvas' });
  }
  registerEchartsMap(CHINA_ECHARTS_MAP, assets.china);
  return true;
}

function registerEchartsMap(name, geojson) {
  if (!name || !geojson || registeredEchartsMaps.has(name)) {
    return;
  }
  window.echarts.registerMap(name, geojson);
  registeredEchartsMaps.add(name);
}

function renderMapUnavailable() {
  els.mapTitle.textContent = '客户分布';
  if (els.mapSubtitle) {
    els.mapSubtitle.textContent = '';
    els.mapSubtitle.hidden = true;
  }
  els.mapCanvas.className = 'map-canvas map-unavailable';
  els.mapCanvas.innerHTML = '<div class="inline-empty">本地地图资源未加载。</div>';
}

function renderChinaMap(located, missing) {
  const byProvince = groupBy(located, (customer) => customer.mapProvince);
  const maxCount = Math.max(1, ...Array.from(byProvince.values()).map((items) => items.length));
  const assets = getMapGeojsonAssets();
  const contextGeojson = buildChinaContextGeojson(assets);
  registerEchartsMap(CHINA_CONTEXT_ECHARTS_MAP, contextGeojson);
  els.mapCanvas.querySelector('.map-floating-list')?.remove();
  els.mapTitle.textContent = '客户分布';
  if (els.mapSubtitle) {
    els.mapSubtitle.textContent = '';
    els.mapSubtitle.hidden = true;
  }
  els.mapCanvas.className = 'map-canvas echarts-map china-map';
  const data = contextGeojson.features.map((feature) => {
    if (feature.properties?.context) {
      return {
        name: feature.properties?.name || '',
        value: null,
        isContext: true,
        itemStyle: {
          areaColor: '#eef3f8',
          borderColor: '#d3dde8',
          borderWidth: 0.5
        },
        emphasis: {
          disabled: true,
          itemStyle: {
            areaColor: '#eef3f8'
          }
        },
        label: {
          show: true,
          color: 'rgba(93, 107, 124, 0.32)',
          fontSize: 10
        }
      };
    }
    const name = normalizeProvince(feature.properties?.province || feature.properties?.name);
    const labelOverride = CHINA_MAP_LABEL_OVERRIDES[name];
    const count = (byProvince.get(name) || []).length;
    return {
      name: feature.properties?.name || name,
      value: count,
      province: name,
      label: {
        ...getChinaMapLabelStyle(count, maxCount),
        ...(labelOverride || {})
      }
    };
  });
  mapChart.off('click');
  mapChart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        if (params.data?.isContext) {
          return '';
        }
        const province = normalizeProvince(params.data?.province || params.name);
        const count = (byProvince.get(province) || []).length;
        return `${escapeHtml(province)}<br/>客户：${count}`;
      }
    },
    visualMap: {
      min: 0,
      max: maxCount,
      show: false,
      inRange: {
        color: ['#edf6ff', '#b7dcff', '#6aaef2', '#0f52ba']
      }
    },
    series: [{
      type: 'map',
      map: CHINA_CONTEXT_ECHARTS_MAP,
      roam: true,
      boundingCoords: CHINA_CONTEXT_BOUNDS,
      zoom: CHINA_CONTEXT_INITIAL_ZOOM,
      center: [106, 31],
      scaleLimit: { min: CHINA_CONTEXT_INITIAL_ZOOM, max: 12 },
      label: {
        show: true,
        formatter: (params) => params.name,
        color: '#5d6b7c',
        fontSize: 11,
        fontWeight: 500
      },
      emphasis: {
        label: { color: '#0f52ba', fontWeight: 600 },
        itemStyle: { areaColor: '#d7ecff' }
      },
      select: {
        label: { color: '#0f52ba' },
        itemStyle: { areaColor: '#a9ceff' }
      },
      itemStyle: {
        borderColor: '#9fb9d8',
        borderWidth: 0.8,
        areaColor: '#edf6ff'
      },
      data
    }]
  }, true);

  mapChart.on('click', (params) => {
    if (params.data?.isContext) {
      return;
    }
    const province = normalizeProvince(params.data?.province || params.name);
    if (!province) {
      return;
    }
    state.map.selectedProvince = province;
    renderCustomerMap();
  });
  bindMapRoamGuard('china');
  mapChart.resize();
}

function renderProvinceMap(located, missing) {
  const province = state.map.selectedProvince;
  const provinceCustomers = located.filter((customer) => customer.mapProvince === province);
  const byCity = groupBy(provinceCustomers, (customer) => customer.mapCity);
  const assets = getMapGeojsonAssets();
  const provinceGeo = assets.provinces[province];
  if (!provinceGeo) {
    renderMapUnavailable();
    return;
  }
  const mapName = `forexceltech-province-${province}`;
  const maxCount = Math.max(1, ...Array.from(byCity.values()).map((items) => items.length));
  els.mapCanvas.querySelector('.map-floating-list')?.remove();
  registerEchartsMap(mapName, provinceGeo);
  els.mapTitle.textContent = `${province}客户分布`;
  if (els.mapSubtitle) {
    els.mapSubtitle.textContent = '';
    els.mapSubtitle.hidden = true;
  }
  els.mapCanvas.className = 'map-canvas echarts-map province-map';
  const cityRegions = provinceGeo.features.map((feature) => {
    const city = feature.properties?.name || '';
    const count = (byCity.get(city) || []).length;
    return {
      name: city,
      itemStyle: {
        areaColor: getMapAreaColor(count, maxCount)
      }
    };
  });
  const cityPoints = Array.from(byCity.entries()).map(([city, items], index) => {
    const coord = findCityCoordinate(provinceGeo, city) || getProvinceCenter(provinceGeo) || [105 + index * 0.2, 35 + index * 0.2];
    return {
      name: city,
      value: [...coord, items.length],
      customers: items
    };
  });
  mapChart.off('click');
  mapChart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        if (params.seriesType === 'scatter') {
          return `${escapeHtml(params.name)}<br/>客户：${params.value?.[2] || 0}`;
        }
        return `${escapeHtml(params.name)}<br/>客户：${params.value || 0}`;
      }
    },
    geo: {
      map: mapName,
      roam: true,
      zoom: 1.06,
      scaleLimit: { min: 0.8, max: 8 },
      regions: cityRegions,
      label: {
        show: true,
        color: '#6b7280',
        fontSize: 10
      },
      itemStyle: {
        borderColor: '#a9bfd7',
        borderWidth: 0.8,
        areaColor: '#f4f8fc'
      },
      emphasis: {
        label: { color: '#0f52ba', fontWeight: 600 },
        itemStyle: { areaColor: '#d7ecff' }
      }
    },
    series: [
      {
        name: '客户城市',
        type: 'scatter',
        coordinateSystem: 'geo',
        zlevel: 2,
        symbolSize: (value) => Math.min(34, 16 + Number(value?.[2] || 0) * 4),
        label: {
          show: true,
          formatter: (params) => String(params.value?.[2] || ''),
          color: '#fff',
          fontWeight: 700
        },
        itemStyle: {
          color: '#0f52ba',
          shadowBlur: 10,
          shadowColor: 'rgba(15, 82, 186, 0.26)'
        },
        data: cityPoints
      }
    ]
  }, true);

  mapChart.on('click', (params) => {
    if (params.seriesType !== 'scatter') {
      return;
    }
    renderMapCustomerPopover(`${province} · ${params.name}`, params.data?.customers || [], params.event?.event);
  });
  bindMapRoamGuard('province', provinceGeo);
  mapChart.resize();
}

function bindMapRoamGuard(mode, geojson = null) {
  if (!mapChart) {
    return;
  }
  mapChart.off('georoam');
  mapChart.on('georoam', () => {
    if (mapRoamGuardLock) {
      return;
    }
    mapRoamGuardLock = true;
    window.requestAnimationFrame(() => {
      try {
        clampMapRoam(mode, geojson);
      } finally {
        mapRoamGuardLock = false;
      }
    });
  });
}

function clampMapRoam(mode, geojson = null) {
  if (!mapChart) {
    return;
  }
  const option = mapChart.getOption();
  if (mode === 'china') {
    const series = option.series?.[0] || {};
    const center = clampCoordPair(series.center, CHINA_ROAM_LIMIT.lng, CHINA_ROAM_LIMIT.lat, [104, 32]);
    const zoom = clampNumber(Number(series.zoom || CHINA_CONTEXT_INITIAL_ZOOM), CHINA_ROAM_LIMIT.minZoom, CHINA_ROAM_LIMIT.maxZoom);
    mapChart.setOption({
      series: [{
        center,
        zoom
      }]
    }, false, true);
    return;
  }

  const bbox = getGeojsonBBox(geojson);
  if (!bbox) {
    return;
  }
  const lngPadding = Math.max(0.35, (bbox.maxLng - bbox.minLng) * 0.14);
  const latPadding = Math.max(0.35, (bbox.maxLat - bbox.minLat) * 0.14);
  const lngRange = [bbox.minLng - lngPadding, bbox.maxLng + lngPadding];
  const latRange = [bbox.minLat - latPadding, bbox.maxLat + latPadding];
  const geo = option.geo?.[0] || {};
  const fallback = [(bbox.minLng + bbox.maxLng) / 2, (bbox.minLat + bbox.maxLat) / 2];
  const center = clampCoordPair(geo.center, lngRange, latRange, fallback);
  const zoom = clampNumber(Number(geo.zoom || 1.06), 0.9, 9);
  mapChart.setOption({
    geo: [{
      center,
      zoom
    }]
  }, false, true);
}

function clampCoordPair(center, lngRange, latRange, fallback) {
  const current = Array.isArray(center) && center.length >= 2 ? center : fallback;
  return [
    clampNumber(Number(current[0]), lngRange[0], lngRange[1]),
    clampNumber(Number(current[1]), latRange[0], latRange[1])
  ];
}

function clampNumber(value, min, max) {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

function findCityCoordinate(geojson, city) {
  if (!geojson || !city) {
    return null;
  }
  const normalizedCity = normalizeCity(city);
  const feature = geojson.features?.find((item) => {
    const name = normalizeCity(item.properties?.name || '');
    return name === normalizedCity || name.includes(normalizedCity) || normalizedCity.includes(name);
  });
  return getFeatureCenter(feature) || null;
}

function getProvinceCenter(geojson) {
  const centers = geojson?.features?.map(getFeatureCenter).filter(Boolean) || [];
  if (!centers.length) {
    return null;
  }
  const lng = centers.reduce((sum, item) => sum + item[0], 0) / centers.length;
  const lat = centers.reduce((sum, item) => sum + item[1], 0) / centers.length;
  return [lng, lat];
}

function getGeojsonBBox(geojson) {
  const points = [];
  (geojson?.features || []).forEach((feature) => collectGeoPoints(feature.geometry?.coordinates, points));
  if (!points.length) {
    return null;
  }
  return points.reduce((bbox, point) => ({
    minLng: Math.min(bbox.minLng, point[0]),
    maxLng: Math.max(bbox.maxLng, point[0]),
    minLat: Math.min(bbox.minLat, point[1]),
    maxLat: Math.max(bbox.maxLat, point[1])
  }), {
    minLng: points[0][0],
    maxLng: points[0][0],
    minLat: points[0][1],
    maxLat: points[0][1]
  });
}

function getFeatureCenter(feature) {
  const cp = feature?.properties?.cp;
  if (Array.isArray(cp) && cp.length >= 2) {
    return [Number(cp[0]), Number(cp[1])];
  }
  const bbox = getGeometryBBox(feature?.geometry);
  if (!bbox) {
    return null;
  }
  return [(bbox.minLng + bbox.maxLng) / 2, (bbox.minLat + bbox.maxLat) / 2];
}

function getGeometryBBox(geometry) {
  const points = [];
  collectGeoPoints(geometry?.coordinates, points);
  if (!points.length) {
    return null;
  }
  return points.reduce((bbox, point) => ({
    minLng: Math.min(bbox.minLng, point[0]),
    maxLng: Math.max(bbox.maxLng, point[0]),
    minLat: Math.min(bbox.minLat, point[1]),
    maxLat: Math.max(bbox.maxLat, point[1])
  }), {
    minLng: points[0][0],
    maxLng: points[0][0],
    minLat: points[0][1],
    maxLat: points[0][1]
  });
}

function collectGeoPoints(value, points) {
  if (!Array.isArray(value)) {
    return;
  }
  if (value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number') {
    points.push(value);
    return;
  }
  value.forEach((item) => collectGeoPoints(item, points));
}

function renderMapSummary(located, missing) {
  if (!els.mapSummary) {
    return;
  }
  const missingItems = missing.length
    ? missing.map((customer) => `
      <button class="map-missing-item" type="button" data-map-customer-id="${escapeHtml(customer.id)}">
        <strong>${display(customer.name)}</strong>
        <span>${display(customer.region || customer.province)} · ${display(customer.city || customer.address, '待补充省市')}</span>
      </button>
    `).join('')
    : '<span class="map-missing-empty">暂无待补充客户</span>';

  els.mapSummary.innerHTML = `
    <span>${located.length} 个已定位客户</span>
    <span class="map-summary-divider">·</span>
    <span class="map-missing-trigger" tabindex="0">
      ${missing.length} 个待补充
      <span class="map-missing-popover" role="tooltip">
        <span class="map-missing-title">待补充定位信息</span>
        ${missingItems}
      </span>
    </span>
  `;

  els.mapSummary.querySelectorAll('[data-map-customer-id]').forEach((button) => {
    button.addEventListener('click', () => {
      openMapCustomer(button.dataset.mapCustomerId);
    });
  });
}

function renderMapCustomerPopover(title, customers, anchor) {
  els.mapCanvas.querySelector('.map-floating-list')?.remove();

  const canvasRect = els.mapCanvas.getBoundingClientRect();
  const position = getMapPopoverPosition(anchor, canvasRect);

  const popover = document.createElement('div');
  popover.className = 'map-floating-list';
  popover.innerHTML = `
    <div class="map-floating-header">
      <strong>${escapeHtml(title)}</strong>
      <button class="icon-button map-floating-close" type="button" title="关闭" aria-label="关闭">×</button>
    </div>
    <div class="map-floating-body">
      ${customers.length ? customers.map((customer) => `
        <button class="map-customer-item" type="button" data-map-customer-id="${escapeHtml(customer.id)}">
          <strong>${display(customer.name)}</strong>
          <span>${display(customer.industry)} · ${display(customer.mapProvince || customer.province || customer.region)} ${display(customer.mapCity || customer.city, '')}</span>
          <em>${statusLabel(customer.status)} · 最近沟通 ${formatDate(customer.last_visit_at)}</em>
        </button>
      `).join('') : '<span class="map-missing-empty">暂无客户。</span>'}
    </div>
  `;
  els.mapCanvas.appendChild(popover);
  positionMapFloatingList(popover, position.left, position.top);

  popover.querySelector('.map-floating-close')?.addEventListener('click', () => {
    popover.remove();
  });
  popover.querySelectorAll('[data-map-customer-id]').forEach((button) => {
    button.addEventListener('click', () => {
      openMapCustomer(button.dataset.mapCustomerId);
    });
  });
  makeMapFloatingListDraggable(popover);
}

function getMapPopoverPosition(anchor, canvasRect) {
  if (anchor?.getBoundingClientRect) {
    const rect = anchor.getBoundingClientRect();
    return {
      left: rect.left + rect.width / 2 - canvasRect.left,
      top: rect.top + rect.height / 2 - canvasRect.top
    };
  }
  if (Number.isFinite(anchor?.offsetX) && Number.isFinite(anchor?.offsetY)) {
    return {
      left: anchor.offsetX,
      top: anchor.offsetY
    };
  }
  if (Number.isFinite(anchor?.zrX) && Number.isFinite(anchor?.zrY)) {
    return {
      left: anchor.zrX,
      top: anchor.zrY
    };
  }
  return { left: canvasRect.width * 0.58, top: canvasRect.height * 0.42 };
}

function positionMapFloatingList(popover, left, top) {
  const bounds = getMapFloatingBounds(popover);
  popover.style.left = `${clampNumber(left - popover.offsetWidth / 2, bounds.minLeft, bounds.maxLeft)}px`;
  popover.style.top = `${clampNumber(top - 8, bounds.minTop, bounds.maxTop)}px`;
}

function getMapFloatingBounds(popover) {
  const width = els.mapCanvas.clientWidth;
  const height = els.mapCanvas.clientHeight;
  return {
    minLeft: 12,
    minTop: 12,
    maxLeft: Math.max(12, width - popover.offsetWidth - 12),
    maxTop: Math.max(12, height - popover.offsetHeight - 12)
  };
}

function makeMapFloatingListDraggable(popover) {
  const header = popover.querySelector('.map-floating-header');
  if (!header) {
    return;
  }

  header.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button')) {
      return;
    }
    event.preventDefault();
    header.setPointerCapture?.(event.pointerId);
    popover.classList.add('dragging');
    const start = {
      x: event.clientX,
      y: event.clientY,
      left: parseFloat(popover.style.left) || 0,
      top: parseFloat(popover.style.top) || 0
    };

    const onMove = (moveEvent) => {
      const bounds = getMapFloatingBounds(popover);
      const nextLeft = start.left + moveEvent.clientX - start.x;
      const nextTop = start.top + moveEvent.clientY - start.y;
      popover.style.left = `${clampNumber(nextLeft, bounds.minLeft, bounds.maxLeft)}px`;
      popover.style.top = `${clampNumber(nextTop, bounds.minTop, bounds.maxTop)}px`;
    };

    const onUp = () => {
      popover.classList.remove('dragging');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
  });
}

async function openMapCustomer(customerId) {
  if (!customerId) {
    return;
  }
  state.selectedCustomerId = customerId;
  state.selectedBundle = await window.forexceltechApp.getCustomer(customerId);
  openCustomerDetailDialog();
}

function renderDashboard() {
  renderCalendar();

  const items = state.customers.slice(0, 5);
  if (items.length === 0) {
    els.recentCustomers.className = 'record-list empty';
    els.recentCustomers.textContent = '暂无客户，先新增一个客户。';
    return;
  }

  els.recentCustomers.className = 'record-list';
  els.recentCustomers.innerHTML = items.map((customer) => `
    <button class="record-item" type="button" data-customer-id="${escapeHtml(customer.id)}">
      <strong>${display(customer.name)}</strong>
      <span class="record-meta">${display(customer.industry)} · ${display(customer.province || customer.region)} ${display(customer.city, '')} · 最近更新 ${formatDate(customer.updated_at)}</span>
    </button>
  `).join('');

  els.recentCustomers.querySelectorAll('[data-customer-id]').forEach((button) => {
    button.addEventListener('click', async () => {
      switchView('customers');
      await selectCustomer(button.dataset.customerId);
    });
  });
}

function renderCustomers() {
  if (state.customers.length === 0) {
    els.customerList.innerHTML = '<div class="empty">没有匹配客户，可调整搜索或筛选条件。</div>';
    renderPagination('customers', 0);
    state.customerViewMode = 'list';
    updateCustomerViewMode();
    return;
  }

  const pageItems = getPageItems('customers', state.customers);
  els.customerList.innerHTML = pageItems.map((customer) => `
    <button class="customer-card ${customer.id === state.selectedCustomerId ? 'active' : ''}" type="button" data-customer-id="${escapeHtml(customer.id)}">
      <div>
        <strong>${display(customer.name)}</strong>
        <span>${display(customer.industry)} · ${display(customer.province || customer.region)} ${display(customer.city, '')} · ${statusLabel(customer.status)}</span>
      </div>
      <div class="customer-card-metrics">
        <span>${customer.contact_count || 0} 位联系人</span>
        <span>${customer.visit_count || 0} 条沟通</span>
        <span>最近沟通 ${formatDate(customer.last_visit_at)}</span>
      </div>
    </button>
  `).join('');
  renderPagination('customers', state.customers.length);

  els.customerList.querySelectorAll('[data-customer-id]').forEach((button) => {
    button.addEventListener('click', () => selectCustomer(button.dataset.customerId));
  });

  updateCustomerViewMode();
}

function updateCustomerViewMode() {
  els.customerListMode.hidden = false;
}

function renderAllContacts() {
  if (!state.contacts.length) {
    els.allContactsList.className = 'record-list empty';
    els.allContactsList.textContent = state.search ? '没有匹配联系人，可调整关键词。' : '暂无联系人。';
    renderPagination('contacts', 0);
    return;
  }

  const pageItems = getPageItems('contacts', state.contacts);
  els.allContactsList.className = 'record-list unified-record-list';
  els.allContactsList.innerHTML = pageItems.map((contact) => `
    <article class="record-item unified-record-item contact-record-item clickable-record" data-action="open-contact-detail" data-id="${escapeHtml(contact.id)}" tabindex="0">
      <div class="record-kind-icon">${iconMarkup('contacts')}</div>
      <div class="record-summary">
        <div class="record-title-row">
          <strong class="record-title">${display(contact.name)}</strong>
          <span class="record-chip">${display(contact.customer_name)}</span>
        </div>
        <span class="record-subtitle">${display(contact.department, '部门未记录')} · ${display(contact.title, '职位未记录')} · ${display(contact.customer_industry, '行业未记录')}</span>
        <div class="record-chip-row">
          <span>${display(contact.phone, '电话未记录')}</span>
          <span>影响力 ${display(contact.influence_level, '-')}/5</span>
          <span>${display(contact.relationship_status, '关系未记录')}</span>
        </div>
        <p class="record-brief">${display(contact.next_topics, '下次话题未记录')}</p>
        <span class="record-next-action">更新：${formatDate(contact.updated_at)}</span>
      </div>
      <span class="record-arrow">${iconMarkup('chevron')}</span>
    </article>
  `).join('');
  renderPagination('contacts', state.contacts.length);

  bindListDetailActions(els.allContactsList);
}

function renderAllVisits() {
  if (!state.visits.length) {
    els.allVisitsList.className = 'record-list empty';
    els.allVisitsList.textContent = state.search ? '没有匹配拜访记录，可调整关键词。' : '暂无拜访或沟通记录。';
    renderPagination('visits', 0);
    return;
  }

  const pageItems = getPageItems('visits', state.visits);
  els.allVisitsList.className = 'record-list unified-record-list timeline-list';
  els.allVisitsList.innerHTML = pageItems.map((visit) => `
    <article class="record-item unified-record-item visit-record-item clickable-record" data-action="open-visit-detail" data-id="${escapeHtml(visit.id)}" tabindex="0">
      ${visitListTimeBlock(visit.occurred_at)}
      <div class="record-summary">
        <div class="record-title-row">
          <strong class="record-title">${display(visit.subject)}</strong>
          <span class="record-chip">${visitTypeLabel(visit.type)}</span>
        </div>
        <span class="record-subtitle">${display(visit.customer_name)} · ${display(visit.location, '地点未记录')}</span>
        <div class="record-chip-row">
          <span>参与人：${display(visit.participant_names, '未记录')}</span>
        </div>
        <p class="record-brief">${display(visit.summary || visit.details, '暂无摘要')}</p>
        <span class="record-next-action">下一步：${display(visit.next_action, '未记录')}</span>
      </div>
      <span class="record-arrow">${iconMarkup('chevron')}</span>
    </article>
  `).join('');
  renderPagination('visits', state.visits.length);

  bindListDetailActions(els.allVisitsList);
}

function bindListDetailActions(container) {
  container.querySelectorAll('[data-action="open-contact-detail"], [data-action="open-visit-detail"]').forEach((item) => {
    const open = () => {
      if (item.dataset.action === 'open-contact-detail') {
        openContactDetailDialog(item.dataset.id);
      } else {
        openVisitDetailDialog(item.dataset.id);
      }
    };
    item.addEventListener('click', open);
    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open();
      }
    });
  });
}

async function viewCustomerFromDetail(customerId) {
  closeDetailDialog();
  state.search = '';
  els.globalSearch.value = '';
  await loadCustomers();
  await switchView('customers');
  await selectCustomer(customerId);
}

async function selectAiAudio() {
  showToast('请先粘贴文字稿', true);
}

function openContactDetailDialog(contactId) {
  const contact = state.contacts.find((item) => item.id === contactId);
  if (!contact) {
    showToast('未找到联系人详情', true);
    return;
  }
  els.detailDialogTitle.textContent = '联系人详情';
  els.detailDialogBody.innerHTML = `
    ${detailHero({
      title: contact.name,
      subtitle: `${display(contact.customer_name)} · ${display(contact.department)} · ${display(contact.title)}`,
      badges: [
        detailBadge(display(contact.relationship_status, '关系未记录'), 'primary'),
        detailBadge(contact.influence_level ? `影响力 ${contact.influence_level}/5` : '影响力未记录', 'muted')
      ].join('')
    })}
    <div class="detail-dialog-grid">
      ${detailInfoCell('所属客户', contact.customer_name)}
      ${detailInfoCell('性别', contact.gender)}
      ${detailInfoCell('户籍信息', contact.native_place)}
      ${detailInfoCell('部门', contact.department)}
      ${detailInfoCell('职位', contact.title)}
      ${detailInfoCell('影响力', contact.influence_level ? `${contact.influence_level}/5` : '')}
      ${detailInfoCell('电话', contact.phone)}
      ${detailInfoCell('邮箱', contact.email)}
      ${detailInfoCell('微信', contact.wechat)}
      ${detailInfoCell('沟通偏好', contact.communication_preference)}
      ${detailInfoCell('决策角色', contact.decision_role)}
      ${detailInfoCell('学历', contact.education)}
      ${detailInfoCell('专业背景', contact.major)}
      ${detailInfoCell('工作年限', contact.years_of_experience)}
    </div>
    ${detailTextBlock('下次可提及话题', contact.next_topics)}
    ${detailTextBlock('个人兴趣', contact.personal_interests)}
    ${detailTextBlock('过往任职经历', contact.career_history)}
    ${detailTextBlock('备注', contact.notes)}
  `;
  els.detailDialogActions.innerHTML = `
    <div class="dialog-action-right detail-business-actions">
      <button class="secondary-button" type="button" data-action="edit-contact">编辑联系人</button>
      <button class="primary-button" type="button" data-action="view-customer">查看客户详情</button>
    </div>
  `;
  bindDetailDialogActions({
    onViewCustomer: () => viewCustomerFromDetail(contact.customer_id),
    onEdit: () => {
      openFormAfterDetailClose(() => openContactDialog(contact));
    }
  });
  els.detailDialog.showModal();
}

function openVisitDetailDialog(visitId) {
  const visit = state.visits.find((item) => item.id === visitId);
  if (!visit) {
    showToast('未找到拜访记录详情', true);
    return;
  }
  els.detailDialogTitle.textContent = '拜访记录详情';
  els.detailDialogBody.innerHTML = `
    ${detailHero({
      title: visit.subject,
      subtitle: `${display(visit.customer_name)} · ${visitTypeLabel(visit.type)} · ${display(visit.location)}`,
      before: visitTimeBadge(visit.occurred_at),
      badges: [
        detailBadge(visitTypeLabel(visit.type), 'primary'),
        detailBadge(display(visit.customer_attitude, '态度未记录'), 'muted')
      ].join(''),
      className: 'visit-detail-hero'
    })}
    <div class="detail-dialog-grid">
      ${detailInfoCell('所属客户', visit.customer_name)}
      ${detailInfoCell('沟通类型', visitTypeLabel(visit.type))}
      ${detailInfoCell('地点', visit.location)}
      ${detailInfoCell('参与联系人', visit.participant_names)}
      ${detailInfoCell('客户态度', visit.customer_attitude)}
      ${detailInfoCell('记录人', visit.created_by)}
      ${detailInfoCell('创建时间', formatDate(visit.created_at))}
      ${detailInfoCell('更新时间', formatDate(visit.updated_at))}
    </div>
    ${detailTextBlock('摘要', visit.summary)}
    ${detailTextBlock('详细内容', visit.details)}
    ${detailTextBlock('下一步动作', visit.next_action)}
  `;
  els.detailDialogActions.innerHTML = `
    <div class="dialog-action-right detail-business-actions">
      <button class="secondary-button" type="button" data-action="edit-visit">编辑拜访记录</button>
      <button class="primary-button" type="button" data-action="view-customer">查看客户详情</button>
    </div>
  `;
  bindDetailDialogActions({
    onViewCustomer: () => viewCustomerFromDetail(visit.customer_id),
    onEdit: async () => {
      closeDetailDialog();
      const bundle = await window.forexceltechApp.getCustomer(visit.customer_id);
      window.setTimeout(() => {
        openVisitDialog(visit, bundle?.contacts || []);
      }, 0);
    }
  });
  els.detailDialog.showModal();
}

function bindDetailDialogActions({ onViewCustomer, onEdit }) {
  els.detailDialogActions.querySelector('[data-action="view-customer"]')?.addEventListener('click', () => safeAction(onViewCustomer));
  els.detailDialogActions.querySelector('[data-action^="edit-"]')?.addEventListener('click', () => safeAction(onEdit));
}

function closeDetailDialog() {
  if (els.detailDialog.open) {
    els.detailDialog.close();
  }
}

function detailHero({ title, subtitle, badges = '', before = '', className = '' }) {
  const badgeClass = className.includes('customer-detail-hero')
    ? 'detail-badge-row customer-detail-tags'
    : 'detail-badge-row';
  return `
    <section class="detail-dialog-hero unified-detail-hero ${escapeHtml(className)}">
      ${before || ''}
      <div class="detail-hero-main">
        <h3>${display(title)}</h3>
        ${subtitle ? `<p>${subtitle}</p>` : ''}
        ${badges ? `<div class="${badgeClass}">${badges}</div>` : ''}
      </div>
    </section>
  `;
}

function detailBadge(label, tone = 'primary') {
  return `<span class="detail-badge ${escapeHtml(tone)}">${display(label)}</span>`;
}

function detailInfoCell(label, value) {
  return `<div class="detail-info-cell"><span>${escapeHtml(label)}</span><strong>${display(value, '未记录')}</strong></div>`;
}

function detailTextBlock(label, value) {
  return `
    <section class="detail-text-block">
      <h4>${escapeHtml(label)}</h4>
      <div>${display(value, '未记录')}</div>
    </section>
  `;
}

async function transcribeAiAudio() {
  showToast('请先粘贴文字稿', true);
}

function updateAiAudioStatus(message) {
  if (!els.aiAudioStatus) {
    return;
  }
  els.aiAudioStatus.textContent = message || '';
  els.aiAudioStatus.hidden = !message;
}

async function generateAiDrafts() {
  const transcript = els.aiTranscript.value.trim();
  if (!transcript) {
    showToast('请先粘贴文字稿', true);
    els.aiTranscript.focus();
    return;
  }

  els.aiGenerateDrafts.disabled = true;
  els.aiGenerateDrafts.textContent = '生成中';
  showAiDraftProgress();
  try {
    state.aiBaseDraftResult = await window.forexceltechApp.extractAiDrafts(transcript);
    state.aiDraftResult = cloneAiDraftResult(state.aiBaseDraftResult);
    applyAiAssociationsToDrafts();
    resetAiConfirmations();
    renderAiDrafts();
    showToast(state.aiDraftResult.warning || '草稿已生成，请人工核对', state.aiDraftResult.warning ? 'warning' : 'success');
  } catch (error) {
    els.aiResultMeta.textContent = '生成失败';
    els.aiConfirmDrafts.disabled = true;
    els.aiDraftResults.className = 'ai-draft-results empty';
    els.aiDraftResults.textContent = '生成失败，请检查文字稿或本地模型后重试。';
    throw error;
  } finally {
    els.aiGenerateDrafts.disabled = false;
    els.aiGenerateDrafts.textContent = '生成草稿';
  }
}

function refreshAiDraftAssociations() {
  renderAiAssociationOptions();
  if (!state.aiBaseDraftResult) {
    return;
  }
  state.aiDraftResult = cloneAiDraftResult(state.aiBaseDraftResult);
  applyAiAssociationsToDrafts();
  resetAiConfirmations();
  renderAiDrafts();
}

function cloneAiDraftResult(result) {
  return result ? JSON.parse(JSON.stringify(result)) : null;
}

function showAiDraftProgress() {
  els.aiResultMeta.textContent = '生成中';
  els.aiConfirmDrafts.disabled = true;
  els.aiDraftResults.className = 'ai-draft-results ai-generating';
  els.aiDraftResults.innerHTML = `
    <div class="ai-progress-card" role="status" aria-live="polite">
      <div class="ai-progress-head">
        <strong>正在生成草稿</strong>
        <span>本地模型处理中</span>
      </div>
      <div class="ai-progress-bar" aria-hidden="true"><span></span></div>
    </div>
  `;
}

function renderAiDrafts() {
  if (!state.aiDraftResult) {
    els.aiResultMeta.textContent = '尚未生成';
    els.aiConfirmDrafts.disabled = true;
    els.aiDraftResults.className = 'ai-draft-results empty';
    els.aiDraftResults.textContent = '粘贴文字稿后点击“生成草稿”。';
    return;
  }

  const result = state.aiDraftResult;
  els.aiConfirmDrafts.disabled = areAllAiDraftsConfirmed();
  const missingRequiredCount = result.drafts.reduce((count, draft) => count + draft.validation_errors.length, 0);
  els.aiResultMeta.textContent = missingRequiredCount ? `${missingRequiredCount} 个字段待补充` : `${result.drafts.length} 个草稿`;
  els.aiDraftResults.className = 'ai-draft-results';
  els.aiDraftResults.innerHTML = `
    ${renderAiCustomerResolution()}
    ${result.drafts.map(renderAiDraftCard).join('')}
  `;
  bindAiCustomerResolutionActions();
  bindAiDraftActions();
}

function renderAiCustomerResolution() {
  if (!state.aiDraftResult) {
    return '';
  }
  const linkedCustomer = getCustomerById(state.aiLinked.customerId);
  const customerValues = getDraftValues('customer');
  const draftName = customerValues.name || '未知，待人为补充';
  const candidates = getAiCustomerCandidates();
  const selectedCandidateId = state.aiCustomerDecision.customerId || candidates[0]?.id || '';
  const selectedCandidate = getCustomerById(selectedCandidateId)
    || candidates.find((candidate) => candidate.id === selectedCandidateId);
  const selectedCandidateLabel = selectedCandidate
    ? `${selectedCandidate.name}${selectedCandidate.short_name ? ` / ${selectedCandidate.short_name}` : ''}`
    : '请选择已有客户';

  if (linkedCustomer) {
    return `
      <section class="ai-customer-resolution locked">
        <div>
          <h3>客户匹配确认</h3>
        </div>
        <strong>${display(linkedCustomer.name)}</strong>
      </section>
    `;
  }

  if (!candidates.length) {
    state.aiCustomerDecision.mode = state.aiCustomerDecision.mode || 'new';
    return `
      <section class="ai-customer-resolution">
        <div>
          <h3>客户匹配确认</h3>
        </div>
        <strong>将新建：${display(draftName)}</strong>
      </section>
    `;
  }

  return `
    <section class="ai-customer-resolution needs-decision">
      <div class="ai-customer-resolution-head">
        <div>
          <h3>客户匹配确认</h3>
        </div>
        <span class="ai-confidence ${state.aiCustomerDecision.mode ? 'high' : 'medium'}">${state.aiCustomerDecision.mode ? '已选择' : '待选择'}</span>
      </div>
      <div class="ai-customer-options">
        <label class="ai-customer-option">
          <input type="radio" name="ai-customer-decision" value="existing" ${state.aiCustomerDecision.mode === 'existing' ? 'checked' : ''} />
          <span>使用已有客户</span>
          <button class="ai-selected-customer-button" type="button" data-action="open-ai-customer-match-picker" title="${escapeHtml(selectedCandidateLabel)}" ${state.aiCustomerDecision.mode === 'new' ? 'disabled' : ''}>
            <strong>${display(selectedCandidateLabel)}</strong>
            <small>${selectedCandidate?.score ? `${display(selectedCandidate.score)}分` : '搜索选择'}</small>
          </button>
        </label>
        <label class="ai-customer-option">
          <input type="radio" name="ai-customer-decision" value="new" ${state.aiCustomerDecision.mode === 'new' ? 'checked' : ''} />
          <span>按草稿新建客户</span>
          <strong class="ai-customer-draft-name">${display(draftName)}</strong>
        </label>
      </div>
    </section>
  `;
}

function bindAiCustomerResolutionActions() {
  els.aiDraftResults.querySelectorAll('input[name="ai-customer-decision"]').forEach((input) => {
    input.addEventListener('change', () => {
      state.aiCustomerDecision.mode = input.value;
      state.aiCustomerDecision.customerId = input.value === 'existing'
        ? state.aiCustomerDecision.customerId || getAiCustomerCandidates()[0]?.id || ''
        : '';
      renderAiDrafts();
    });
  });
  els.aiDraftResults.querySelector('[data-action="open-ai-customer-match-picker"]')?.addEventListener('click', () => {
    state.aiCustomerDecision.mode = 'existing';
    state.aiCustomerDecision.customerId = state.aiCustomerDecision.customerId || getAiCustomerCandidates()[0]?.id || '';
    openAiAssociationPicker('customer-match');
  });
}

function getAiCustomerCandidates() {
  const candidates = state.aiDraftResult?.customer_candidates || [];
  const matched = state.aiDraftResult?.matched_customer;
  const merged = new Map();
  candidates.forEach((candidate) => merged.set(candidate.id, candidate));
  if (matched?.id && !merged.has(matched.id)) {
    merged.set(matched.id, { ...matched, score: 90, reason: '模型匹配客户', match_level: 'high' });
  }
  return [...merged.values()].filter((candidate) => candidate?.id);
}

function getAiCustomerDecisionLabel() {
  const linkedCustomer = getCustomerById(state.aiLinked.customerId);
  if (linkedCustomer) {
    return `预关联：${linkedCustomer.name}`;
  }
  if (state.aiConfirmed.customerId) {
    return `已确认：${getCustomerById(state.aiConfirmed.customerId)?.name || state.aiConfirmed.customerId}`;
  }
  if (state.aiCustomerDecision.mode === 'existing') {
    return `使用已有：${getCustomerById(state.aiCustomerDecision.customerId)?.name || '待选择'}`;
  }
  if (state.aiCustomerDecision.mode === 'new') {
    return '按草稿新建客户';
  }
  if (getAiCustomerCandidates().length) {
    return '发现候选，待人工选择';
  }
  return '未匹配，将新建';
}

function renderAiAssociationOptions() {
  if (!els.aiLinkedCustomer || !els.aiLinkedContact || !els.aiLinkedCustomerTrigger || !els.aiLinkedContactTrigger) {
    return;
  }

  const currentCustomer = getCustomerById(state.aiLinked.customerId);
  const currentContact = getContactById(state.aiLinked.contactId);
  els.aiLinkedCustomer.value = state.aiLinked.customerId || '';
  els.aiLinkedContact.value = state.aiLinked.contactId || '';
  els.aiLinkedCustomerTrigger.textContent = currentCustomer
    ? `${currentCustomer.name}${currentCustomer.short_name ? ` / ${currentCustomer.short_name}` : ''}`
    : '不预关联客户';
  els.aiLinkedContactTrigger.textContent = currentContact
    ? `${currentContact.name} · ${currentContact.customer_name || '未关联客户'}`
    : '不预关联联系人';
  els.aiLinkedCustomerTrigger.title = els.aiLinkedCustomerTrigger.textContent;
  els.aiLinkedContactTrigger.title = els.aiLinkedContactTrigger.textContent;
}

function openAiAssociationPicker(type) {
  state.aiPicker = {
    type,
    query: '',
    page: 1,
    pageSize: AI_PICKER_PAGE_SIZE
  };
  renderAiAssociationPicker();
  els.detailDialog.showModal();
  requestAnimationFrame(() => {
    els.detailDialogBody.querySelector('#ai-picker-search')?.focus();
  });
}

function renderAiAssociationPicker(keepSearchFocus = false) {
  const type = state.aiPicker.type;
  const isCustomer = type === 'customer' || type === 'customer-match';
  const isMatchCustomer = type === 'customer-match';
  const title = isMatchCustomer ? '选择匹配客户' : (isCustomer ? '选择预关联客户' : '选择预关联联系人');
  const linkedCustomer = getCustomerById(state.aiLinked.customerId);
  const allItems = getAiPickerItems(type);
  const filteredItems = filterAiPickerItems(type, allItems, state.aiPicker.query);
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / state.aiPicker.pageSize));
  state.aiPicker.page = Math.min(Math.max(1, state.aiPicker.page), totalPages);
  const start = (state.aiPicker.page - 1) * state.aiPicker.pageSize;
  const pageItems = filteredItems.slice(start, start + state.aiPicker.pageSize);

  els.detailDialogTitle.textContent = title;
  els.detailDialogBody.innerHTML = `
    <section class="ai-picker">
      <div class="ai-picker-search-row">
        <input id="ai-picker-search" type="search" placeholder="${isCustomer ? '搜索客户名称、简称、行业、城市' : '搜索联系人、客户、职务、电话'}" value="${escapeHtml(state.aiPicker.query)}" />
        ${!isCustomer && linkedCustomer ? `<span class="ai-picker-scope">已限定：${display(linkedCustomer.name)}</span>` : ''}
      </div>
      <div class="ai-picker-list ${pageItems.length ? '' : 'empty'}">
        ${pageItems.length ? pageItems.map((item) => renderAiPickerItem(type, item)).join('') : '<div class="empty">没有匹配结果。</div>'}
      </div>
      ${renderAiPickerPagination(filteredItems.length, totalPages)}
    </section>
  `;
  els.detailDialogActions.innerHTML = `
    <div class="dialog-action-left">
      <button class="secondary-button" type="button" data-action="clear-ai-picker">${isMatchCustomer ? '取消使用已有客户' : (isCustomer ? '不预关联客户' : '不预关联联系人')}</button>
    </div>
  `;
  bindAiAssociationPickerActions();
  if (keepSearchFocus) {
    requestAnimationFrame(() => {
      const search = els.detailDialogBody.querySelector('#ai-picker-search');
      search?.focus();
      search?.setSelectionRange(search.value.length, search.value.length);
    });
  }
}

function getAiPickerItems(type) {
  if (type === 'customer-match') {
    const candidates = getAiCustomerCandidates();
    const candidateIds = new Set(candidates.map((candidate) => candidate.id));
    const source = state.aiCustomers.length ? state.aiCustomers : state.customers;
    const merged = new Map();
    candidates.forEach((candidate) => merged.set(candidate.id, {
      ...(source.find((customer) => customer.id === candidate.id) || {}),
      ...candidate,
      ai_match_candidate: true
    }));
    source.forEach((customer) => {
      if (!merged.has(customer.id)) {
        merged.set(customer.id, {
          ...customer,
          ai_match_candidate: candidateIds.has(customer.id)
        });
      }
    });
    return [...merged.values()];
  }
  if (type === 'customer') {
    return state.aiCustomers.length ? state.aiCustomers : state.customers;
  }
  const contacts = state.aiContacts.length ? state.aiContacts : state.contacts;
  return state.aiLinked.customerId
    ? contacts.filter((contact) => contact.customer_id === state.aiLinked.customerId)
    : contacts;
}

function filterAiPickerItems(type, items, query) {
  const keyword = normalizeSearchText(query);
  if (!keyword) {
    return items;
  }
  return items.filter((item) => normalizeSearchText([
    item.name,
    item.short_name,
    item.customer_name,
    item.industry,
    item.region,
    item.province,
    item.city,
    item.title,
    item.department,
    item.phone,
    item.email,
    item.wechat
  ].filter(Boolean).join(' ')).includes(keyword));
}

function normalizeSearchText(value) {
  return String(value || '').trim().toLowerCase();
}

function renderAiPickerItem(type, item) {
  const isMatchCustomer = type === 'customer-match';
  const isCustomer = type === 'customer' || isMatchCustomer;
  const selected = isCustomer
    ? (isMatchCustomer ? item.id === state.aiCustomerDecision.customerId : item.id === state.aiLinked.customerId)
    : item.id === state.aiLinked.contactId;
  const subtitle = isCustomer
    ? [item.short_name, item.industry, item.province || item.region, item.city].filter(Boolean).join(' · ')
    : [item.customer_name, item.department, item.title, item.phone].filter(Boolean).join(' · ');
  const matchMeta = isMatchCustomer && item.ai_match_candidate
    ? `<em class="ai-picker-match-meta">${display(item.score, '-')}分 · ${display(item.reason, '候选客户')}</em>`
    : '';
  return `
    <button class="ai-picker-item ${selected ? 'selected' : ''}" type="button" data-ai-picker-id="${escapeHtml(item.id)}">
      <span>
        <strong>${display(item.name)}</strong>
        <em>${display(subtitle, isCustomer ? '暂无客户补充信息' : '暂无联系人补充信息')}</em>
        ${matchMeta}
      </span>
      <b>${selected ? '已选' : '选择'}</b>
    </button>
  `;
}

function renderAiPickerPagination(total, totalPages) {
  if (total <= 0) {
    return '<div class="ai-picker-pagination muted">共 0 条</div>';
  }
  const first = (state.aiPicker.page - 1) * state.aiPicker.pageSize + 1;
  const last = Math.min(total, state.aiPicker.page * state.aiPicker.pageSize);
  return `
    <div class="ai-picker-pagination">
      <span>${first}-${last} / 共 ${total} 条</span>
      <div>
        <button class="icon-button" type="button" data-action="ai-picker-prev" ${state.aiPicker.page <= 1 ? 'disabled' : ''}>&lt;</button>
        <span>第 ${state.aiPicker.page} / ${totalPages} 页</span>
        <button class="icon-button" type="button" data-action="ai-picker-next" ${state.aiPicker.page >= totalPages ? 'disabled' : ''}>&gt;</button>
      </div>
    </div>
  `;
}

function bindAiAssociationPickerActions() {
  const search = els.detailDialogBody.querySelector('#ai-picker-search');
  search?.addEventListener('input', () => {
    state.aiPicker.query = search.value;
    state.aiPicker.page = 1;
    renderAiAssociationPicker(true);
  });
  els.detailDialogBody.querySelectorAll('[data-ai-picker-id]').forEach((button) => {
    button.addEventListener('click', () => {
      applyAiPickerSelection(button.dataset.aiPickerId);
    });
  });
  els.detailDialogActions.querySelector('[data-action="clear-ai-picker"]')?.addEventListener('click', () => {
    applyAiPickerSelection('');
  });
  els.detailDialogBody.querySelector('[data-action="ai-picker-prev"]')?.addEventListener('click', () => {
    state.aiPicker.page = Math.max(1, state.aiPicker.page - 1);
    renderAiAssociationPicker(true);
  });
  els.detailDialogBody.querySelector('[data-action="ai-picker-next"]')?.addEventListener('click', () => {
    state.aiPicker.page += 1;
    renderAiAssociationPicker(true);
  });
}

function applyAiPickerSelection(id) {
  if (state.aiPicker.type === 'customer-match') {
    state.aiCustomerDecision.mode = id ? 'existing' : 'new';
    state.aiCustomerDecision.customerId = id || '';
    renderAiDrafts();
    closeDetailDialog();
    return;
  }
  if (state.aiPicker.type === 'customer') {
    state.aiLinked.customerId = id;
    if (state.aiLinked.contactId && getContactById(state.aiLinked.contactId)?.customer_id !== id) {
      state.aiLinked.contactId = '';
    }
  } else {
    state.aiLinked.contactId = id;
    const contact = getContactById(id);
    if (contact?.customer_id) {
      state.aiLinked.customerId = contact.customer_id;
    }
  }
  renderAiAssociationOptions();
  refreshAiDraftAssociations();
  closeDetailDialog();
}

function applyAiAssociationsToDrafts() {
  const linkedContact = getContactById(state.aiLinked.contactId);
  if (linkedContact?.customer_id) {
    state.aiLinked.customerId = linkedContact.customer_id;
  }

  const linkedCustomer = getCustomerById(state.aiLinked.customerId);
  if (linkedCustomer) {
    state.aiDraftResult.matched_customer = {
      id: linkedCustomer.id,
      name: linkedCustomer.name,
      short_name: linkedCustomer.short_name || ''
    };
    patchDraftFields('customer', {
      name: linkedCustomer.name,
      short_name: linkedCustomer.short_name,
      industry: linkedCustomer.industry,
      region: linkedCustomer.region,
      status: statusLabel(linkedCustomer.status),
      owner_name: linkedCustomer.owner_name
    });
    patchDraftFieldsForAll('contact', { customer_name: linkedCustomer.name });
    patchDraftFields('visit', { customer_name: linkedCustomer.name });
    const customerDraft = state.aiDraftResult.drafts.find((draft) => draft.type === 'customer');
    if (customerDraft) {
      customerDraft.matched_existing_id = linkedCustomer.id;
    }
  }

  if (linkedContact) {
    const firstContactDraft = state.aiDraftResult.drafts.find((draft) => draft.type === 'contact');
    patchDraftFields('contact', {
      customer_name: linkedContact.customer_name,
      name: linkedContact.name,
      gender: linkedContact.gender,
      native_place: linkedContact.native_place,
      department: linkedContact.department,
      title: linkedContact.title,
      phone: linkedContact.phone,
      email: linkedContact.email,
      wechat: linkedContact.wechat,
      relationship_status: linkedContact.relationship_status,
      communication_preference: linkedContact.communication_preference,
      decision_role: linkedContact.decision_role
    }, firstContactDraft?.draft_id);
    patchDraftFields('visit', { participants: linkedContact.name });
    if (firstContactDraft) {
      firstContactDraft.matched_existing_id = linkedContact.id;
    }
  }

  refreshAiDraftValidation();
}

function patchDraftFields(type, values, draftId = '') {
  const draft = state.aiDraftResult?.drafts.find((item) => item.type === type && (!draftId || getDraftId(item) === draftId));
  if (!draft) {
    return;
  }
  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    const field = draft.fields.find((item) => item.key === key);
    if (field) {
      field.value = String(value);
      field.missing = false;
      field.confidence = 'high';
    }
  });
}

function patchDraftFieldsForAll(type, values) {
  state.aiDraftResult?.drafts
    .filter((draft) => draft.type === type)
    .forEach((draft) => patchDraftFields(type, values, getDraftId(draft)));
}

function refreshAiDraftValidation() {
  state.aiDraftResult?.drafts.forEach((draft) => {
    draft.validation_errors = draft.fields
      .filter((field) => field.required && isUnknownValue(field.value))
      .map((field) => `${field.label}缺失`);
    draft.status = draft.validation_errors.length ? 'needs_human_input' : 'ready_for_review';
    draft.confidence = draft.validation_errors.length ? 'low' : 'medium';
  });
}

function renderAiDraftCard(draft) {
  const statusText = draft.validation_errors.length ? `待补充：${draft.validation_errors.join('、')}` : '可人工复核';
  const confirmedId = getAiConfirmedId(draft);
  const dependencyText = getAiDependencyText(draft.type);
  const draftId = getDraftId(draft);
  const previewFields = draft.fields
    .filter((field) => field.value && !isUnknownValue(field.value))
    .slice(0, 3)
    .map((field) => `${field.label}：${field.value}`)
    .join('；');
  return `
    <article class="ai-draft-card ai-draft-task ${draft.validation_errors.length ? 'needs-input' : ''}" data-draft-type="${escapeHtml(draft.type)}" data-draft-id="${escapeHtml(draftId)}">
      <div class="ai-draft-header">
        <div>
          <h3>${display(draft.title)}</h3>
          <p>${display(confirmedId ? `已写入：${confirmedId}` : `${statusText}；${dependencyText}`)}</p>
          <p class="ai-draft-preview">${display(previewFields, '暂无可预览字段，请打开编辑补充。')}</p>
        </div>
        <div class="ai-draft-actions">
          <span class="ai-confidence ${confirmedId ? 'high' : draft.confidence}">${confirmedId ? '已写入' : confidenceLabel(draft.confidence)}</span>
          <button class="secondary-button" type="button" data-action="edit-ai-draft" data-draft-id="${escapeHtml(draftId)}">编辑</button>
          <button class="secondary-button" type="button" data-action="confirm-ai-draft" data-draft-type="${escapeHtml(draft.type)}" data-draft-id="${escapeHtml(draftId)}" ${confirmedId ? 'disabled' : ''}>${escapeHtml(getAiDraftButtonLabel(draft.type))}</button>
        </div>
      </div>
    </article>
  `;
}

function bindAiDraftActions() {
  els.aiDraftResults.onclick = (event) => {
    const actionButton = event.target.closest('[data-action]');
    if (actionButton && els.aiDraftResults.contains(actionButton)) {
      const action = actionButton.dataset.action;
      event.preventDefault();
      if (action === 'edit-ai-draft') {
        openAiDraftEditDialog(actionButton.dataset.draftId);
        return;
      }
      if (action === 'confirm-ai-draft') {
        safeAction(() => confirmSingleAiDraft(actionButton.dataset.draftId));
      }
      return;
    }

    const header = event.target.closest('.ai-draft-header');
    if (header && els.aiDraftResults.contains(header) && !event.target.closest('button, input, select, textarea')) {
      openAiDraftEditDialog(header.closest('.ai-draft-card')?.dataset.draftId);
    }
  };
}

function openAiDraftEditDialog(draftId) {
  const draft = getAiDraftById(draftId);
  if (!draft) {
    showToast('未找到要编辑的草稿', true);
    return;
  }
  const confirmedId = getAiConfirmedId(draft);
  const statusText = draft.validation_errors.length ? `待补充：${draft.validation_errors.join('、')}` : '可写入';
  els.detailDialogTitle.textContent = draft.title;
  els.detailDialogBody.innerHTML = `
    <section class="ai-draft-edit-dialog" data-draft-id="${escapeHtml(draftId)}">
      <div class="detail-dialog-hero unified-detail-hero">
        <div class="detail-hero-main">
          <h3>${display(draft.title)}</h3>
          <p>${display(confirmedId ? `已写入：${confirmedId}` : `${statusText}；${getAiDependencyText(draft.type)}`)}</p>
        </div>
        <span class="ai-confidence ${confirmedId ? 'high' : draft.confidence}">${confirmedId ? '已写入' : confidenceLabel(draft.confidence)}</span>
      </div>
      <div class="ai-edit-field-grid">
        ${draft.fields.map((field) => renderAiField(field, draft)).join('')}
      </div>
    </section>
  `;
  els.detailDialogActions.innerHTML = `
    <div class="dialog-action-right">
      <button class="secondary-button" type="button" data-action="save-ai-draft">保存草稿</button>
      <button class="primary-button" type="button" data-action="save-confirm-ai-draft" ${confirmedId ? 'disabled' : ''}>保存并${escapeHtml(getAiDraftButtonLabel(draft.type))}</button>
    </div>
  `;
  bindAiDraftEditDialogActions(draftId);
  els.detailDialog.showModal();
  requestAnimationFrame(() => {
    els.detailDialogBody.querySelector('[data-ai-field]')?.focus();
  });
}

function bindAiDraftEditDialogActions(draftId) {
  els.detailDialogActions.querySelector('[data-action="save-ai-draft"]')?.addEventListener('click', () => {
    saveAiDraftDialogFields(draftId);
    refreshAiDraftValidation();
    renderAiDrafts();
    closeDetailDialog();
    showToast('草稿已保存');
  });
  els.detailDialogActions.querySelector('[data-action="save-confirm-ai-draft"]')?.addEventListener('click', () => safeAction(async () => {
    saveAiDraftDialogFields(draftId);
    refreshAiDraftValidation();
    closeDetailDialog();
    await confirmSingleAiDraft(draftId);
  }));
}

function saveAiDraftDialogFields(draftId) {
  const draft = getAiDraftById(draftId);
  if (!draft) {
    return;
  }
  els.detailDialogBody.querySelectorAll('[data-ai-field]').forEach((input) => {
    const field = draft.fields.find((item) => item.key === input.dataset.aiField);
    if (field) {
      field.value = input.value.trim();
      field.missing = isUnknownValue(field.value);
    }
  });
  draft.validation_errors = draft.fields
    .filter((field) => field.required && isUnknownValue(field.value))
    .map((field) => `${field.label}缺失`);
  draft.status = draft.validation_errors.length ? 'needs_human_input' : 'ready_for_review';
  draft.confidence = draft.validation_errors.length ? 'low' : 'medium';
}

function getAiDraftButtonLabel(type) {
  return {
    customer: '写入客户',
    contact: '写入联系人',
    visit: '写入拜访记录'
  }[type] || '写入';
}

function getAiDependencyText(type) {
  if (type === 'customer') {
    return '客户是联系人和拜访记录的关联主体';
  }
  const linkedCustomer = getCustomerById(state.aiLinked.customerId);
  const decidedCustomer = state.aiCustomerDecision.mode === 'existing' ? getCustomerById(state.aiCustomerDecision.customerId) : null;
  const customerLabel = linkedCustomer?.name || decidedCustomer?.name || state.aiConfirmed.customerId || '待先写入客户';
  if (type === 'contact') {
    return `联系人将关联客户：${customerLabel}`;
  }
  return `拜访记录将关联客户：${customerLabel}`;
}

function getDraftId(draft) {
  return draft?.draft_id || draft?.type || '';
}

function getAiConfirmedId(draftOrType) {
  if (typeof draftOrType === 'object') {
    if (draftOrType.type === 'customer') {
      return state.aiConfirmed.customerId;
    }
    if (draftOrType.type === 'contact') {
      return state.aiConfirmed.contactIds?.[getDraftId(draftOrType)] || '';
    }
    if (draftOrType.type === 'visit') {
      return state.aiConfirmed.visitId;
    }
    return '';
  }

  return {
    customer: state.aiConfirmed.customerId,
    visit: state.aiConfirmed.visitId
  }[draftOrType] || '';
}

function resetAiConfirmations() {
  const contactIds = {};
  const firstContactDraft = state.aiDraftResult?.drafts.find((draft) => draft.type === 'contact');
  const linkedCustomerId = state.aiLinked.customerId || (state.aiLinked.contactId ? getContactById(state.aiLinked.contactId)?.customer_id : '') || '';
  if (state.aiLinked.contactId && firstContactDraft) {
    contactIds[getDraftId(firstContactDraft)] = state.aiLinked.contactId;
  }
  state.aiCustomerDecision = {
    mode: linkedCustomerId ? 'existing' : getAiCustomerCandidates().length ? '' : 'new',
    customerId: linkedCustomerId
  };
  state.aiConfirmed = {
    customerId: linkedCustomerId,
    contactIds,
    visitId: ''
  };
}

function renderAiField(field, draft) {
  const draftId = getDraftId(draft);
  const inputTag = shouldUseTextarea(field.key)
    ? `<textarea data-ai-field="${escapeHtml(field.key)}" data-draft-id="${escapeHtml(draftId)}" data-draft-type="${escapeHtml(draft.type)}" data-field-key="${escapeHtml(field.key)}" rows="3">${escapeHtml(field.value)}</textarea>`
    : `<input data-ai-field="${escapeHtml(field.key)}" data-draft-id="${escapeHtml(draftId)}" data-draft-type="${escapeHtml(draft.type)}" data-field-key="${escapeHtml(field.key)}" type="text" value="${escapeHtml(field.value)}" />`;
  return `
    <div class="ai-field ${field.missing ? 'missing' : ''}">
      <span>${display(field.label)}${field.required ? '<b>*</b>' : ''}</span>
      ${inputTag}
      <em>${field.missing ? '需要人工补充' : confidenceLabel(field.confidence)}</em>
    </div>
  `;
}

function shouldUseTextarea(key) {
  return ['background', 'notes', 'career_history', 'personal_interests', 'next_topics', 'summary', 'details', 'next_action'].includes(key);
}

async function confirmAiDrafts() {
  if (!state.aiDraftResult) {
    showToast('请先生成草稿', true);
    return;
  }

  syncAiDraftInputs();
  const missing = getMissingRequiredDraftFields();
  if (missing.length) {
    showToast(`请先补充必填字段：${missing.join('、')}`, true);
    renderAiDrafts();
    return;
  }
  if (!ensureAiCustomerResolutionReady()) {
    return;
  }

  if (!confirm('确认把当前草稿写入正式数据库？\n\n写入前建议再次核对客户、联系人和拜访记录。')) {
    return;
  }

  els.aiConfirmDrafts.disabled = true;
  els.aiConfirmDrafts.textContent = '写入中';
  try {
    const customerId = await ensureAiCustomerConfirmed();
    const contactIds = await confirmAllAiContactDrafts(customerId);
    if (!state.aiConfirmed.visitId) {
      state.aiConfirmed.visitId = await saveAiVisitDraft(customerId, contactIds);
    }
    state.search = '';
    els.globalSearch.value = '';
    await refreshAll();
    await switchView('customers');
    await selectCustomer(customerId);
    showToast('智能录入草稿已全部写入数据库');
  } finally {
    els.aiConfirmDrafts.disabled = false;
    els.aiConfirmDrafts.textContent = '全部确认写入';
  }
}

async function confirmSingleAiDraft(draftId) {
  if (!state.aiDraftResult) {
    showToast('请先生成草稿', true);
    return;
  }
  const draft = getAiDraftById(draftId);
  const type = draft?.type;
  if (!draft || !type) {
    showToast('未找到要写入的草稿', true);
    return;
  }
  syncAiDraftInputs();
  const missing = getMissingRequiredDraftFields(draftId);
  if (missing.length) {
    showToast(`请先补充必填字段：${missing.join('、')}`, true);
    renderAiDrafts();
    return;
  }
  if ((type === 'customer' || type === 'contact' || type === 'visit') && !ensureAiCustomerResolutionReady()) {
    return;
  }

  if (type === 'customer') {
    state.aiConfirmed.customerId = await saveAiCustomerDraft();
    syncMatchedCustomerAfterConfirm();
    await refreshAll();
    showToast('客户草稿已写入或确认匹配');
  } else if (type === 'contact') {
    const customerId = await getRequiredAiCustomerId();
    state.aiConfirmed.contactIds[draftId] = await confirmAiContactDraft(customerId, draftId);
    await loadDashboard();
    showToast('联系人草稿已写入');
  } else if (type === 'visit') {
    const customerId = await getRequiredAiCustomerId();
    const contactIds = await confirmAllAiContactDrafts(customerId);
    state.aiConfirmed.visitId = await saveAiVisitDraft(customerId, contactIds);
    await loadDashboard();
    showToast('拜访记录草稿已写入');
  }
  renderAiDrafts();
}

function syncAiDraftInputs() {
  if (!state.aiDraftResult) {
    return;
  }
  const activeDraftId = els.detailDialog.open
    ? els.detailDialogBody.querySelector('.ai-draft-edit-dialog')?.dataset.draftId
    : '';
  if (activeDraftId) {
    saveAiDraftDialogFields(activeDraftId);
  }
  els.aiDraftResults.querySelectorAll('.ai-draft-card').forEach((card) => {
    const draft = state.aiDraftResult.drafts.find((item) => getDraftId(item) === card.dataset.draftId);
    if (!draft) {
      return;
    }
    card.querySelectorAll('[data-ai-field]').forEach((input) => {
      const field = draft.fields.find((item) => item.key === input.dataset.aiField);
      if (field) {
        field.value = input.value.trim();
        field.missing = isUnknownValue(field.value);
      }
    });
    draft.validation_errors = draft.fields
      .filter((field) => field.required && isUnknownValue(field.value))
      .map((field) => `${field.label}缺失`);
    draft.status = draft.validation_errors.length ? 'needs_human_input' : 'ready_for_review';
    draft.confidence = draft.validation_errors.length ? 'low' : 'medium';
  });
}

function getMissingRequiredDraftFields(type) {
  return state.aiDraftResult.drafts
    .filter((draft) => !type || draft.type === type || getDraftId(draft) === type)
    .filter((draft) => type || !getAiConfirmedId(draft))
    .flatMap((draft) =>
    draft.fields
      .filter((field) => field.required && isUnknownValue(field.value))
      .map((field) => `${draft.title}-${field.label}`)
  );
}

function getDraftValues(type) {
  const draft = state.aiDraftResult.drafts.find((item) => item.type === type);
  return Object.fromEntries((draft?.fields || []).map((field) => [field.key, cleanAiValue(field.value)]));
}

function getDraftValuesById(draftId) {
  const draft = getAiDraftById(draftId);
  return Object.fromEntries((draft?.fields || []).map((field) => [field.key, cleanAiValue(field.value)]));
}

function getAiDraftById(draftId) {
  return state.aiDraftResult?.drafts.find((draft) => getDraftId(draft) === draftId);
}

async function saveAiCustomerDraft() {
  const result = state.aiDraftResult;
  const values = getDraftValues('customer');
  const linkedId = state.aiLinked.customerId;
  if (linkedId) {
    state.aiConfirmed.customerId = linkedId;
    return linkedId;
  }
  if (!ensureAiCustomerResolutionReady()) {
    throw new Error('请先确认客户匹配方式');
  }
  if (state.aiCustomerDecision.mode === 'existing') {
    state.aiConfirmed.customerId = state.aiCustomerDecision.customerId;
    return state.aiConfirmed.customerId;
  }

  const customerId = await window.forexceltechApp.saveCustomer({
    name: values.name,
    short_name: values.short_name,
    industry: values.industry,
    region: values.region,
    address: values.address,
    website: values.website,
    phone: values.phone,
    status: normalizeCustomerStatus(values.status),
    importance_level: values.importance_level || '3',
    owner_name: values.owner_name,
    tags: values.tags,
    main_products: values.main_products,
    background: values.background,
    notes: values.notes
  });
  state.aiConfirmed.customerId = customerId;
  return customerId;
}

async function ensureAiCustomerConfirmed() {
  if (state.aiConfirmed.customerId) {
    return state.aiConfirmed.customerId;
  }
  return saveAiCustomerDraft();
}

async function getRequiredAiCustomerId() {
  if (state.aiConfirmed.customerId) {
    return state.aiConfirmed.customerId;
  }
  if (state.aiLinked.customerId || state.aiCustomerDecision.mode) {
    return ensureAiCustomerConfirmed();
  }
  showToast('联系人和拜访记录必须关联客户，请先写入客户草稿。', true);
  throw new Error('请先写入客户草稿');
}

function ensureAiCustomerResolutionReady() {
  if (state.aiLinked.customerId) {
    return true;
  }
  if (state.aiCustomerDecision.mode === 'new') {
    return true;
  }
  if (state.aiCustomerDecision.mode === 'existing' && state.aiCustomerDecision.customerId) {
    return true;
  }
  if (getAiCustomerCandidates().length) {
    showToast('请先在“客户匹配确认”中选择使用已有客户或按草稿新建客户。', true);
    renderAiDrafts();
    return false;
  }
  state.aiCustomerDecision = { mode: 'new', customerId: '' };
  return true;
}

function syncMatchedCustomerAfterConfirm() {
  const values = getDraftValues('customer');
  const existingCustomer = getCustomerById(state.aiConfirmed.customerId);
  state.aiDraftResult.matched_customer = {
    id: state.aiConfirmed.customerId,
    name: existingCustomer?.name || values.name || state.aiDraftResult.matched_customer?.name || state.aiConfirmed.customerId,
    short_name: existingCustomer?.short_name || values.short_name || ''
  };
  if (existingCustomer) {
    patchDraftFieldsForAll('contact', { customer_name: existingCustomer.name });
    patchDraftFields('visit', { customer_name: existingCustomer.name });
  }
}

async function confirmAllAiContactDrafts(customerId) {
  const contactDrafts = state.aiDraftResult.drafts.filter((draft) => draft.type === 'contact');
  const contactIds = [];
  for (const draft of contactDrafts) {
    const contactId = await confirmAiContactDraft(customerId, getDraftId(draft));
    if (contactId) {
      contactIds.push(contactId);
    }
  }
  return contactIds;
}

async function confirmAiContactDraft(customerId, draftId) {
  if (state.aiConfirmed.contactIds?.[draftId]) {
    return state.aiConfirmed.contactIds[draftId];
  }
  const contactDraft = getAiDraftById(draftId);
  if (contactDraft?.matched_existing_id) {
    state.aiConfirmed.contactIds[draftId] = contactDraft.matched_existing_id;
    return state.aiConfirmed.contactIds[draftId];
  }
  const contactId = await saveAiContactDraft(customerId, draftId);
  state.aiConfirmed.contactIds[draftId] = contactId;
  return contactId;
}

async function saveAiContactDraft(customerId, draftId) {
  const values = getDraftValuesById(draftId);
  return window.forexceltechApp.saveContact({
    customer_id: customerId,
    name: values.name,
    gender: values.gender,
    native_place: values.native_place,
    department: values.department,
    title: values.title,
    phone: values.phone,
    email: values.email,
    wechat: values.wechat,
    education: values.education,
    major: values.major,
    career_history: values.career_history,
    relationship_status: values.relationship_status,
    communication_preference: values.communication_preference,
    decision_role: values.decision_role,
    influence_level: values.influence_level || '3',
    personal_interests: values.personal_interests,
    next_topics: values.next_topics,
    notes: values.notes
  });
}

async function saveAiVisitDraft(customerId, contactIds = []) {
  const values = getDraftValues('visit');
  const occurredAt = parseAiDate(values.occurred_at);
  const normalizedContactIds = Array.isArray(contactIds) ? contactIds.filter(Boolean) : [contactIds].filter(Boolean);
  const visitPayload = {
    customer_id: customerId,
    type: normalizeVisitType(values.type),
    subject: values.subject,
    occurred_at: occurredAt,
    location: values.location,
    summary: values.summary,
    details: values.details,
    customer_attitude: values.customer_attitude,
    next_action: values.next_action,
    created_by: values.created_by,
    contact_ids: normalizedContactIds
  };
  const duplicate = await findLikelyDuplicateVisit(customerId, normalizedContactIds[0] || '', values, occurredAt);
  const duplicateDecision = duplicate ? await promptVisitDuplicateDecision(duplicate, visitPayload) : 'create';

  const visitId = await window.forexceltechApp.saveVisit({
    ...(duplicateDecision === 'merge' ? { id: duplicate.id } : {}),
    ...(duplicateDecision === 'merge' ? mergeVisitPayload(duplicate, visitPayload) : visitPayload)
  });
  state.aiConfirmed.visitId = visitId;
  if (duplicateDecision === 'merge') {
    showToast('已合并到疑似重复拜访记录');
  }
  return visitId;
}

async function findLikelyDuplicateVisit(customerId, contactId, values, occurredAt) {
  const allVisits = await window.forexceltechApp.listVisits('');
  const subject = cleanAiValue(values.subject);
  const occurredTime = new Date(occurredAt).getTime();
  const candidates = allVisits
    .filter((visit) => visit.customer_id === customerId)
    .map((visit) => {
      const score = scoreDuplicateVisit(visit, { contactId, subject, occurredTime });
      return { ...visit, duplicate_score: score };
    })
    .filter((visit) => visit.duplicate_score >= 4)
    .sort((a, b) => b.duplicate_score - a.duplicate_score || new Date(b.occurred_at) - new Date(a.occurred_at));

  return candidates[0] || null;
}

function scoreDuplicateVisit(visit, draft) {
  const visitTime = new Date(visit.occurred_at).getTime();
  if (Number.isNaN(visitTime) || Number.isNaN(draft.occurredTime)) {
    return 0;
  }

  let score = 0;
  const hoursDiff = Math.abs(visitTime - draft.occurredTime) / 36e5;
  if (hoursDiff <= 24) {
    score += 2;
  } else if (hoursDiff <= 72) {
    score += 1;
  } else {
    return 0;
  }

  const existingContactIds = String(visit.participant_ids || '').split(',').map((item) => item.trim()).filter(Boolean);
  if (draft.contactId) {
    if (!existingContactIds.includes(draft.contactId)) {
      return 0;
    }
    score += 2;
  }

  const subjectSimilarity = getTextSimilarity(visit.subject, draft.subject);
  if (subjectSimilarity >= 0.72) {
    score += 2;
  } else if (subjectSimilarity >= 0.45 || isTextIncluded(visit.subject, draft.subject)) {
    score += 1;
  } else if (draft.contactId) {
    score += 0;
  } else {
    return 0;
  }

  return score;
}

function promptVisitDuplicateDecision(visit, draftPayload) {
  return new Promise((resolve) => {
    els.duplicateVisitBody.innerHTML = renderDuplicateVisitPrompt(visit, draftPayload);
    const cleanup = (decision) => {
      els.duplicateCreateVisit.onclick = null;
      els.duplicateMergeVisit.onclick = null;
      els.duplicateDialogClose.onclick = null;
      els.duplicateDialog.oncancel = null;
      els.duplicateDialog.close();
      resolve(decision);
    };
    els.duplicateCreateVisit.onclick = () => cleanup('create');
    els.duplicateMergeVisit.onclick = () => cleanup('merge');
    els.duplicateDialogClose.onclick = () => cleanup('create');
    els.duplicateDialog.oncancel = (event) => {
      event.preventDefault();
      cleanup('create');
    };
    els.duplicateDialog.showModal();
  });
}

function renderDuplicateVisitPrompt(visit, draftPayload) {
  const rows = [
    duplicateCompareRow('客户', visit.customer_name, visit.customer_name, false),
    duplicateCompareRow('主题', visit.subject, draftPayload.subject, false),
    duplicateCompareRow('发生时间', formatDate(visit.occurred_at), formatDate(draftPayload.occurred_at), false),
    duplicateCompareRow('地点', visit.location, draftPayload.location, false),
    duplicateCompareRow('参与联系人', visit.participant_names, getContactNamesFromIds(draftPayload.contact_ids), true),
    duplicateCompareRow('摘要', visit.summary, draftPayload.summary, true),
    duplicateCompareRow('详细内容', visit.details, draftPayload.details, true),
    duplicateCompareRow('客户态度', visit.customer_attitude, draftPayload.customer_attitude, false),
    duplicateCompareRow('下一步动作', visit.next_action, draftPayload.next_action, false)
  ].join('');

  return `
    ${detailHero({
      title: '需要人工确认是否合并',
      subtitle: '系统发现一条可能相同或接近的拜访记录。请先核对差异，再决定合并或新建。',
      badges: [
        detailBadge('高风险操作', 'warning'),
        detailBadge('不会静默覆盖', 'primary')
      ].join('')
    })}
    <div class="duplicate-summary">
      <div>
        <span>疑似重复记录</span>
        <strong>${display(visit.subject)}</strong>
        <em>${display(visit.customer_name)} · ${formatDate(visit.occurred_at)}</em>
      </div>
      <div>
        <span>合并规则</span>
        <strong>保留原核心字段</strong>
        <em>默认只追加摘要/详细内容，并合并参与联系人。</em>
      </div>
    </div>
    <div class="duplicate-compare">
      <div class="duplicate-compare-head">
        <span>字段</span>
        <span>已有记录</span>
        <span>当前草稿</span>
        <span>合并处理</span>
      </div>
      ${rows}
    </div>
  `;
}

function duplicateCompareRow(label, existingValue, draftValue, willAppend) {
  const existingText = existingValue || '-';
  const draftText = draftValue || '-';
  const same = String(existingText).trim() === String(draftText).trim();
  const actionText = willAppend ? '追加/合并' : '保留已有';
  return `
    <div class="duplicate-compare-row ${same ? '' : 'changed'}">
      <span>${escapeHtml(label)}</span>
      <strong>${display(existingText)}</strong>
      <strong>${display(draftText)}</strong>
      <em>${same ? '无差异' : actionText}</em>
    </div>
  `;
}

function getContactNamesFromIds(contactIds = []) {
  return contactIds
    .map((contactId) => getContactById(contactId)?.name)
    .filter(Boolean)
    .join(', ');
}

function mergeVisitPayload(existingVisit, draftPayload) {
  return {
    customer_id: existingVisit.customer_id,
    type: existingVisit.type || draftPayload.type,
    subject: existingVisit.subject || draftPayload.subject,
    occurred_at: existingVisit.occurred_at || draftPayload.occurred_at,
    location: existingVisit.location || draftPayload.location,
    summary: combineText(existingVisit.summary, draftPayload.summary),
    details: combineText(existingVisit.details, draftPayload.details),
    customer_attitude: existingVisit.customer_attitude || draftPayload.customer_attitude,
    next_action: existingVisit.next_action || draftPayload.next_action,
    created_by: existingVisit.created_by || draftPayload.created_by,
    contact_ids: mergeContactIds(existingVisit.participant_ids, draftPayload.contact_ids)
  };
}

function combineText(existingText, newText) {
  const existing = String(existingText || '').trim();
  const next = String(newText || '').trim();
  if (!existing) {
    return next;
  }
  if (!next || existing.includes(next)) {
    return existing;
  }
  if (next.includes(existing)) {
    return next;
  }
  return `${existing}\n\n补充：${next}`;
}

function mergeContactIds(existingIds, newIds = []) {
  return [...new Set([
    ...String(existingIds || '').split(',').map((item) => item.trim()).filter(Boolean),
    ...newIds.filter(Boolean)
  ])];
}

function getTextSimilarity(left, right) {
  const leftTokens = tokenizeForSimilarity(left);
  const rightTokens = tokenizeForSimilarity(right);
  if (!leftTokens.size || !rightTokens.size) {
    return 0;
  }
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return intersection / union;
}

function tokenizeForSimilarity(value) {
  const normalized = String(value || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
  const tokens = new Set();
  for (const char of normalized) {
    tokens.add(char);
  }
  if (normalized.length >= 2) {
    for (let index = 0; index < normalized.length - 1; index += 1) {
      tokens.add(normalized.slice(index, index + 2));
    }
  }
  return tokens;
}

function isTextIncluded(left, right) {
  const a = String(left || '').trim();
  const b = String(right || '').trim();
  return Boolean(a && b && (a.includes(b) || b.includes(a)));
}

function areAllAiDraftsConfirmed() {
  const contactDrafts = state.aiDraftResult?.drafts.filter((draft) => draft.type === 'contact') || [];
  const allContactsConfirmed = contactDrafts.every((draft) => state.aiConfirmed.contactIds?.[getDraftId(draft)]);
  return Boolean(state.aiConfirmed.customerId && allContactsConfirmed && state.aiConfirmed.visitId);
}

function getCustomerById(customerId) {
  return state.aiCustomers.find((customer) => customer.id === customerId) || state.customers.find((customer) => customer.id === customerId);
}

function getContactById(contactId) {
  return state.aiContacts.find((contact) => contact.id === contactId) || state.contacts.find((contact) => contact.id === contactId);
}

function cleanAiValue(value) {
  return isUnknownValue(value) ? '' : String(value || '').trim();
}

function isUnknownValue(value) {
  const text = String(value || '').trim();
  return !text || text === '未知，待人为补充';
}

function normalizeCustomerStatus(status) {
  if (status === '活跃' || status === 'active') {
    return 'active';
  }
  if (status === '停用' || status === 'inactive') {
    return 'inactive';
  }
  return 'potential';
}

function normalizeVisitType(type) {
  if (type === '电话' || type === 'call') {
    return 'call';
  }
  if (type === '微信' || type === 'wechat') {
    return 'wechat';
  }
  if (type === '邮件' || type === 'email') {
    return 'email';
  }
  if (type === '同事转述' || type === 'internal_note') {
    return 'internal_note';
  }
  return 'visit';
}

function parseAiDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function confidenceLabel(confidence) {
  return {
    high: '高可信',
    medium: '中可信',
    low: '低可信'
  }[confidence] || display(confidence);
}

function getAiSampleTranscript() {
  return [
    '2026年6月20日我们拜访了试用客户-20260620-苏州智造，地点在客户会议室。',
    '客户属于半导体设备行业，区域在华东。',
    '本次主要和采购部李经理、设备工程部王工沟通新产线设备升级需求。',
    '王工反馈当前产线节拍不稳定，希望我们下周提供改造方案。',
    '李经理关注商务条件和交期，客户态度比较积极。',
    '下一步我们要在下周三前发送技术方案和初步报价。'
  ].join('\n');
}

async function selectCustomer(customerId) {
  state.selectedCustomerId = customerId;
  state.customerViewMode = 'list';
  state.selectedBundle = await window.forexceltechApp.getCustomer(customerId);
  setPaginationToItem('customers', state.customers, customerId);
  renderCustomers();
  openCustomerDetailDialog();
}

function openCustomerDetailDialog() {
  const bundle = state.selectedBundle;
  if (!bundle) {
    showToast('未找到客户详情', true);
    return;
  }

  const { customer, contacts, visits } = bundle;
  const tags = parseTags(customer.tags);
  const latestVisit = visits[0];

  closeDetailDialog();
  els.detailDialogTitle.textContent = '客户详情';
  els.detailDialogBody.innerHTML = `
    ${detailHero({
      title: customer.name,
      subtitle: `${display(customer.short_name)} · ${display(customer.industry)} · ${display(customer.province || customer.region)} ${display(customer.city, '')}`,
      badges: [
        detailBadge(statusLabel(customer.status), 'primary'),
        detailBadge(`重要等级 ${customer.importance_level ? `${customer.importance_level}/5` : '-'}`, 'muted'),
        detailBadge(`最近沟通 ${formatDate(latestVisit?.occurred_at)}`, 'muted')
      ].join(''),
      className: 'customer-detail-hero'
    })}

    <div class="summary-strip detail-summary-strip">
      <div>
        <span>客户状态</span>
        <strong>${statusLabel(customer.status)}</strong>
      </div>
      <div>
        <span>下一步动作</span>
        <strong>${display(latestVisit?.next_action, '暂无')}</strong>
      </div>
      <div>
        <span>负责人</span>
        <strong>${display(customer.owner_name)}</strong>
      </div>
    </div>

    <div class="detail-dialog-grid">
      ${detailInfoCell('状态', statusLabel(customer.status))}
      ${detailInfoCell('重要等级', customer.importance_level ? `${customer.importance_level}/5` : '-')}
      ${detailInfoCell('负责人', customer.owner_name)}
      ${detailInfoCell('电话', customer.phone)}
      ${detailInfoCell('省份', customer.province)}
      ${detailInfoCell('城市', customer.city)}
      ${detailInfoCell('地址', customer.address)}
      ${detailInfoCell('网站', customer.website)}
      ${detailInfoCell('创建时间', formatDate(customer.created_at))}
      ${detailInfoCell('更新时间', formatDate(customer.updated_at))}
    </div>

    ${tags.length > 0 ? `<div class="tag-row">${tags.map((tag) => `<span class="pill">${escapeHtml(tag)}</span>`).join('')}</div>` : ''}

    ${detailTextBlock('主要产品信息', customer.main_products || '暂无主要产品信息')}

    ${detailTextBlock('客户背景', customer.background || '暂无背景信息')}

    ${detailTextBlock('备注', customer.notes || '暂无备注')}

    <div class="section-block detail-section-card">
      <div class="panel-header">
        <h3>关键联系人</h3>
      </div>
      ${renderContacts(contacts)}
    </div>

    <div class="section-block detail-section-card">
      <div class="panel-header">
        <h3>拜访/沟通记录</h3>
      </div>
      ${renderVisits(visits)}
    </div>
  `;

  els.detailDialogActions.innerHTML = `
    <div class="dialog-action-right customer-detail-actions">
      <button class="secondary-button" type="button" data-action="edit-customer">编辑</button>
      <button class="secondary-button" type="button" data-action="add-contact">新增联系人</button>
      <button class="secondary-button" type="button" data-action="add-visit">新增拜访</button>
      <button class="danger-button" type="button" data-action="delete-customer">删除</button>
    </div>
  `;
  bindCustomerDetailActions(customer, contacts, visits, els.detailDialog);
  bindDetailDialogActions({});
  els.detailDialog.showModal();
}

function renderCustomerDetail() {
  openCustomerDetailDialog();
}

function infoCell(label, value) {
  return `<div class="info-cell"><span>${escapeHtml(label)}</span><strong>${display(value)}</strong></div>`;
}

function renderContacts(contacts) {
  if (!contacts.length) {
    return '<div class="record-list empty">暂无联系人。</div>';
  }

  return `<div class="record-list">${contacts.map((contact) => `
    <article class="record-item">
      <div class="record-item-grid">
        <div>
          <strong>${display(contact.name)}</strong>
          ${renderContactSummaryLines(contact)}
        </div>
        <div class="item-actions">
          <button class="secondary-button" type="button" data-action="edit-contact" data-id="${escapeHtml(contact.id)}">编辑</button>
          <button class="danger-button" type="button" data-action="delete-contact" data-id="${escapeHtml(contact.id)}">删除</button>
        </div>
      </div>
    </article>
  `).join('')}</div>`;
}

function renderContactSummaryLines(contact) {
  const lines = [
    joinFilled([
      contact.department,
      contact.title,
      contact.native_place ? `户籍：${contact.native_place}` : '',
      contact.influence_level ? `影响力 ${contact.influence_level}/5` : ''
    ]),
    joinFilled([
      contact.phone ? `电话：${contact.phone}` : '',
      contact.email ? `邮箱：${contact.email}` : '',
      contact.wechat ? `微信：${contact.wechat}` : ''
    ]),
    joinFilled([
      contact.relationship_status ? `关系：${contact.relationship_status}` : '',
      contact.communication_preference ? `偏好：${contact.communication_preference}` : '',
      contact.decision_role ? `角色：${contact.decision_role}` : ''
    ]),
    contact.next_topics ? `下次话题：${contact.next_topics}` : '',
    contact.personal_interests ? `兴趣：${contact.personal_interests}` : ''
  ].filter(Boolean);
  if (!lines.length) {
    return '<span class="record-meta">暂无补充信息</span>';
  }
  return lines.map((line) => `<span class="record-meta">${escapeHtml(line)}</span>`).join('');
}

function joinFilled(values = []) {
  return values
    .map((value) => String(value || '').trim())
    .filter((value) => value && value !== '-')
    .join(' · ');
}

function renderVisits(visits) {
  if (!visits.length) {
    return '<div class="record-list empty">暂无拜访或沟通记录。</div>';
  }

  return `<div class="record-list">${visits.map((visit) => `
    <article class="record-item">
      <div class="record-item-grid visit-record-grid">
        ${visitTimeBadge(visit.occurred_at)}
        <div>
          <strong>${display(visit.subject)}</strong>
          <span class="record-meta">${visitTypeLabel(visit.type)} · ${display(visit.location)}</span>
          <span class="record-meta">参与人：${display(visit.participant_names)}</span>
          <div class="content-box">${display(visit.summary || visit.details, '暂无摘要')}</div>
          <span class="record-meta">下一步：${display(visit.next_action)}</span>
        </div>
        <div class="item-actions">
          <button class="secondary-button" type="button" data-action="edit-visit" data-id="${escapeHtml(visit.id)}">编辑</button>
          <button class="danger-button" type="button" data-action="delete-visit" data-id="${escapeHtml(visit.id)}">删除</button>
        </div>
      </div>
    </article>
  `).join('')}</div>`;
}

function bindCustomerDetailActions(customer, contacts, visits, root) {
  root.querySelector('[data-action="edit-customer"]')?.addEventListener('click', () => {
    openFormAfterDetailClose(() => openCustomerDialog(customer));
  });
  root.querySelector('[data-action="delete-customer"]')?.addEventListener('click', async () => {
    if (confirm(`确认删除客户“${customer.name}”？\n\n删除后客户默认不再显示，现有数据会保留在数据库中用于后续恢复。`)) {
      await window.forexceltechApp.deleteCustomer(customer.id);
      state.selectedCustomerId = null;
      state.selectedBundle = null;
      state.customerViewMode = 'list';
      closeDetailDialog();
      await refreshAll();
      showToast('客户已删除');
    }
  });

  root.querySelectorAll('[data-action="add-contact"]').forEach((button) => {
    button.addEventListener('click', () => {
      openFormAfterDetailClose(() => openContactDialog({ customer_id: customer.id }));
    });
  });

  root.querySelectorAll('[data-action="add-visit"]').forEach((button) => {
    button.addEventListener('click', () => {
      openFormAfterDetailClose(() => openVisitDialog({ customer_id: customer.id }, contacts));
    });
  });

  root.querySelectorAll('[data-action="edit-contact"]').forEach((button) => {
    const contact = contacts.find((item) => item.id === button.dataset.id);
    button.addEventListener('click', () => {
      openFormAfterDetailClose(() => openContactDialog(contact));
    });
  });

  root.querySelectorAll('[data-action="delete-contact"]').forEach((button) => {
    const contact = contacts.find((item) => item.id === button.dataset.id);
    button.addEventListener('click', async () => {
      if (confirm(`确认删除联系人“${contact.name}”？\n\n该联系人将不再显示在客户详情中。`)) {
        await window.forexceltechApp.deleteContact(contact.id);
        await loadCustomers();
        await selectCustomer(customer.id);
        await loadDashboard();
        showToast('联系人已删除');
      }
    });
  });

  root.querySelectorAll('[data-action="edit-visit"]').forEach((button) => {
    const visit = visits.find((item) => item.id === button.dataset.id);
    button.addEventListener('click', () => {
      openFormAfterDetailClose(() => openVisitDialog(visit, contacts));
    });
  });

  root.querySelectorAll('[data-action="delete-visit"]').forEach((button) => {
    const visit = visits.find((item) => item.id === button.dataset.id);
    button.addEventListener('click', async () => {
      if (confirm(`确认删除拜访记录“${visit.subject}”？\n\n该沟通记录将不再显示在客户详情中。`)) {
        await window.forexceltechApp.deleteVisit(visit.id);
        await loadCustomers();
        await selectCustomer(customer.id);
        await loadDashboard();
        showToast('拜访记录已删除');
      }
    });
  });
}

function openCustomerBatchExportDialog() {
  const statusOptions = [
    ['', '全部状态'],
    ['potential', '潜在'],
    ['active', '活跃'],
    ['inactive', '停用']
  ];
  const industryOptions = [['', '全部行业'], ...getIndustryOptions().map((item) => [item, item])];
  const regionOptions = [['', '全部区域'], ...getRegionOptions().map((item) => [item, item])];

  openDialog({
    title: '批量导出客户',
    fields: [
      formSection('筛选范围', '', [
        field('export_search', '客户名称关键词', state.search),
        selectField('export_status', '客户状态', state.filters.status || '', statusOptions),
        selectField('export_industry', '行业', state.filters.industry || '', industryOptions),
        selectField('export_region', '区域', state.filters.region || '', regionOptions),
        staticHtml('<div id="customer-export-count" class="readonly-box customer-export-count">正在计算匹配客户数...</div>')
      ]),
      formSection('导出格式', '', [
        checkboxField('format_md', 'Markdown（轻量归档）', true),
        checkboxField('format_pdf', 'PDF（正式查看/归档）', true),
        checkboxField('format_docx', 'Word（可二次编辑）', false)
      ]),
      formSection('导出内容', '', [
        checkboxField('include_contacts', '包含关键联系人', true),
        checkboxField('include_visits', '包含拜访/沟通记录', true)
      ])
    ],
    onOpen: () => {
      const updateCount = debounce(async () => {
        const countEl = els.dialogFields.querySelector('#customer-export-count');
        if (!countEl) {
          return;
        }
        countEl.textContent = '正在计算匹配客户数...';
        try {
          const rows = await window.forexceltechApp.listCustomers(getCustomerExportFiltersFromDialog());
          countEl.textContent = `预计导出 ${rows.length} 个客户`;
        } catch (error) {
          countEl.textContent = `统计失败：${formatErrorMessage(error)}`;
        }
      }, 180);
      els.dialogFields.querySelectorAll('#export_search, #export_status, #export_industry, #export_region')
        .forEach((input) => {
          input.addEventListener('input', updateCount);
          input.addEventListener('change', updateCount);
        });
      updateCount();
    },
    onSubmit: async (payload) => {
      const formats = [
        payload.format_md ? 'md' : '',
        payload.format_pdf ? 'pdf' : '',
        payload.format_docx ? 'docx' : ''
      ].filter(Boolean);
      if (!formats.length) {
        throw new Error('请至少选择一种导出格式。');
      }
      const result = await window.forexceltechApp.exportCustomerDossiers({
        filters: {
          search: payload.export_search || '',
          status: payload.export_status || '',
          industry: payload.export_industry || '',
          region: payload.export_region || ''
        },
        formats,
        includeContacts: Boolean(payload.include_contacts),
        includeVisits: Boolean(payload.include_visits)
      });
      if (result.canceled) {
        showToast('已取消客户导出', 'warning');
        return;
      }
      showToast(`已导出 ${result.count || 0} 个客户：${result.dir}`);
    }
  });
}

function getCustomerExportFiltersFromDialog() {
  return {
    search: els.dialogFields.querySelector('#export_search')?.value || '',
    status: els.dialogFields.querySelector('#export_status')?.value || '',
    industry: els.dialogFields.querySelector('#export_industry')?.value || '',
    region: els.dialogFields.querySelector('#export_region')?.value || ''
  };
}

function debounce(fn, delay = 120) {
  let timer = null;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), delay);
  };
}

function openCustomerDialog(customer = {}) {
  const returnToMap = state.activeView === 'customer-map';
  const inferredLocation = getCustomerMapLocation(customer);
  const recognizedAddress = recognizeAddress(customer.address || customer.region || '');
  openDialog({
    title: customer.id ? '编辑客户' : '新增客户',
    fields: [
      formSection('基础信息', '用于识别客户和列表快速筛选。', [
        field('name', '客户名称', customer.name, 'text', true),
        field('short_name', '简称', customer.short_name),
        selectField('status', '状态', customer.status || 'potential', [
          ['potential', '潜在'],
          ['active', '活跃'],
          ['inactive', '停用']
        ]),
        field('importance_level', '重要等级 1-5', customer.importance_level || 3, 'number')
      ]),
      formSection('地址与区域', '先填写地址并识别，再自动生成区域、省份和城市。', [
        addressRecognitionField(customer.address),
        customerLocationFields({
          region: customer.region || recognizedAddress.region,
          industry: customer.industry,
          province: customer.province || inferredLocation.province || recognizedAddress.province,
          city: customer.city || inferredLocation.city || recognizedAddress.city
        })
      ]),
      formSection('业务信息', '记录负责人、联系方式和检索标签。', [
        field('owner_name', '负责人', customer.owner_name),
        field('phone', '电话', customer.phone),
        field('website', '网站', customer.website),
        field('tags', '标签，逗号分隔', parseTags(customer.tags).join(', '), 'text', false, true)
      ]),
      formSection('背景备注', '沉淀客户业务背景、合作状态和补充说明。', [
        field('main_products', '主要产品信息', customer.main_products, 'textarea', false, true),
        field('background', '客户背景', customer.background, 'textarea', false, true),
        field('notes', '备注', customer.notes, 'textarea', false, true)
      ])
    ],
    onSubmit: async (payload) => {
      const normalizedPayload = applyRecognizedLocationToPayload(payload);
      const id = await window.forexceltechApp.saveCustomer({ ...customer, ...normalizedPayload });
      state.selectedCustomerId = id;
      state.selectedBundle = null;
      state.customerViewMode = 'list';
      if (returnToMap) {
        await loadCustomers();
        await loadMapCustomers();
        renderCustomerMap();
      } else {
        await switchView('customers');
        await selectCustomer(id);
      }
      showToast(customer.id ? '客户已更新' : '客户已新增');
    },
    onOpen: setupCustomerLocationFields
  });
}

function openContactDialog(contact = {}) {
  openDialog({
    title: contact.id ? '编辑联系人' : '新增联系人',
    fields: [
      formSection('基础信息', '联系人必须归属到当前客户。', [
        field('name', '姓名', contact.name, 'text', true),
        segmentedField('gender', '性别', contact.gender, [
          ['男', '男'],
          ['女', '女']
        ])
      ]),
      formSection('职务与联系方式', '用于拜访前快速确认对接人身份和联系方式。', [
        field('department', '部门', contact.department),
        field('title', '职位', contact.title),
        field('phone', '电话', contact.phone),
        field('email', '邮箱', contact.email),
        field('wechat', '微信', contact.wechat)
      ]),
      formSection('关系与偏好', '用于判断沟通策略和决策影响。', [
        field('influence_level', '影响力 1-5', contact.influence_level || 3, 'number'),
        field('relationship_status', '关系状态', contact.relationship_status),
        field('communication_preference', '沟通偏好', contact.communication_preference),
        field('decision_role', '决策角色', contact.decision_role)
      ]),
      formSection('背景备注', '', [
        field('native_place', '户籍信息', contact.native_place),
        field('education', '学历', contact.education),
        field('major', '专业背景', contact.major),
        field('years_of_experience', '工作年限', contact.years_of_experience, 'number'),
        field('personal_interests', '个人兴趣', contact.personal_interests, 'textarea', false, true),
        field('next_topics', '下次可提及话题', contact.next_topics, 'textarea', false, true),
        field('career_history', '过往任职经历', contact.career_history, 'textarea', false, true),
        field('notes', '备注', contact.notes, 'textarea', false, true)
      ])
    ],
    onSubmit: async (payload) => {
      const customerId = contact.customer_id || state.selectedCustomerId;
      await window.forexceltechApp.saveContact({ ...contact, ...payload, customer_id: customerId });
      await loadCustomers();
      await loadContacts();
      await loadDashboard();
      if (state.activeView === 'customers') {
        await selectCustomer(customerId);
      } else if (state.activeView === 'contacts') {
        renderAllContacts();
      }
      showToast(contact.id ? '联系人已更新' : '联系人已新增');
    }
  });
}

function getRegionOptions() {
  return REGION_OPTIONS;
}

function prioritizeOptions(options = [], selectedValue = '') {
  const selected = String(selectedValue || '').trim();
  const unique = Array.from(new Set(options.filter(Boolean)));
  if (!selected || !unique.includes(selected)) {
    return unique;
  }
  return [selected, ...unique.filter((value) => value !== selected)];
}

function getProvinceOptions(selectedValue = '') {
  return prioritizeOptions(PROVINCE_MAP_POINTS.map((province) => province.name), normalizeProvince(selectedValue));
}

function getCityOptions(province = '', selectedValue = '') {
  const normalizedProvince = normalizeProvince(province);
  const provinceCities = normalizedProvince ? (PROVINCE_CITY_OPTIONS[normalizedProvince] || []) : [];
  const selectedCity = normalizeCity(selectedValue);
  return prioritizeOptions(provinceCities, provinceCities.includes(selectedCity) ? selectedCity : '');
}

function applyRecognizedLocationToPayload(payload) {
  const recognized = recognizeAddress(`${payload.province || ''} ${payload.city || ''} ${payload.address || ''}`);
  let province = normalizeProvince(payload.province) || recognized.province;
  let city = normalizeCity(payload.city) || recognized.city;

  if (!province && city) {
    province = CITY_PROVINCE_MAP.get(city) || '';
  }

  if (province) {
    const cityOptions = getCityOptions(province);
    if (city && !cityOptions.includes(city)) {
      throw new Error(`城市“${city}”不属于“${province}”，请重新选择城市。`);
    }
  } else if (city) {
    throw new Error('请先选择省份，再选择城市。');
  }

  return {
    ...payload,
    region: provinceToRegion(province),
    province,
    city
  };
}

function setupCustomerLocationFields() {
  const addressInput = els.dialogFields.querySelector('#address');
  const regionInput = els.dialogFields.querySelector('#region');
  const provinceInput = els.dialogFields.querySelector('#province');
  const cityInput = els.dialogFields.querySelector('#city');
  const recognizeButton = els.dialogFields.querySelector('#recognize-address');
  const regionDisplay = els.dialogFields.querySelector('#region-display');
  const provinceTrigger = els.dialogFields.querySelector('#province-trigger');
  const cityTrigger = els.dialogFields.querySelector('#city-trigger');
  const provincePanel = els.dialogFields.querySelector('[data-location-panel="province"]');
  const cityPanel = els.dialogFields.querySelector('[data-location-panel="city"]');

  function closeLocationPanels(exceptPanel = null) {
    [provincePanel, cityPanel].forEach((panel) => {
      if (!panel || panel === exceptPanel) {
        return;
      }
      panel.hidden = true;
    });
    provinceTrigger?.setAttribute('aria-expanded', String(provincePanel && !provincePanel.hidden));
    cityTrigger?.setAttribute('aria-expanded', String(cityPanel && !cityPanel.hidden));
  }

  function renderPanel(panel, values, activeValue, onSelect) {
    if (!panel) {
      return;
    }
    panel.innerHTML = values.map((value) => `
      <button class="location-picker-option ${value === activeValue ? 'active' : ''}" type="button" data-value="${escapeHtml(value)}">
        ${escapeHtml(value)}
      </button>
    `).join('');
    panel.querySelectorAll('.location-picker-option').forEach((button) => {
      button.addEventListener('click', () => {
        onSelect(button.dataset.value || '');
        closeLocationPanels();
      });
    });
  }

  function syncLocationState() {
    const province = normalizeProvince(provinceInput?.value);
    const region = provinceToRegion(province);
    const cityOptions = getCityOptions(province);
    let city = normalizeCity(cityInput?.value);

    if (!province || (city && !cityOptions.includes(city))) {
      city = '';
      if (cityInput) {
        cityInput.value = '';
      }
    }

    if (regionInput) {
      regionInput.value = region;
    }
    if (regionDisplay) {
      regionDisplay.value = region || '待选择省份后自动生成';
    }
    if (provinceTrigger) {
      provinceTrigger.textContent = province || '选择省份';
    }
    if (cityTrigger) {
      cityTrigger.textContent = city || (province ? '选择城市' : '请先选择省份');
      cityTrigger.disabled = !province;
    }

    renderPanel(provincePanel, getProvinceOptions(province), province, (value) => {
      const normalizedProvince = normalizeProvince(value);
      if (provinceInput) {
        provinceInput.value = normalizedProvince;
      }
      if (cityInput) {
        cityInput.value = ['北京', '天津', '上海', '重庆', '香港', '澳门'].includes(normalizedProvince) ? normalizedProvince : '';
      }
      syncLocationState();
    });
    renderPanel(cityPanel, cityOptions, city, (value) => {
      if (cityInput) {
        cityInput.value = normalizeCity(value);
      }
      syncLocationState();
    });
  }

  function applyRecognizedLocation(force = false) {
    const recognized = recognizeAddress(addressInput?.value || '');
    if (!recognized.province && !recognized.city) {
      showDialogMessage('未识别出省份和城市，请手动选择省份和城市。', true);
      return;
    }

    const changes = [
      [provinceInput, recognized.province],
      [cityInput, recognized.city]
    ].filter(([input, value]) => input && value && (force || !input.value || input.value === value));

    const conflicts = [
      [provinceInput, recognized.province, '省份'],
      [cityInput, recognized.city, '城市']
    ].filter(([input, value]) => input && value && input.value && input.value !== value);

    if (conflicts.length && !force) {
      const text = `识别结果为：${recognized.region || '-'} / ${recognized.province || '-'} / ${recognized.city || '-'}，是否覆盖当前填写？`;
      if (!confirm(text)) {
        showToast('已保留当前定位字段');
        return;
      }
      applyRecognizedLocation(true);
      return;
    }

    changes.forEach(([input, value]) => {
      input.value = value;
    });
    syncLocationState();
    showDialogMessage(`地址识别完成：${recognized.region || '-'} / ${recognized.province || '-'} / ${recognized.city || '-'}`);
  }

  provinceTrigger?.addEventListener('click', (event) => {
    event.stopPropagation();
    const isHidden = provincePanel?.hidden;
    closeLocationPanels(provincePanel);
    if (provincePanel) {
      provincePanel.hidden = !isHidden;
      provinceTrigger.setAttribute('aria-expanded', String(!provincePanel.hidden));
    }
  });
  cityTrigger?.addEventListener('click', (event) => {
    event.stopPropagation();
    if (!normalizeProvince(provinceInput?.value)) {
      showDialogMessage('请先选择省份，再选择城市。', true);
      return;
    }
    const isHidden = cityPanel?.hidden;
    closeLocationPanels(cityPanel);
    if (cityPanel) {
      cityPanel.hidden = !isHidden;
      cityTrigger.setAttribute('aria-expanded', String(!cityPanel.hidden));
    }
  });
  els.dialogFields.addEventListener('click', (event) => {
    if (!event.target.closest('.location-picker')) {
      closeLocationPanels();
    }
  });
  recognizeButton?.addEventListener('click', () => applyRecognizedLocation(false));
  syncLocationState();
}

function openVisitDialog(visit = {}, contacts = []) {
  openDialog({
    title: visit.id ? '编辑拜访记录' : '新增拜访记录',
    fields: [
      formSection('基础信息', '时间和主题是拜访记录的核心检索信息。', [
        selectField('type', '沟通类型', visit.type || 'visit', [
          ['visit', '现场拜访'],
          ['call', '电话'],
          ['wechat', '微信'],
          ['email', '邮件'],
          ['internal_note', '同事转述']
        ]),
        field('subject', '主题', visit.subject, 'text', true),
        field('occurred_at', '发生时间', toDatetimeLocal(visit.occurred_at), 'datetime-local', true),
        field('location', '地点', visit.location)
      ]),
      formSection('参与联系人', '可关联本次沟通出现的多个关键人。', [
        contactCheckboxes(contacts, visit.participant_ids)
      ]),
      formSection('沟通内容', '摘要用于列表快速阅读，详细内容用于完整复盘。', [
        field('summary', '摘要', visit.summary, 'textarea', false, true),
        field('details', '详细内容', visit.details, 'textarea', false, true)
      ]),
      formSection('后续动作', '记录客户态度、下一步和记录人。', [
        field('customer_attitude', '客户态度/倾向', visit.customer_attitude),
        field('created_by', '记录人', visit.created_by),
        field('next_action', '下一步动作', visit.next_action, 'textarea', false, true)
      ])
    ],
    onSubmit: async (payload) => {
      const customerId = visit.customer_id || state.selectedCustomerId;
      const visitId = await window.forexceltechApp.saveVisit({
        ...visit,
        ...payload,
        customer_id: customerId,
        occurred_at: fromDatetimeLocal(payload.occurred_at),
        contact_ids: readCheckedContacts()
      });
      if (visit.__plan_id) {
        await window.forexceltechApp.completeVisitPlan({
          planId: visit.__plan_id,
          visitId
        });
      }
      await loadCustomers();
      await loadVisits();
      await loadDashboard();
      await loadCalendarSummary();
      if (state.activeView === 'customers') {
        await selectCustomer(customerId);
      } else if (state.activeView === 'visits') {
        renderAllVisits();
      } else if (state.activeView === 'dashboard') {
        renderDashboard();
      }
      showToast(visit.__plan_id ? '计划已完成并写入拜访记录' : visit.id ? '拜访记录已更新' : '拜访记录已新增');
    }
  });
}

async function openVisitPlanDialog(plan = {}) {
  await loadAiAssociationData();
  const customers = state.aiCustomers.length ? state.aiCustomers : state.customers;
  if (!customers.length) {
    showToast('请先新增客户，再创建计划拜访。', true);
    return;
  }

  openDialog({
    title: plan.id ? '编辑计划拜访' : '新增计划拜访',
    fields: [
      formSection('拜访对象', '计划拜访必须关联客户，联系人可选。', [
        requiredSelectField('customer_id', '客户', plan.customer_id || state.selectedCustomerId || customers[0]?.id || '', customers.map((customer) => [customer.id, customer.name])),
        optionalSelectField('contact_id', '联系人（可选）', plan.contact_id || '', state.aiContacts.map((contact) => [
          contact.id,
          `${contact.customer_name || getCustomerById(contact.customer_id)?.name || '客户'} · ${contact.name}`
        ]))
      ]),
      formSection('时间与优先级', '过去日期不能新增或保存计划拜访。', [
        planDateField('planned_date', '计划日期', plan.planned_date || state.calendar.selectedDate || todayDateKey()),
        field('planned_time', '计划时间', plan.planned_time, 'time'),
        selectField('priority', '优先级', plan.priority || 'normal', [
          ['low', '低'],
          ['normal', '普通'],
          ['high', '高']
        ])
      ]),
      formSection('目的备注', '填写这次计划拜访要解决的问题。', [
        field('purpose', '拜访目的', plan.purpose || '客户跟进', 'text', true),
        field('notes', '计划备注', plan.notes, 'textarea', false, true)
      ])
    ],
    onSubmit: async (payload) => {
      if (isPastDateKey(payload.planned_date)) {
        throw new Error('不能在过去日期设置计划拜访。可以补录正式拜访记录。');
      }
      await window.forexceltechApp.saveVisitPlan({
        ...plan,
        ...payload
      });
      await refreshCalendarAndDashboard();
      const date = payload.planned_date || plan.planned_date || state.calendar.selectedDate;
      showToast(plan.id ? '计划拜访已更新' : '计划拜访已新增');
      window.setTimeout(() => {
        safeAction(() => openCalendarDayDialog(date));
      }, 0);
    }
  });
}

async function openCompleteVisitPlanDialog(plan) {
  if (!plan) {
    showToast('未找到计划拜访', true);
    return;
  }
  const bundle = await window.forexceltechApp.getCustomer(plan.customer_id);
  const occurredAt = `${plan.planned_date}T${plan.planned_time || '09:00'}`;
  openVisitDialog({
    __plan_id: plan.id,
    customer_id: plan.customer_id,
    type: 'visit',
    subject: plan.purpose || `${plan.customer_name || '客户'}拜访`,
    occurred_at: new Date(occurredAt).toISOString(),
    location: '',
    summary: plan.notes || '',
    next_action: '',
    participant_ids: plan.contact_id || ''
  }, bundle?.contacts || []);
}

function openDialog({ title, fields, onSubmit, onOpen }) {
  prepareEntityDialog();
  els.dialogTitle.textContent = title;
  els.dialogFields.innerHTML = '<div id="dialog-message" class="dialog-message full" hidden></div>' + fields.join('');
  els.entityForm.onsubmit = async (event) => {
    event.preventDefault();
    const submitButton = els.entityForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = '保存中';
    try {
      const formData = new FormData(els.entityForm);
      const payload = Object.fromEntries(formData.entries());
      await onSubmit(payload);
      closeDialog();
    } catch (error) {
      showDialogMessage(`保存失败：${formatErrorMessage(error)}`, true);
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = '保存';
    }
  };
  els.dialog.showModal();
  onOpen?.();
  requestAnimationFrame(() => {
    els.dialogFields.scrollTop = 0;
    const firstField = els.dialogFields.querySelector(
      'input[required]:not([type="hidden"]), select[required], input:not([type="hidden"]), select'
    );
    firstField?.focus();
    firstField?.select?.();
  });
}

function prepareEntityDialog() {
  if (els.detailDialog.open) {
    els.detailDialog.close();
  }
  if (els.duplicateDialog.open) {
    els.duplicateDialog.close();
  }
  if (els.dialog.open) {
    els.dialog.close();
  }
  els.entityForm.onsubmit = null;
}

function openFormAfterDetailClose(action) {
  closeDetailDialog();
  window.setTimeout(() => {
    action();
  }, 0);
}

function closeDialog() {
  els.entityForm.onsubmit = null;
  if (els.dialog.open) {
    els.dialog.close();
  }
}

function showDialogMessage(message, isError = false) {
  const messageEl = els.dialogFields.querySelector('#dialog-message');
  if (!messageEl) {
    showToast(message, isError);
    return;
  }
  messageEl.textContent = message;
  messageEl.hidden = false;
  messageEl.classList.toggle('error', isError);
  messageEl.scrollIntoView({ block: 'nearest' });
}

function formSection(title, _description, fields = []) {
  return `
    <section class="form-section full">
      <div class="form-section-head">
        <h3>${escapeHtml(title)}</h3>
      </div>
      <div class="form-section-grid">
        ${fields.join('')}
      </div>
    </section>
  `;
}

function field(name, label, value = '', type = 'text', required = false, full = false) {
  let tag;
  const requiredMark = required ? '<span class="required-mark">*</span>' : '';
  if (type === 'textarea') {
    tag = `<textarea id="${name}" name="${name}" rows="4" ${required ? 'required' : ''}>${escapeHtml(value)}</textarea>`;
  } else {
    const inputType = type === 'number' ? 'text' : type;
    const inputMode = type === 'number' ? ' inputmode="numeric"' : '';
    tag = `<input id="${name}" name="${name}" type="${inputType}"${inputMode} value="${escapeHtml(value)}" ${required ? 'required' : ''} />`;
  }
  return `<div class="field ${full ? 'full' : ''}"><label for="${name}">${escapeHtml(label)}${requiredMark}</label>${tag}</div>`;
}

function checkboxField(name, label, checked = false) {
  return `
    <label class="checkbox-line form-checkbox-line">
      <input id="${name}" name="${name}" type="checkbox" value="1" ${checked ? 'checked' : ''} />
      <span>${escapeHtml(label)}</span>
    </label>
  `;
}

function staticNote(text) {
  return `<div class="field full"><div class="readonly-box">${escapeHtml(text)}</div></div>`;
}

function staticHtml(html) {
  return `<div class="field full">${html}</div>`;
}

function datalistField(name, label, value = '', options = [], required = false) {
  const listId = `${name}-options`;
  return `
    <div class="field">
      <label for="${name}">${escapeHtml(label)}${required ? '<span class="required-mark">*</span>' : ''}</label>
      <input id="${name}" name="${name}" type="text" list="${listId}" value="${escapeHtml(value)}" ${required ? 'required' : ''} />
      <datalist id="${listId}">
        ${Array.from(new Set(options.filter(Boolean))).map((option) => `<option value="${escapeHtml(option)}"></option>`).join('')}
      </datalist>
    </div>
  `;
}

function addressRecognitionField(value = '') {
  return `
    <div class="field full address-recognition-field">
      <label for="address">地址</label>
      <div class="address-recognition-row">
        <input id="address" name="address" type="text" value="${escapeHtml(value)}" placeholder="例如：上海市浦东新区张江高科技园区" />
        <button id="recognize-address" class="secondary-button" type="button">识别地址</button>
      </div>
    </div>
  `;
}

function customerLocationFields(values = {}) {
  const province = normalizeProvince(values.province);
  const cityOptions = getCityOptions(province, values.city);
  const city = cityOptions.includes(normalizeCity(values.city)) ? normalizeCity(values.city) : '';
  const region = provinceToRegion(province);
  return `
    <div class="field full customer-location-field">
      <div class="customer-location-grid">
        ${readonlyComputedField('region', '区域', region, '待选择省份后自动生成')}
        ${datalistField('industry', '行业', values.industry, getIndustryOptions())}
        ${locationPickerField('province', '省份', province, getProvinceOptions(province), false)}
        ${locationPickerField('city', '城市', city, cityOptions, !province, province ? '选择城市' : '请先选择省份')}
      </div>
    </div>
  `;
}

function readonlyComputedField(name, label, value = '', placeholder = '') {
  return `
    <div class="field">
      <label for="${name}-display">${escapeHtml(label)}</label>
      <input id="${name}" name="${name}" type="hidden" value="${escapeHtml(value)}" />
      <input id="${name}-display" class="readonly-input" type="text" value="${escapeHtml(value || placeholder)}" readonly aria-readonly="true" />
    </div>
  `;
}

function getIndustryOptions() {
  return prioritizeOptions([
    '半导体设备',
    '半导体',
    '电子制造',
    '自动化设备',
    '精密制造',
    '智能装备',
    '新能源',
    '汽车电子',
    '存储',
    '光模块',
    ...(state.filterOptions.industries || [])
  ]);
}

function locationPickerField(name, label, value = '', options = [], disabled = false, placeholder = '') {
  const activeValue = String(value || '').trim();
  const buttonLabel = activeValue || placeholder || `选择${label}`;
  return `
    <div class="field location-picker-field">
      <label for="${name}-trigger">${escapeHtml(label)}</label>
      <div class="location-picker" data-picker="${escapeHtml(name)}">
        <input id="${name}" name="${name}" type="hidden" value="${escapeHtml(activeValue)}" />
        <button id="${name}-trigger" class="location-picker-trigger" type="button" aria-expanded="false" ${disabled ? 'disabled' : ''}>
          ${escapeHtml(buttonLabel)}
        </button>
        <div class="location-picker-panel" data-location-panel="${escapeHtml(name)}" hidden>
          ${options.map((option) => `
            <button class="location-picker-option ${option === activeValue ? 'active' : ''}" type="button" data-value="${escapeHtml(option)}">
              ${escapeHtml(option)}
            </button>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function planDateField(name, label, value = '') {
  return `
    <div class="field">
      <label for="${name}">${escapeHtml(label)}<span class="required-mark">*</span></label>
      <input id="${name}" name="${name}" type="date" value="${escapeHtml(value)}" min="${todayDateKey()}" required />
    </div>
  `;
}

function selectField(name, label, value, options) {
  return `
    <div class="field">
      <label for="${name}">${escapeHtml(label)}</label>
      <select id="${name}" name="${name}">
        ${options.map(([optionValue, optionLabel]) => `<option value="${escapeHtml(optionValue)}" ${optionValue === value ? 'selected' : ''}>${escapeHtml(optionLabel)}</option>`).join('')}
      </select>
    </div>
  `;
}

function segmentedField(name, label, value = '', options = []) {
  const normalizedValue = String(value || '').trim();
  return `
    <div class="field">
      <label>${escapeHtml(label)}</label>
      <div class="segmented-field" role="radiogroup" aria-label="${escapeHtml(label)}">
        ${options.map(([optionValue, optionLabel]) => `
          <label class="segmented-option ${optionValue === normalizedValue ? 'active' : ''}">
            <input type="radio" name="${escapeHtml(name)}" value="${escapeHtml(optionValue)}" ${optionValue === normalizedValue ? 'checked' : ''} />
            <span>${escapeHtml(optionLabel)}</span>
          </label>
        `).join('')}
      </div>
    </div>
  `;
}

function requiredSelectField(name, label, value, options) {
  return `
    <div class="field">
      <label for="${name}">${escapeHtml(label)}<span class="required-mark">*</span></label>
      <select id="${name}" name="${name}" required>
        ${options.map(([optionValue, optionLabel]) => `<option value="${escapeHtml(optionValue)}" ${optionValue === value ? 'selected' : ''}>${escapeHtml(optionLabel)}</option>`).join('')}
      </select>
    </div>
  `;
}

function optionalSelectField(name, label, value, options) {
  return `
    <div class="field">
      <label for="${name}">${escapeHtml(label)}</label>
      <select id="${name}" name="${name}">
        <option value="">不关联联系人</option>
        ${options.map(([optionValue, optionLabel]) => `<option value="${escapeHtml(optionValue)}" ${optionValue === value ? 'selected' : ''}>${escapeHtml(optionLabel)}</option>`).join('')}
      </select>
    </div>
  `;
}

function contactCheckboxes(contacts, participantIds = '') {
  const selectedIds = new Set(String(participantIds || '').split(',').filter(Boolean));
  if (!contacts.length) {
    return '<div class="field full"><label>参与联系人</label><div class="checkbox-grid muted">当前客户暂无联系人。</div></div>';
  }
  return `
    <div class="field full">
      <label>参与联系人</label>
      <div class="checkbox-grid">
        ${contacts.map((contact) => `
          <label>
            <input type="checkbox" name="contact_ids" value="${escapeHtml(contact.id)}" ${selectedIds.has(contact.id) ? 'checked' : ''} />
            ${display(contact.name)} ${contact.title ? `· ${display(contact.title)}` : ''}
          </label>
        `).join('')}
      </div>
    </div>
  `;
}

function readCheckedContacts() {
  return Array.from(document.querySelectorAll('input[name="contact_ids"]:checked')).map((input) => input.value);
}

function statusLabel(status) {
  return {
    potential: '潜在',
    active: '活跃',
    inactive: '停用'
  }[status] || display(status);
}

function visitTypeLabel(type) {
  return {
    visit: '现场拜访',
    call: '电话',
    wechat: '微信',
    email: '邮件',
    internal_note: '同事转述'
  }[type] || display(type);
}

function planPriorityLabel(priority) {
  return {
    low: '低优先级',
    normal: '普通优先级',
    high: '高优先级'
  }[priority] || display(priority);
}

async function safeAction(action) {
  try {
    await action();
  } catch (error) {
    showToast(formatErrorMessage(error), true);
  }
}

function formatErrorMessage(error) {
  const message = error?.message || String(error || '操作失败');
  return message
    .replace(/^Error invoking remote method '[^']+': Error: /, '')
    .replace(/^Error invoking remote method "[^"]+": Error: /, '')
    .trim() || '操作失败';
}

function showToast(message, variant = 'success') {
  els.toast.textContent = message;
  const type = variant === true || variant === 'error'
    ? 'error'
    : variant === 'warning'
      ? 'warning'
      : 'success';
  els.toast.classList.remove('success', 'warning', 'error');
  els.toast.classList.add(type);
  els.toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    els.toast.classList.remove('show');
  }, 4200);
}

bootstrap().catch((error) => {
  els.databasePath.textContent = `初始化失败：${error.message}`;
  console.error(error);
});
