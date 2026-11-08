import 'dotenv/config';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { requestSchema } from './schema.js';
import { travelWorkflow } from './workflow.js';

const app = new Hono();

app.get('/', (c) => c.html(HTML_PAGE));

app.post('/api/travel', async (c) => {
  try {
    const body = await c.req.json();
    const input = requestSchema.parse(body);
    const run = await travelWorkflow.createRun();
    const result = await run.start({ inputData: input });
    if (result.status !== 'success') {
      const message = result.status === 'failed' ? String(result.error) : 'exécution incomplète';
      return c.json({ error: message }, 500);
    }
    return c.json(result.result);
  } catch (err) {
    const message = err instanceof Error ? err.message : JSON.stringify(err);
    return c.json({ error: message }, 400);
  }
});

const port = Number(process.env.PORT) || 3000;
serve({ fetch: app.fetch, port }, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});

const HTML_PAGE = /* html */ `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>TP Voyage — Mastra Multi-Agent</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, sans-serif; background: #f5f5f5; color: #1a1a1a; line-height: 1.5; }
  .container { max-width: 860px; margin: 0 auto; padding: 2rem 1rem; }
  h1 { font-size: 1.5rem; margin-bottom: 1.5rem; }
  h2 { font-size: 1.1rem; margin-bottom: 0.5rem; color: #333; }

  .form-card { background: #fff; border-radius: 8px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 2rem; }
  .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1rem; }
  label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.875rem; font-weight: 500; }
  input, select { padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.875rem; }
  .checkbox-row { display: flex; align-items: center; gap: 0.5rem; }
  .checkbox-row input { width: auto; }
  button { padding: 0.6rem 1.5rem; background: #2563eb; color: #fff; border: none; border-radius: 6px; font-size: 0.875rem; cursor: pointer; }
  button:hover { background: #1d4ed8; }
  button:disabled { background: #93c5fd; cursor: not-allowed; }

  .results { display: none; }
  .results.visible { display: block; }
  .section { background: #fff; border-radius: 8px; padding: 1.25rem; margin-bottom: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .section h2 { border-bottom: 2px solid #e5e7eb; padding-bottom: 0.5rem; margin-bottom: 0.75rem; }
  .section pre { white-space: pre-wrap; word-break: break-word; font-size: 0.8125rem; background: #f9fafb; padding: 0.75rem; border-radius: 4px; max-height: 400px; overflow-y: auto; }
  .badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
  .badge-ok { background: #dcfce7; color: #166534; }
  .badge-ko { background: #fee2e2; color: #991b1b; }
  .llm-count { font-size: 2rem; font-weight: 700; color: #2563eb; }

  .error-banner { background: #fee2e2; color: #991b1b; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; display: none; }
  .error-banner.visible { display: block; }
  .spinner { display: none; margin-left: 0.5rem; }
  .spinner.visible { display: inline-block; }
</style>
</head>
<body>
<div class="container">
  <h1>TP Voyage — Architecture Multi-Agent</h1>

  <div class="form-card">
    <form id="travelForm">
      <div class="form-grid">
        <label>
          Destination
          <input type="text" name="destination" value="Paris" required>
        </label>
        <label>
          Budget (€)
          <input type="number" name="budget" value="1800" min="1" required>
        </label>
        <label>
          Jours
          <input type="number" name="days" value="4" min="1" max="30" required>
        </label>
        <label>
          Transport (€)
          <input type="number" name="transport" value="400" min="0" required>
        </label>
        <label>
          Mode
          <select name="mode">
            <option value="demo" selected>Démo (sans LLM)</option>
            <option value="live">Live (appels LLM)</option>
          </select>
        </label>
        <label class="checkbox-row" style="justify-content: flex-end; flex-direction: row; align-items: center;">
          <input type="checkbox" name="restaurants" checked>
          Restaurants
        </label>
      </div>
      <button type="submit" id="submitBtn">Lancer le workflow</button>
      <span class="spinner" id="spinner">⏳ Traitement en cours…</span>
    </form>
  </div>

  <div class="error-banner" id="errorBanner"></div>

  <div class="results" id="results">
    <div class="section">
      <h2>1. Données et budget calculé</h2>
      <pre id="outBudget"></pre>
    </div>
    <div class="section">
      <h2>2. Itinéraire initial</h2>
      <pre id="outInitial"></pre>
    </div>
    <div class="section">
      <h2>3. Critique de l'évaluateur</h2>
      <pre id="outCritique"></pre>
    </div>
    <div class="section">
      <h2>4. Itinéraire révisé</h2>
      <pre id="outRevised"></pre>
    </div>
    <div class="section">
      <h2>5. Appels LLM</h2>
      <div>
        <span class="llm-count" id="outLlmCount">0</span>
        <span>appel(s)</span>
        <span class="badge" id="outFeasible"></span>
      </div>
    </div>
  </div>
</div>

<script>
  const form = document.getElementById('travelForm');
  const btn = document.getElementById('submitBtn');
  const spinner = document.getElementById('spinner');
  const errorBanner = document.getElementById('errorBanner');
  const resultsDiv = document.getElementById('results');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    btn.disabled = true;
    spinner.classList.add('visible');
    errorBanner.classList.remove('visible');
    resultsDiv.classList.remove('visible');

    const fd = new FormData(form);
    const payload = {
      destination: fd.get('destination'),
      budget: Number(fd.get('budget')),
      days: Number(fd.get('days')),
      transport: Number(fd.get('transport')),
      restaurants: fd.has('restaurants'),
      mode: fd.get('mode'),
    };

    try {
      const res = await fetch('/api/travel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur serveur');

      document.getElementById('outBudget').textContent =
        'Demande : ' + JSON.stringify(data.request, null, 2) +
        '\n\nSources : ' + JSON.stringify(data.research, null, 2) +
        '\n\nBudget : ' + JSON.stringify(data.budgetResult, null, 2);
      document.getElementById('outInitial').textContent = data.itinerary;
      document.getElementById('outCritique').textContent = data.critique;
      document.getElementById('outRevised').textContent = data.revisedItinerary;
      document.getElementById('outLlmCount').textContent = data.llmCalls;

      const badge = document.getElementById('outFeasible');
      badge.textContent = data.budgetResult.feasible ? 'Faisable' : 'Impossible';
      badge.className = 'badge ' + (data.budgetResult.feasible ? 'badge-ok' : 'badge-ko');

      resultsDiv.classList.add('visible');
    } catch (err) {
      errorBanner.textContent = err.message;
      errorBanner.classList.add('visible');
    } finally {
      btn.disabled = false;
      spinner.classList.remove('visible');
    }
  });
</script>
</body>
</html>`;
