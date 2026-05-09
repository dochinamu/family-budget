-- ==========================================
-- duobook 가계부 — 초기 스키마
-- ==========================================

-- households
CREATE TABLE IF NOT EXISTS households (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL DEFAULT '우리집 가계부',
  created_at  timestamptz DEFAULT now()
);

-- categories
CREATE TABLE IF NOT EXISTS categories (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id   uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name           text NOT NULL,
  icon           text NOT NULL DEFAULT '📦',
  type           text NOT NULL CHECK (type IN ('expense', 'income')),
  color          text NOT NULL DEFAULT '#94a3b8',
  is_default     boolean DEFAULT false,
  created_at     timestamptz DEFAULT now()
);

-- recurring_rules (transactions 전에 선언)
CREATE TABLE IF NOT EXISTS recurring_rules (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id   uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  type           text NOT NULL CHECK (type IN ('expense', 'income')),
  amount         numeric NOT NULL CHECK (amount > 0),
  category_id    uuid REFERENCES categories(id) ON DELETE SET NULL,
  memo           text,
  day_of_month   int NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
  is_active      boolean DEFAULT true,
  created_at     timestamptz DEFAULT now()
);

-- transactions
CREATE TABLE IF NOT EXISTS transactions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id   uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  written_by     text,
  type           text NOT NULL CHECK (type IN ('expense', 'income')),
  amount         numeric NOT NULL CHECK (amount > 0),
  category_id    uuid REFERENCES categories(id) ON DELETE SET NULL,
  memo           text,
  date           date NOT NULL,
  is_recurring   boolean DEFAULT false,
  recurring_id   uuid REFERENCES recurring_rules(id) ON DELETE SET NULL,
  created_at     timestamptz DEFAULT now()
);

-- budget_goals
CREATE TABLE IF NOT EXISTS budget_goals (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id   uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  category_id    uuid REFERENCES categories(id) ON DELETE CASCADE,
  month          text NOT NULL,  -- "2025-06"
  amount         numeric NOT NULL CHECK (amount > 0),
  UNIQUE (household_id, category_id, month)
);

-- split_records
CREATE TABLE IF NOT EXISTS split_records (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id   uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES transactions(id) ON DELETE CASCADE,
  paid_by        text NOT NULL,
  split_ratio    jsonb NOT NULL DEFAULT '{}',
  settled        boolean DEFAULT false,
  settled_at     timestamptz,
  created_at     timestamptz DEFAULT now()
);

-- ==========================================
-- 인덱스
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_transactions_household_date
  ON transactions (household_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_date
  ON transactions (date);

CREATE INDEX IF NOT EXISTS idx_categories_household
  ON categories (household_id);

CREATE INDEX IF NOT EXISTS idx_budget_goals_household_month
  ON budget_goals (household_id, month);

-- ==========================================
-- RLS — 비활성화 (UUID가 접근 키 역할)
-- anon key로 전체 CRUD 허용
-- ==========================================
ALTER TABLE households      DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories      DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions    DISABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE budget_goals    DISABLE ROW LEVEL SECURITY;
ALTER TABLE split_records   DISABLE ROW LEVEL SECURITY;

-- ==========================================
-- Realtime 활성화 (이미 추가된 경우 무시)
-- ==========================================
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE categories;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
