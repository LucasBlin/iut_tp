import 'dotenv/config';
import { parseArgs } from 'node:util';
import { requestSchema } from './schema.js';
import { travelWorkflow } from './workflow.js';

function section(title: string, content: string) {
  const line = '='.repeat(60);
  console.log(`\n${line}\n  ${title}\n${line}\n${content}`);
}

async function main() {
  const {values} = parseArgs({options:{destination:{type:'string',short:'d',default:'Paris'}, budget:{type:'string',short:'b',default:'1800'}, days:{type:'string',short:'j',default:'4'}, transport:{type:'string',short:'t',default:'400'}, 'no-restaurants':{type:'boolean',default:false}, llm:{type:'boolean',default:false}, help:{type:'boolean',short:'h'}}});
  if (values.help) { console.log('Options : -d destination, -b budget, -j jours, -t transport, --no-restaurants, --llm'); return; }
  const input = requestSchema.parse({ destination:values.destination, budget:Number(values.budget), days:Number(values.days), transport:Number(values.transport), restaurants:!values['no-restaurants'], mode:values.llm ? 'live':'demo' });
  const run = await travelWorkflow.createRun();
  const result = await run.start({inputData:input});
  if (result.status !== 'success') throw new Error(`Workflow ${result.status}: ${result.status === 'failed' ? String(result.error) : 'exécution incomplète'}`);
  const r = result.result;
  section('1. Données et budget calculé', JSON.stringify({request:r.request, research:r.research, budget:r.budgetResult}, null, 2));
  section('2. Itinéraire initial', r.itinerary);
  section('3. Critique de l’évaluateur', r.critique);
  section('4. Itinéraire révisé', r.revisedItinerary);
  section('5. Appels LLM', `${r.llmCalls} appel(s) LLM`);
}
main().catch((error: unknown) => { console.error('Erreur :', error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
