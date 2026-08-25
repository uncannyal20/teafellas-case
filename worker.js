/**
 * Cloudflare Worker — Tea Fellas Discovery Simulation
 * Anthropic API proxy + D1 session persistence + facilitator routes
 *
 * Deploy:
 *   wrangler secret put ANTHROPIC_API_KEY
 *   wrangler d1 execute teafellas-sessions --remote --file=schema.sql
 *   wrangler deploy
 */

const FACILITATOR_PASSWORD = 'TEAFELLAS2026';

const DEFAULT_CONFIG = {
  baseline: {
    dailyCustomers: 250,
    avgOrderValue: 5.00,
    monthlyRevenue: 27500,
    monthlyOpsCosts: 18400,
    monthlyDrawings: 5000,
    netMonthly: 4100
  },
  scenarioA: {
    basic:  { setupCost: 25000,  monthlyMaint: 300, queueReduction: '20–25%', errorReduction: '50–60%', revenueUplift: '8–10%'  },
    full:   { setupCost: 150000, monthlyMaint: 1000, queueReduction: '35–40%', errorReduction: '75–80%', revenueUplift: '15–18%' }
  },
  scenarioB: {
    foodCentre: { setupCost: 80000,  monthlyRent: 5500, addStaffCost: 7500, totalAddMonthlyCosts: 14500, yr1DailyCustomers: 150, yr1MonthlyRevenue: 16500, yr3DailyCustomers: 220, yr3MonthlyRevenue: 24200 },
    hub:        { setupCost: 150000, monthlyRent: 9000, addStaffCost: 9500, totalAddMonthlyCosts: 20000, yr1DailyCustomers: 200, yr1MonthlyRevenue: 22000, yr3DailyCustomers: 320, yr3MonthlyRevenue: 35200 }
  },
  scenarioC: {
    conservative: { totalInvestment: 105000, addMonthlyCosts: 15100, approach: 'Digital first (6 months), then expand' },
    aggressive:   { totalInvestment: 300000, addMonthlyCosts: 21000, approach: 'Run both simultaneously' }
  }
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-facilitator-password',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...cors },
      });

    const authFacilitator = () => {
      const pw = request.headers.get('x-facilitator-password');
      return pw === FACILITATOR_PASSWORD;
    };

    // ── POST /register-team ────────────────────────────────────
    // Idempotent — safe to call on every login attempt.
    if (url.pathname === '/register-team' && request.method === 'POST') {
      try {
        const { team_code } = await request.json();
        if (!team_code) return json({ error: 'team_code is required' }, 400);
        await env.DB.prepare(
          'INSERT OR IGNORE INTO teams (team_code) VALUES (?)'
        ).bind(team_code).run();
        return json({ ok: true });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    // ── GET /phase-gates ──────────────────────────────────────
    if (url.pathname === '/phase-gates' && request.method === 'GET') {
      try {
        const team_code = url.searchParams.get('team_code');
        if (!team_code) return json({ error: 'team_code is required' }, 400);
        const { results } = await env.DB.prepare(
          'SELECT phase, completed, completed_at FROM phase_gates WHERE team_code = ?'
        ).bind(team_code).all();
        // Return an object keyed by phase number for easy front-end lookup
        const gates = { 1: false, 2: false, 3: false, 4: false };
        for (const r of (results || [])) {
          gates[r.phase] = r.completed === 1;
        }
        return json({ gates });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    // ── POST /phase-gates ─────────────────────────────────────
    if (url.pathname === '/phase-gates' && request.method === 'POST') {
      try {
        const { team_code, phase } = await request.json();
        if (!team_code || !phase) return json({ error: 'team_code and phase are required' }, 400);
        await env.DB.prepare(`
          INSERT INTO phase_gates (team_code, phase, completed, completed_at)
          VALUES (?, ?, 1, datetime('now'))
          ON CONFLICT(team_code, phase) DO UPDATE SET
            completed    = 1,
            completed_at = datetime('now')
        `).bind(team_code, phase).run();
        return json({ ok: true });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    // ── GET /deliverables ─────────────────────────────────────
    if (url.pathname === '/deliverables' && request.method === 'GET') {
      try {
        const team_code      = url.searchParams.get('team_code');
        const deliverable_id = url.searchParams.get('deliverable_id');
        if (!team_code) return json({ error: 'team_code is required' }, 400);
        const { results } = deliverable_id
          ? await env.DB.prepare(
              'SELECT deliverable_id, content, updated_at FROM deliverables WHERE team_code = ? AND deliverable_id = ?'
            ).bind(team_code, deliverable_id).all()
          : await env.DB.prepare(
              'SELECT deliverable_id, content, updated_at FROM deliverables WHERE team_code = ?'
            ).bind(team_code).all();
        const deliverables = {};
        for (const r of (results || [])) {
          deliverables[r.deliverable_id] = {
            content:    safeParseJson(r.content, null),
            updated_at: r.updated_at,
          };
        }
        return json({ deliverables });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    // ── POST /deliverables ────────────────────────────────────
    if (url.pathname === '/deliverables' && request.method === 'POST') {
      try {
        const { team_code, deliverable_id, content } = await request.json();
        if (!team_code || !deliverable_id) return json({ error: 'team_code and deliverable_id are required' }, 400);
        await env.DB.prepare(`
          INSERT INTO deliverables (team_code, deliverable_id, content, updated_at)
          VALUES (?, ?, ?, datetime('now'))
          ON CONFLICT(team_code, deliverable_id) DO UPDATE SET
            content    = excluded.content,
            updated_at = datetime('now')
        `).bind(team_code, deliverable_id, JSON.stringify(content ?? null)).run();
        return json({ ok: true });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    // ── GET /all-teams — facilitator auth ─────────────────────
    // Returns all teams with phase gate status and deliverable count.
    if (url.pathname === '/all-teams' && request.method === 'GET') {
      if (!authFacilitator()) return json({ error: 'Unauthorised' }, 401);
      try {
        const { results: teamRows } = await env.DB.prepare('SELECT team_code, created_at FROM teams ORDER BY team_code').all();
        const { results: gateRows } = await env.DB.prepare('SELECT team_code, phase, completed FROM phase_gates').all();
        const { results: delivRows } = await env.DB.prepare('SELECT team_code, COUNT(*) as cnt FROM deliverables GROUP BY team_code').all();
        const { results: sessRows  } = await env.DB.prepare('SELECT team_code, COUNT(*) as cnt FROM sessions GROUP BY team_code').all();

        const gateMap  = {};
        const delivMap = {};
        const sessMap  = {};
        for (const r of (gateRows  || [])) { if (!gateMap[r.team_code])  gateMap[r.team_code]  = {}; gateMap[r.team_code][r.phase] = r.completed === 1; }
        for (const r of (delivRows || [])) delivMap[r.team_code] = r.cnt;
        for (const r of (sessRows  || [])) sessMap[r.team_code]  = r.cnt;

        const teams = (teamRows || []).map(t => ({
          team_code:      t.team_code,
          created_at:     t.created_at,
          phases:         { 1: !!(gateMap[t.team_code]||{})[1], 2: !!(gateMap[t.team_code]||{})[2], 3: !!(gateMap[t.team_code]||{})[3], 4: !!(gateMap[t.team_code]||{})[4] },
          deliverable_count: delivMap[t.team_code] || 0,
          interview_count:   sessMap[t.team_code]  || 0,
        }));
        return json({ teams });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    // ── POST / — Anthropic API proxy ───────────────────────────
    if (url.pathname === '/' && request.method === 'POST') {
      try {
        const body = await request.json();
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify(body),
        });
        const data = await resp.json();
        return json(data, resp.status);
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    // ── POST /save-session ─────────────────────────────────────
    if (url.pathname === '/save-session' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { team_code, persona_id } = body;
        if (!team_code || !persona_id) {
          return json({ error: 'team_code and persona_id are required' }, 400);
        }

        // Partial upsert — only overwrite fields that are present in the request body.
        // COALESCE keeps existing value if new value is NULL.
        await env.DB.prepare(`
          INSERT INTO sessions (team_code, persona_id, messages, summary, summary_confirmed,
                                synthesis, synthesis_confirmed, declaration_done, scenario_selected, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(team_code, persona_id) DO UPDATE SET
            messages            = CASE WHEN ?  IS NOT NULL THEN ?  ELSE messages            END,
            summary             = CASE WHEN ?  IS NOT NULL THEN ?  ELSE summary             END,
            summary_confirmed   = CASE WHEN ?  IS NOT NULL THEN ?  ELSE summary_confirmed   END,
            synthesis           = CASE WHEN ?  IS NOT NULL THEN ?  ELSE synthesis           END,
            synthesis_confirmed = CASE WHEN ?  IS NOT NULL THEN ?  ELSE synthesis_confirmed END,
            declaration_done    = CASE WHEN ?  IS NOT NULL THEN ?  ELSE declaration_done    END,
            scenario_selected   = CASE WHEN ?  IS NOT NULL THEN ?  ELSE scenario_selected   END,
            updated_at          = datetime('now')
        `).bind(
          // INSERT values
          team_code,
          persona_id,
          body.messages  !== undefined ? JSON.stringify(body.messages)  : '[]',
          body.summary   !== undefined ? JSON.stringify(body.summary)   : null,
          body.summary_confirmed   !== undefined ? (body.summary_confirmed   ? 1 : 0) : 0,
          body.synthesis !== undefined ? JSON.stringify(body.synthesis) : null,
          body.synthesis_confirmed !== undefined ? (body.synthesis_confirmed ? 1 : 0) : 0,
          body.declaration_done    !== undefined ? (body.declaration_done    ? 1 : 0) : 0,
          body.scenario_selected   !== undefined ? body.scenario_selected   : null,
          // UPDATE CASE bindings (pairs: sentinel, value)
          body.messages  !== undefined ? JSON.stringify(body.messages)  : null,
          body.messages  !== undefined ? JSON.stringify(body.messages)  : null,
          body.summary   !== undefined ? JSON.stringify(body.summary)   : null,
          body.summary   !== undefined ? JSON.stringify(body.summary)   : null,
          body.summary_confirmed   !== undefined ? (body.summary_confirmed   ? 1 : 0) : null,
          body.summary_confirmed   !== undefined ? (body.summary_confirmed   ? 1 : 0) : null,
          body.synthesis !== undefined ? JSON.stringify(body.synthesis) : null,
          body.synthesis !== undefined ? JSON.stringify(body.synthesis) : null,
          body.synthesis_confirmed !== undefined ? (body.synthesis_confirmed ? 1 : 0) : null,
          body.synthesis_confirmed !== undefined ? (body.synthesis_confirmed ? 1 : 0) : null,
          body.declaration_done    !== undefined ? (body.declaration_done    ? 1 : 0) : null,
          body.declaration_done    !== undefined ? (body.declaration_done    ? 1 : 0) : null,
          body.scenario_selected   !== undefined ? body.scenario_selected   : null,
          body.scenario_selected   !== undefined ? body.scenario_selected   : null,
        ).run();

        return json({ ok: true });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    // ── GET /load-session ──────────────────────────────────────
    if (url.pathname === '/load-session' && request.method === 'GET') {
      try {
        const team_code  = url.searchParams.get('team_code');
        const persona_id = url.searchParams.get('persona_id');
        if (!team_code) return json({ error: 'team_code is required' }, 400);

        const { results } = persona_id
          ? await env.DB.prepare(
              'SELECT * FROM sessions WHERE team_code = ? AND persona_id = ?'
            ).bind(team_code, persona_id).all()
          : await env.DB.prepare(
              'SELECT * FROM sessions WHERE team_code = ?'
            ).bind(team_code).all();

        const rows = (results || []).map(r => ({
          persona_id:          r.persona_id,
          messages:            safeParseJson(r.messages, []),
          summary:             safeParseJson(r.summary, null),
          summary_confirmed:   r.summary_confirmed   === 1,
          synthesis:           safeParseJson(r.synthesis, null),
          synthesis_confirmed: r.synthesis_confirmed === 1,
          declaration_done:    r.declaration_done    === 1,
          scenario_selected:   r.scenario_selected   || null,
          updated_at:          r.updated_at,
        }));

        return json({ rows });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    // ── GET /team-progress ─────────────────────────────────────
    if (url.pathname === '/team-progress' && request.method === 'GET') {
      try {
        const team_code = url.searchParams.get('team_code');

        const { results } = team_code
          ? await env.DB.prepare('SELECT * FROM sessions WHERE team_code = ?').bind(team_code).all()
          : await env.DB.prepare('SELECT * FROM sessions').all();

        // Group by team_code
        const teamsMap = {};
        for (const r of (results || [])) {
          if (!teamsMap[r.team_code]) {
            teamsMap[r.team_code] = { team_code: r.team_code, personas: {}, declaration_done: false, declaration_at: null, scenario_selected: null };
          }
          const t = teamsMap[r.team_code];

          if (r.persona_id === 'group') {
            t.declaration_done  = r.declaration_done === 1;
            t.declaration_at    = r.declaration_done === 1 ? r.updated_at : null;
            t.scenario_selected = r.scenario_selected || null;
          } else {
            t.personas[r.persona_id] = {
              has_messages:      (safeParseJson(r.messages, [])).length > 0,
              summary_confirmed: r.summary_confirmed === 1,
            };
          }
        }

        return json({ teams: Object.values(teamsMap) });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    // ── GET /config ────────────────────────────────────────────
    if (url.pathname === '/config' && request.method === 'GET') {
      try {
        const row = await env.DB.prepare(
          "SELECT value FROM config WHERE key = 'financial_figures'"
        ).first();
        const figures = row ? safeParseJson(row.value, DEFAULT_CONFIG) : DEFAULT_CONFIG;
        return json({ financial_figures: figures });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    // ── POST /config — facilitator auth ────────────────────────
    if (url.pathname === '/config' && request.method === 'POST') {
      if (!authFacilitator()) return json({ error: 'Unauthorised' }, 401);
      try {
        const { key, value } = await request.json();
        if (!key || value === undefined) return json({ error: 'key and value required' }, 400);
        await env.DB.prepare(
          'INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)'
        ).bind(key, JSON.stringify(value)).run();
        return json({ ok: true });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    // ── POST /reset-sessions — facilitator auth ────────────────
    if (url.pathname === '/reset-sessions' && request.method === 'POST') {
      if (!authFacilitator()) return json({ error: 'Unauthorised' }, 401);
      try {
        await env.DB.prepare('DELETE FROM sessions').run();
        return json({ ok: true, message: 'All session data cleared' });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    // ── POST /reset-team ───────────────────────────────────────
    if (url.pathname === '/reset-team' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { team_code } = body;
        if (!team_code) return json({ error: 'team_code is required' }, 400);
        await env.DB.prepare('DELETE FROM sessions WHERE team_code = ?').bind(team_code).run();
        return json({ ok: true });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    return json({ error: 'Not found' }, 404);
  },
};

function safeParseJson(str, fallback) {
  if (str === null || str === undefined) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}
