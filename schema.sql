-- Tea Fellas Discovery Simulation — D1 Schema v2
-- Run: wrangler d1 execute teafellas-sessions --remote --file=schema.sql

DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS case_data;

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

-- Seed default financial figures
INSERT OR REPLACE INTO config (key, value) VALUES (
  'financial_figures',
  '{"baseline":{"dailyCustomers":250,"avgOrderValue":5.00,"monthlyRevenue":27500,"monthlyOpsCosts":18400,"monthlyDrawings":5000,"netMonthly":4100},"scenarioA":{"basic":{"setupCost":25000,"monthlyMaint":300,"queueReduction":"20–25%","errorReduction":"50–60%","revenueUplift":"8–10%"},"full":{"setupCost":120000,"monthlyMaint":500,"queueReduction":"35–40%","errorReduction":"75–80%","revenueUplift":"15–18%"}},"scenarioB":{"foodCentre":{"setupCost":80000,"monthlyRent":5500,"addStaffCost":7500,"totalAddMonthlyCosts":14500,"yr1DailyCustomers":150,"yr1MonthlyRevenue":16500,"yr3DailyCustomers":220,"yr3MonthlyRevenue":24200},"hub":{"setupCost":150000,"monthlyRent":9000,"addStaffCost":9500,"totalAddMonthlyCosts":20000,"yr1DailyCustomers":200,"yr1MonthlyRevenue":22000,"yr3DailyCustomers":320,"yr3MonthlyRevenue":35200}},"scenarioC":{"conservative":{"totalInvestment":105000,"addMonthlyCosts":15100,"approach":"Digital first (6 months), then expand"},"aggressive":{"totalInvestment":270000,"addMonthlyCosts":20800,"approach":"Run both simultaneously"}}}'
);
