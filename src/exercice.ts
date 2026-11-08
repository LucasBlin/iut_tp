/*
 * EXERCICE — Ajouter un agent évaluateur et une révision au workflow
 * ===================================================================
 *
 * Aujourd'hui :  recherche → budget → planification
 * Objectif   :  recherche → budget → planification → evaluation → revision
 *
 * Rappel : un workflow Mastra fait circuler UN objet. Chaque étape reçoit la
 * sortie de la précédente (inputData) et renvoie ce même objet enrichi d'un
 * ou plusieurs champs. Ouvrez l'interface (`npm run web`), lancez le scénario A
 * en démo et dépliez « Produit (output) » de l'étape planification : c'est
 * exactement ce que recevra votre étape evaluation.
 *
 * Suivez les TODO dans l'ordre :
 *   TODO 1  ce fichier             instructions de l'agent évaluateur
 *   TODO 2  src/schema.ts          schémas de sortie des deux nouvelles étapes
 *   TODO 3  ce fichier             prompt de critique + étape « evaluation »
 *   TODO 4  ce fichier             prompt de révision + étape « revision »
 *   TODO 5  src/workflow.ts        brancher les deux étapes
 *   TODO 6  src/cli.ts             afficher les 5 sorties séparément
 *   TODO 7  tests/review.test.ts   tester critique → révision sans réseau
 *
 * Après chaque TODO : `npm run check` (types) puis `npm test`.
 * Le fichier compile dès le départ : les étapes existent mais ne sont pas
 * encore branchées au workflow, et lèvent une erreur si on les exécute.
 *
 * Règles du TP : une seule révision (pas de boucle), le budget reste calculé
 * par le code (l'agent le lit, il ne le recalcule pas), le mode démo doit
 * fonctionner sans clé API.
 */
import { Agent } from '@mastra/core/agent';
import { createStep } from '@mastra/core/workflows';
import type { z } from 'zod';
import { getModelConfig } from './agents.js';
import { resultSchema } from './schema.js';

type InitialResult = z.infer<typeof resultSchema>;

/*
 * TODO 1 — Instructions de l'évaluateur
 *
 * Les instructions sont le « prompt système » de l'agent : elles valent pour
 * tous ses appels. Inspirez-vous de createPlanner() dans src/agents.ts.
 * L'évaluateur doit contrôler, et le dire explicitement :
 *   - le budget : l'itinéraire respecte-t-il budgetResult ? Le déficit du
 *     scénario B (600 €) est-il annoncé ? Il ne doit PAS recalculer le budget ;
 *   - les contraintes de la demande : durée, restaurants, destination ;
 *   - les sources : sont-elles citées ? présentées comme fictives (démo) ou
 *     non vérifiées (live) ?
 *   - les incertitudes : prix, horaires ou disponibilités inventés,
 *     informations manquantes (dates, nombre de voyageurs…).
 * Demandez une critique structurée, avec des changements concrets à faire :
 * elle sera lue par le planificateur, pas par un humain.
 */
export function createReviewer() {
  return new Agent({
    id: 'evaluateur',
    name: 'Évaluateur',
    model: getModelConfig(),
    instructions: 'TODO 1 : définir les critères de critique.',
  });
}

/*
 * TODO 3a — Prompt envoyé à l'évaluateur
 *
 * Le prompt est le message d'UN appel. L'évaluateur ne voit que ce que vous
 * mettez dedans : s'il manque le budget, il ne peut pas le contrôler.
 * D'après le contrat d'entrée (SCHEMA_ET_ATTENDU.md), transmettez :
 *   data.request, data.research, data.budgetResult et data.itinerary.
 * Astuce : JSON.stringify(objet) transforme un objet en texte lisible par le
 * modèle. Séparez clairement les « données » de « l'itinéraire à évaluer ».
 */
export function buildReviewPrompt(data: InitialResult): string {
  return 'TODO 3a';
}

/*
 * TODO 3b — Étape « evaluation »
 *
 * 1. Mode démo (inputData.request.mode === 'demo') : n'appelez PAS l'agent.
 *    Renvoyez une critique simulée, par exemple construite à partir de
 *    inputData.budgetResult (feasible, margin). Sinon `npm test` et le mode
 *    sans clé cassent.
 * 2. Mode live : `await createReviewer().generate(buildReviewPrompt(inputData))`
 *    renvoie une réponse ; le texte est dans `.text`.
 * 3. Renvoyez { ...inputData, critique, llmCalls }.
 *    llmCalls = nombre d'appels LLM réellement faits depuis le début du
 *    workflow, celui-ci compris. Combien d'étapes agent ont déjà tourné avant
 *    l'évaluation ? (l'interface web les colore en violet). Et en démo ?
 * 4. Remplacez outputSchema par reviewedSchema (TODO 2), puis supprimez le throw.
 *
 * Si generate() échoue, laissez l'erreur remonter : le workflow passera en
 * « failed » et l'erreur s'affichera. Ne renvoyez jamais un faux texte.
 */
export const reviewStep = createStep({
  id: 'evaluation',
  description: 'Critique l’itinéraire initial : budget, contraintes, sources, incertitudes.',
  inputSchema: resultSchema,
  outputSchema: resultSchema,
  execute: async ({ inputData }) => {
    throw new Error('TODO 3 : étape evaluation non implémentée.');
  },
});

/*
 * TODO 4a — Prompt de révision envoyé au planificateur
 *
 * Le planificateur ne se souvient pas de son premier appel : chaque
 * generate() repart de zéro. Il faut donc lui renvoyer les données, SON
 * itinéraire initial ET la critique, puis lui demander une version corrigée
 * qui tient compte de chaque remarque et reste dans les données fournies.
 */
export function buildRevisionPrompt(data: InitialResult, critique: string): string {
  return 'TODO 4a';
}

/*
 * TODO 4b — Étape « revision »
 *
 * Même structure que l'étape evaluation :
 *   - inputSchema  = reviewedSchema (elle reçoit la sortie de evaluation) ;
 *   - outputSchema = revisedSchema ;
 *   - démo : itinéraire révisé simulé, sans appel ;
 *   - live : UN SEUL appel à createPlanner() (à importer depuis ./agents.js)
 *     avec buildRevisionPrompt(inputData, inputData.critique) ;
 *   - renvoyez { ...inputData, revisedItinerary, llmCalls } en ajoutant
 *     l'appel de révision au compteur, uniquement en live.
 * Ne modifiez pas inputData.itinerary : l'itinéraire initial doit rester
 * visible pour la comparaison.
 */
export const reviseStep = createStep({
  id: 'revision',
  description: 'Une seule révision de l’itinéraire par le planificateur, à partir de la critique.',
  inputSchema: resultSchema,
  outputSchema: resultSchema,
  execute: async ({ inputData }) => {
    throw new Error('TODO 4 : étape revision non implémentée.');
  },
});
