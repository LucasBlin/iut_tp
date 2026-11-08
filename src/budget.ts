import type { TravelRequest } from './schema.js';

const rates: Record<string, number> = { tokyo: 180, paris: 150, bangkok: 60, berlin: 110, barcelona: 130, rome: 140 };
export function estimateDaily(destination: string): number {
  return rates[destination.toLocaleLowerCase('fr')] ?? 120;
}
export function calculateBudget(request: TravelRequest, dailyEstimate: number) {
  const round = (n: number) => Math.round(n * 100) / 100;
  const stay = dailyEstimate * request.days;
  const total = round(stay + request.transport);
  const margin = round(request.budget - total);
  return { accommodation: round(stay * .5), food: round(stay * .3), activities: round(stay * .15), other: round(stay * .05), transport: request.transport, total, margin, feasible: margin >= 0, maxDays: Math.max(0, Math.floor((request.budget - request.transport) / dailyEstimate)) };
}
