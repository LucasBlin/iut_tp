import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateBudget } from '../src/budget.js';
import { buildRevisionPrompt } from '../src/exercice.js';
import { requestSchema } from '../src/schema.js';
import { travelWorkflow } from '../src/workflow.js';

const scenarioB = requestSchema.parse({ destination: 'Paris', budget: 500, days: 2, transport: 800, restaurants: false, mode: 'demo' });

async function runDemo() {
  const run = await travelWorkflow.createRun();
  const result = await run.start({ inputData: scenarioB });
  if (result.status !== 'success') throw new Error(`workflow ${result.status}`);
  return result;
}

test('le prompt de révision contient la critique de l’évaluateur', () => {
  // given
  const initial = {
    request: scenarioB,
    research: { sources: [], dailyEstimate: 150, estimateNote: 'hypothèse de test' },
    budgetResult: calculateBudget(scenarioB, 150),
    itinerary: 'ITINERAIRE-INITIAL',
  };
  // when
  const prompt = buildRevisionPrompt(initial, 'CRITIQUE-TEST');
  // then
  assert.ok(prompt.includes('CRITIQUE-TEST') && prompt.includes('ITINERAIRE-INITIAL'));
});

test('le workflow démo exécute evaluation puis revision, une seule fois chacune', async () => {
  // given / when
  const result = await runDemo();
  // then
  const path = result.stepExecutionPath ?? [];
  assert.deepEqual(path.filter((id) => id === 'evaluation' || id === 'revision'), ['evaluation', 'revision']);
});

test('scénario B : la critique simulée signale le déficit de 600 €', async () => {
  // given / when
  const result = await runDemo();
  // then
  assert.match(result.result.critique, /600/);
});

test('l’itinéraire initial est conservé à côté de la révision', async () => {
  // given / when
  const result = await runDemo();
  // then
  assert.notEqual(result.result.itinerary, result.result.revisedItinerary);
});
