/*
 * TODO 7 — Tester le passage critique → révision, sans réseau
 *
 * Un test ne doit jamais appeler un vrai modèle : il serait lent, payant et
 * non reproductible. Deux pistes complémentaires :
 *
 * 1. Tester les fonctions pures de src/exercice.ts.
 *    Construisez de fausses données : requestSchema.parse({... mode: 'demo'}),
 *    calculateBudget(...) pour budgetResult, un itinerary et une critique
 *    inventés (ex. 'CRITIQUE-TEST'). Vérifiez que buildRevisionPrompt(...)
 *    contient bien la critique et l'itinéraire initial
 *    (assert.match ou assert.ok(texte.includes(...))).
 *
 * 2. Tester le workflow complet en mode démo (voir tests/workflow.test.ts).
 *    Après run.start(...), result.stepExecutionPath liste les identifiants
 *    des étapes exécutées, dans l'ordre : vérifiez que 'evaluation' puis
 *    'revision' y figurent une seule fois chacune. Vérifiez aussi dans
 *    result.result que la critique signale le déficit, que l'itinéraire
 *    initial est conservé et que llmCalls vaut 0 en démo.
 *
 * Structure conseillée pour chaque test, une vérification principale par test :
 *   // given : les données d'entrée
 *   // when  : l'appel testé
 *   // then  : l'assertion
 *
 * Remplacez chaque test.todo par un vrai test(...) au fur et à mesure.
 */
import { test } from 'node:test';

test.todo('le prompt de révision contient la critique et l’itinéraire initial');
test.todo('le workflow démo exécute evaluation puis revision, une seule fois chacune');
test.todo('scénario B : la critique simulée signale le déficit de 600 €');
