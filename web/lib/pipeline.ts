import type { SerializedStepFlowEntry } from '@mastra/core/workflows';

export type StepKind = 'code' | 'agent' | 'unknown';

export interface StepInfo {
  id: string;
  kind: StepKind;
  agent?: string;
  role: string;
}

export type StageMode = 'sequence' | 'parallel' | 'conditional' | 'loop' | 'foreach' | 'sleep' | 'workflow';

export interface Stage {
  mode: StageMode;
  steps: StepInfo[];
}

export type StepStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped';

export interface StepTrace {
  id: string;
  status: string;
  payload: unknown;
  output?: unknown;
  error?: string;
  durationMs?: number;
}

export interface RunOutcome {
  status: string;
  result?: Record<string, unknown>;
  error?: string;
  steps: Record<string, StepTrace>;
  durationMs: number;
}

export type RunEvent =
  | { type: 'step-start'; id: string }
  | { type: 'step-result'; id: string; status: string }
  | { type: 'invalid'; issues: string[] }
  | { type: 'done'; outcome: RunOutcome };

const KNOWN_STEPS: Record<string, Omit<StepInfo, 'id'>> = {
  recherche: { kind: 'agent', agent: 'Chercheur', role: 'Recherche web en mode live (sources fictives en démo) et ajoute le coût journalier estimé.' },
  budget: { kind: 'code', role: 'Calcule le budget par du code déterministe, sans LLM.' },
  planification: { kind: 'agent', agent: 'Planificateur', role: 'Rédige l’itinéraire initial à partir des données.' },
  evaluation: { kind: 'agent', agent: 'Évaluateur', role: 'Critique l’itinéraire initial : budget, contraintes, sources.' },
  revision: { kind: 'agent', agent: 'Planificateur', role: 'Produit une seule révision en tenant compte de la critique.' },
};

function describeStep(id: string, description?: string, agentId?: string): StepInfo {
  const known = KNOWN_STEPS[id];
  if (known) return { id, ...known, role: description ?? known.role };
  if (agentId) return { id, kind: 'agent', agent: agentId, role: description ?? 'Étape agent ajoutée au workflow.' };
  return { id, kind: 'unknown', role: description ?? 'Étape ajoutée : renseignez `description` dans createStep pour l’expliquer ici.' };
}

type SingleEntry = Extract<SerializedStepFlowEntry, { type: 'parallel' }>['steps'][number];

function describeSingle(entry: SingleEntry): StepInfo {
  switch (entry.type) {
    case 'step':
      return describeStep(entry.step.id, entry.step.description);
    case 'agent':
      return describeStep(entry.id, entry.description, entry.agentId);
    case 'classifier':
      return describeStep(entry.id);
    default:
      return describeStep(entry.id, entry.description);
  }
}

export function toStages(graph: SerializedStepFlowEntry[]): Stage[] {
  return graph.map((entry): Stage => {
    switch (entry.type) {
      case 'parallel':
      case 'conditional':
        return { mode: entry.type, steps: entry.steps.map(describeSingle) };
      case 'loop':
      case 'foreach':
        return { mode: entry.type, steps: [describeSingle(entry.step)] };
      case 'sleep':
      case 'sleepUntil':
        return { mode: 'sleep', steps: [describeStep(entry.id, entry.description)] };
      case 'workflow':
        return { mode: 'workflow', steps: [describeStep(entry.id, entry.description)] };
      default:
        return { mode: 'sequence', steps: [describeSingle(entry)] };
    }
  });
}
