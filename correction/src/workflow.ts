import { z } from 'zod';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { requestSchema, researchedSchema, budgetedSchema, resultSchema, revisedSchema, type TravelRequest } from './schema.js';
import { calculateBudget, estimateDaily } from './budget.js';
import { createPlanner, createResearcher } from './agents.js';
import { reviewStep, reviseStep } from './exercice.js';

const demoSources = [
  {title:'Musée municipal — source fictive',url:'https://example.org/tp/musee',content:'Un musée municipal présente une collection historique. Prix et horaires non renseignés.'},
  {title:'Jardin public — source fictive',url:'https://example.org/tp/jardin',content:'Un jardin public est accessible gratuitement. Horaires non renseignés.'},
  {title:'Transports locaux — source fictive',url:'https://example.org/tp/transports',content:'Un réseau de transports publics dessert le centre. Tarifs et horaires non renseignés.'},
];

function withoutTracking(rawUrl: string) {
  const url = new URL(rawUrl);
  url.searchParams.delete('utm_source');
  return url.toString();
}

async function searchWeb(request: TravelRequest) {
  const topics = ['lieux et activités à visiter', 'transports locaux', ...(request.restaurants ? ['restaurants'] : [])].join(', ');
  const response = await createResearcher().generate(`Que voir et que faire à ${request.destination} en ${request.days} jour(s) : ${topics}. Résume en 10 points maximum, chacun avec sa source.`, {toolChoice:'required'});
  const cited = new Map<string, string>();
  for (const {payload} of response.sources) {
    if (!payload.url) continue;
    const url = withoutTracking(payload.url);
    if (!cited.has(url)) cited.set(url, payload.title || url);
  }
  const sources = [...cited].map(([url, title]) => ({title, url, content:'Page citée par la recherche web, non vérifiée ; voir research.summary.'}));
  return {sources, summary:response.text};
}

const researchStep = createStep({ id:'recherche', inputSchema:requestSchema, outputSchema:researchedSchema, execute: async ({inputData}) => {
  const dailyEstimate = estimateDaily(inputData.destination);
  const estimateNote = `Hypothèse pédagogique fictive : ${dailyEstimate} €/jour, hors transport aller-retour.`;
  const found = inputData.mode === 'demo' ? {sources:demoSources} : await searchWeb(inputData);
  return {request:inputData, research:{dailyEstimate, estimateNote, ...found}};
}});
const budgetStep = createStep({ id:'budget', inputSchema:researchedSchema, outputSchema:budgetedSchema, execute: async ({inputData}) => ({...inputData, budgetResult:calculateBudget(inputData.request,inputData.research.dailyEstimate)}) });
const planStep = createStep({ id:'planification', inputSchema:budgetedSchema, outputSchema:resultSchema, execute: async ({inputData}) => {
  const {request, research, budgetResult} = inputData;
  if (request.mode === 'demo') {
    const status = budgetResult.feasible ? 'Budget estimé suffisant.' : `Budget insuffisant : déficit de ${Math.abs(budgetResult.margin)} €. Avec ces hypothèses, ${budgetResult.maxDays} jour(s) maximum.`;
    return {...inputData, itinerary:`MODE DÉMO — réponse simulée sans modèle.\n${status}\nLes données et sources sont fictives.`};
  }
  const response = await createPlanner().generate(`Construis un itinéraire à partir de ces données de TP :\n${JSON.stringify(inputData)}\nMentionne les sources utilisées et explicite les informations manquantes.`);
  return {...inputData, itinerary:response.text};
}});
export const travelWorkflow = createWorkflow({id:'voyage', inputSchema:requestSchema, outputSchema:revisedSchema}).then(researchStep).then(budgetStep).then(planStep).then(reviewStep).then(reviseStep).commit();
