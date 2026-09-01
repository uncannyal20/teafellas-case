-- Tea Fellas Discovery Simulation — D1 Schema v3
-- Run: wrangler d1 execute teafellas-sessions --remote --file=schema.sql
--
-- v3 adds: teams, phase_gates, deliverables (for full 4-phase journey)
-- v2: sessions + config (Phase 1 interviews + scenario selection)

-- ── Existing tables (keep as-is) ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS sessions (
  team_code           TEXT NOT NULL,
  persona_id          TEXT NOT NULL,
  messages            TEXT    DEFAULT '[]',
  summary             TEXT    DEFAULT NULL,
  summary_confirmed   INTEGER DEFAULT 0,
  synthesis           TEXT    DEFAULT NULL,
  synthesis_confirmed INTEGER DEFAULT 0,
  declaration_done    INTEGER DEFAULT 0,
  scenario_selected   TEXT    DEFAULT NULL,
  updated_at          TEXT    DEFAULT (datetime('now')),
  PRIMARY KEY (team_code, persona_id)
);

CREATE TABLE IF NOT EXISTS config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- ── New tables (v3) ───────────────────────────────────────────────────

-- Team registry — validates team_code, tracks creation time
CREATE TABLE IF NOT EXISTS teams (
  team_code  TEXT PRIMARY KEY,   -- e.g. 'T1', 'T2' ... 'T8'
  created_at TEXT DEFAULT (datetime('now'))
);

-- Phase gate completions — one row per (team, phase) when completed
CREATE TABLE IF NOT EXISTS phase_gates (
  team_code    TEXT    NOT NULL,
  phase        INTEGER NOT NULL,  -- 1 = Research, 2 = Define, 3 = Ideate, 4 = Validate
  completed    INTEGER DEFAULT 0, -- 0 = not done, 1 = declared complete
  completed_at TEXT    DEFAULT NULL,
  PRIMARY KEY (team_code, phase)
);

-- Deliverables — flexible JSON store, one row per (team, deliverable type)
-- deliverable_id registry (see PLANNING.md for full list):
--   Phase 1: research_findings
--   Phase 2: problem_inventory, problem_priorities, problem_statement, product_vision
--   Phase 3: scenario_selected, risk_assessment, product_roadmap, solution_canvas,
--            tobe_process_notes, cba_inputs
--   Phase 4: strategy_canvas
CREATE TABLE IF NOT EXISTS deliverables (
  team_code      TEXT NOT NULL,
  deliverable_id TEXT NOT NULL,
  content        TEXT DEFAULT NULL,  -- JSON string
  updated_at     TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (team_code, deliverable_id)
);

-- ── Seed data ─────────────────────────────────────────────────────────

INSERT OR REPLACE INTO config (key, value) VALUES (
  'financial_figures',
  '{"baseline":{"dailyCustomers":250,"avgOrderValue":5.00,"monthlyRevenue":27500,"monthlyOpsCosts":18400,"monthlyDrawings":5000,"netMonthly":4100},"scenarioA":{"basic":{"setupCost":25000,"monthlyMaint":300,"queueReduction":"20–25%","errorReduction":"50–60%","revenueUplift":"8–10%"},"full":{"setupCost":150000,"monthlyMaint":1000,"queueReduction":"35–40%","errorReduction":"75–80%","revenueUplift":"15–18%"}},"scenarioB":{"foodCentre":{"setupCost":80000,"monthlyRent":5500,"addStaffCost":7500,"totalAddMonthlyCosts":14500,"yr1DailyCustomers":150,"yr1MonthlyRevenue":16500,"yr3DailyCustomers":220,"yr3MonthlyRevenue":24200},"hub":{"setupCost":150000,"monthlyRent":9000,"addStaffCost":9500,"totalAddMonthlyCosts":20000,"yr1DailyCustomers":200,"yr1MonthlyRevenue":22000,"yr3DailyCustomers":320,"yr3MonthlyRevenue":35200}},"scenarioC":{"conservative":{"totalInvestment":105000,"addMonthlyCosts":15100,"approach":"Digital first (6 months), then expand"},"aggressive":{"totalInvestment":300000,"addMonthlyCosts":21000,"approach":"Run both simultaneously"}}}'
);
