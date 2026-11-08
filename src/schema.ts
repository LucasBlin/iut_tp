import { z } from 'zod';

export const requestSchema = z.object({
  destination: z.string().trim().min(1).max(100),
  budget: z.number().finite().positive(),
  days: z.number().int().min(1).max(30),
  transport: z.number().finite().nonnegative(),
  restaurants: z.boolean(),
  mode: z.enum(['demo', 'live']),
});
export type TravelRequest = z.infer<typeof requestSchema>;
export const sourceSchema = z.object({ title: z.string(), url: z.string().url(), content: z.string() });
export const researchSchema = z.object({ sources: z.array(sourceSchema), summary: z.string().optional(), dailyEstimate: z.number().positive(), estimateNote: z.string() });
export const budgetSchema = z.object({ accommodation: z.number(), food: z.number(), activities: z.number(), other: z.number(), transport: z.number(), total: z.number(), margin: z.number(), feasible: z.boolean(), maxDays: z.number() });
export const researchedSchema = z.object({ request: requestSchema, research: researchSchema });
export const budgetedSchema = researchedSchema.extend({ budgetResult: budgetSchema });
export const resultSchema = budgetedSchema.extend({ itinerary: z.string() });

/*
 * TODO 2 — Schémas de sortie des nouvelles étapes
 *
 * Chaque étape Mastra déclare ce qu'elle reçoit (inputSchema) et ce qu'elle
 * produit (outputSchema) ; Mastra vérifie les données à chaque passage.
 * Observez la chaîne ci-dessus : chaque schéma reprend le précédent avec
 * .extend({ ... }) et ajoute UN champ. Sur ce modèle, déclarez et exportez :
 *   - reviewedSchema : resultSchema + `critique` (texte) + `llmCalls` (entier ≥ 0) ;
 *   - revisedSchema  : reviewedSchema + `revisedItinerary` (texte).
 * Aide Zod : z.string(), z.number().int().nonnegative().
 */
