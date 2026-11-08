import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getModelConfig } from '../src/agents.js';
test('utilise gpt-4o-mini par défaut quand la clé OpenAI est présente', () => {
  assert.equal(getModelConfig({OPENAI_API_KEY:'test'}), 'openai/gpt-4o-mini');
});
test('respecte le modèle OpenAI choisi dans MASTRA_MODEL', () => {
  assert.equal(getModelConfig({OPENAI_API_KEY:'test', MASTRA_MODEL:'openai/gpt-4.1-mini'}), 'openai/gpt-4.1-mini');
});
test('signale une clé OpenAI absente', () => {
  assert.throws(() => getModelConfig({}), /OPENAI_API_KEY/);
});
test('refuse un modèle qui n’est pas OpenAI', () => {
  assert.throws(() => getModelConfig({OPENAI_API_KEY:'test', MASTRA_MODEL:'autre/modele'}), /openai\//);
});
