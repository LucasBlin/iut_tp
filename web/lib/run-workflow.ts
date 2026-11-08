import path from 'node:path';
import type { StepResult } from '@mastra/core/workflows';
import { config as loadEnv } from 'dotenv';
import { travelWorkflow } from '@tp/workflow';
import { toStages, type RunEvent, type RunOutcome, type Stage, type StepTrace } from './pipeline';

type AnyStepResult = StepResult<unknown, unknown, unknown, unknown>;

// Next.js only reads .env files from web/; API keys live in the TP's root .env, shared with the CLI.
loadEnv({ path: path.join(process.env.TP_REPO_ROOT ?? process.cwd(), '.env'), quiet: true });

const WORKFLOW_INPUT_KEY = 'input';

export function getStages(): Stage[] {
  return toStages(travelWorkflow.serializedStepGraph);
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) return String(error.message);
  return String(error);
}

function toTrace(id: string, step: AnyStepResult, payload: unknown): StepTrace {
  const durationMs = 'endedAt' in step && step.endedAt && step.startedAt ? step.endedAt - step.startedAt : undefined;
  return {
    id,
    status: step.status,
    payload: step.payload ?? payload,
    output: 'output' in step ? step.output : undefined,
    error: step.status === 'failed' ? errorMessage(step.error) : undefined,
    durationMs,
  };
}

function toTraces(steps: Record<string, AnyStepResult>, payloads: Map<string, unknown>): Record<string, StepTrace> {
  return Object.fromEntries(
    Object.entries(steps)
      .filter(([id]) => id !== WORKFLOW_INPUT_KEY)
      .map(([id, step]) => [id, toTrace(id, step, payloads.get(id))]),
  );
}

export async function runWorkflow(rawInput: unknown, emit: (event: RunEvent) => void): Promise<void> {
  const validation = await travelWorkflow.inputSchema['~standard'].validate(rawInput);
  if (validation.issues) {
    emit({ type: 'invalid', issues: validation.issues.map((issue) => `${issue.path?.join('.') ?? 'entrée'} : ${issue.message}`) });
    return;
  }

  const payloads = new Map<string, unknown>();
  const startedAt = performance.now();
  const run = await travelWorkflow.createRun();
  const unwatch = run.watch((event) => {
    if (event.type === 'workflow-step-start') {
      payloads.set(event.payload.id, event.payload.payload);
      emit({ type: 'step-start', id: event.payload.id });
    }
    if (event.type === 'workflow-step-result') emit({ type: 'step-result', id: event.payload.id, status: event.payload.status });
  });

  try {
    const result = await run.start({ inputData: validation.value });
    const outcome: RunOutcome = {
      status: result.status,
      steps: toTraces(result.steps, payloads),
      durationMs: Math.round(performance.now() - startedAt),
      result: result.status === 'success' ? result.result : undefined,
      error: result.status === 'failed' ? errorMessage(result.error) : undefined,
    };
    emit({ type: 'done', outcome });
  } finally {
    unwatch();
  }
}
