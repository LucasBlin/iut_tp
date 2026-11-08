import 'dotenv/config';
import { parseArgs } from 'node:util';
import { requestSchema } from './schema.js';
import { travelWorkflow } from './workflow.js';

async function main() {
  const {values} = parseArgs({options:{destination:{type:'string',short:'d',default:'Paris'}, budget:{type:'string',short:'b',default:'1800'}, days:{type:'string',short:'j',default:'4'}, transport:{type:'string',short:'t',default:'400'}, 'no-restaurants':{type:'boolean',default:false}, llm:{type:'boolean',default:false}, help:{type:'boolean',short:'h'}}});
  if (values.help) { console.log('Options : -d destination, -b budget, -j jours, -t transport, --no-restaurants, --llm'); return; }
  const input = requestSchema.parse({ destination:values.destination, budget:Number(values.budget), days:Number(values.days), transport:Number(values.transport), restaurants:!values['no-restaurants'], mode:values.llm ? 'live':'demo' });
  const run = await travelWorkflow.createRun();
  const result = await run.start({inputData:input});
  if (result.status !== 'success') throw new Error(`Workflow ${result.status}: ${result.status === 'failed' ? String(result.error) : 'exécution incomplète'}`);
  /*
   * TODO 6 — Afficher les sorties séparément
   *
   * Une fois le workflow branché (TODO 5), result.result contient tous les champs.
   * Remplacez l'affichage JSON brut par 5 blocs titrés, dans l'ordre du
   * contrat de sortie (SCHEMA_ET_ATTENDU.md) :
   *   1. données et budget calculé (request, research, budgetResult)
   *   2. itinéraire initial (itinerary)
   *   3. critique (critique)
   *   4. itinéraire révisé (revisedItinerary)
   *   5. nombre d'appels LLM (llmCalls)
   * Ce sont ces textes qui serviront à la comparaison avant / après critique.
   */
  console.log(JSON.stringify(result.result, null, 2));
}
main().catch((error: unknown) => { console.error('Erreur :', error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
