PRAGMA foreign_keys = ON;

BEGIN;

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT,
  industry TEXT,
  region TEXT,
  province TEXT,
  city TEXT,
  district TEXT,
  address TEXT,
  website TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'potential',
  importance_level INTEGER DEFAULT 3 CHECK (importance_level BETWEEN 1 AND 5),
  owner_name TEXT,
  tags TEXT,
  main_products TEXT,
  background TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  name TEXT NOT NULL,
  gender TEXT,
  native_place TEXT,
  title TEXT,
  department TEXT,
  phone TEXT,
  email TEXT,
  wechat TEXT,
  education TEXT,
  major TEXT,
  years_of_experience INTEGER,
  career_history TEXT,
  influence_level INTEGER DEFAULT 3 CHECK (influence_level BETWEEN 1 AND 5),
  relationship_status TEXT,
  communication_preference TEXT,
  personal_interests TEXT,
  next_topics TEXT,
  decision_role TEXT,
  tags TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS opportunities (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  name TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'lead',
  amount REAL,
  currency TEXT NOT NULL DEFAULT 'CNY',
  expected_close_date TEXT,
  probability INTEGER DEFAULT 0 CHECK (probability BETWEEN 0 AND 100),
  competitors TEXT,
  requirements TEXT,
  risks TEXT,
  next_step TEXT,
  owner_name TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS visits (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  opportunity_id TEXT,
  type TEXT NOT NULL DEFAULT 'visit',
  subject TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  location TEXT,
  summary TEXT,
  details TEXT,
  customer_attitude TEXT,
  next_action TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS visit_participants (
  visit_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  role TEXT,
  PRIMARY KEY (visit_id, contact_id),
  FOREIGN KEY (visit_id) REFERENCES visits(id) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS visit_plans (
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
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON UPDATE CASCADE ON DELETE SET NULL,
  FOREIGN KEY (linked_visit_id) REFERENCES visits(id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS todos (
  id TEXT PRIMARY KEY,
  customer_id TEXT,
  contact_id TEXT,
  opportunity_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  due_at TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'open',
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON UPDATE CASCADE ON DELETE SET NULL,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON UPDATE CASCADE ON DELETE SET NULL,
  FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT,
  file_size INTEGER,
  created_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS import_export_logs (
  id TEXT PRIMARY KEY,
  operation TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  file_path TEXT,
  status TEXT NOT NULL,
  message TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_contacts_customer_id ON contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name);
CREATE INDEX IF NOT EXISTS idx_visits_customer_id ON visits(customer_id);
CREATE INDEX IF NOT EXISTS idx_visits_occurred_at ON visits(occurred_at);
CREATE INDEX IF NOT EXISTS idx_visit_plans_date ON visit_plans(planned_date);
CREATE INDEX IF NOT EXISTS idx_visit_plans_customer_id ON visit_plans(customer_id);
CREATE INDEX IF NOT EXISTS idx_visit_plans_status ON visit_plans(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_customer_id ON opportunities(customer_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_todos_due_at ON todos(due_at);
CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);
CREATE INDEX IF NOT EXISTS idx_attachments_entity ON attachments(entity_type, entity_id);

PRAGMA user_version = 1;

COMMIT;
