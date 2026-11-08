'use client';

import dynamic from 'next/dynamic';
import { useState, type FormEvent, type ReactNode } from 'react';
import type { RunEvent, RunOutcome, Stage, StepInfo, StepStatus, StepTrace } from '@/lib/pipeline';
import type { TripMap } from '@/lib/trip-map';

const TripMapView = dynamic(() => import('./trip-map-view').then((module) => module.TripMapView), {
  ssr: false,
  loading: () => <div className="map map-placeholder">Chargement de la carte…</div>,
});

interface TravelForm {
  destination: string;
  budget: number;
  days: number;
  transport: number;
  restaurants: boolean;
  mode: 'demo' | 'live';
}

type ScenarioId = 'A' | 'B';

const SCENARIOS: Record<ScenarioId, Omit<TravelForm, 'mode'> & { label: string; hint: string }> = {
  A: { label: 'Scénario A', hint: 'faisable', destination: 'Paris', budget: 1800, days: 4, transport: 400, restaurants: true },
  B: { label: 'Scénario B', hint: 'impossible', destination: 'Paris', budget: 500, days: 2, transport: 800, restaurants: true },
};

const KIND_LABEL: Record<StepInfo['kind'], string> = { code: 'Code', agent: 'Agent LLM', unknown: 'Étape' };

const STATUS_LABEL: Record<StepStatus, string> = {
  pending: 'En attente',
  running: 'En cours',
  success: 'Réussie',
  failed: 'Échec',
  skipped: 'Ignorée',
};

const STAGE_LABEL: Partial<Record<Stage['mode'], string>> = {
  parallel: 'en parallèle',
  conditional: 'conditionnel',
  loop: 'boucle',
  foreach: 'pour chaque',
  workflow: 'sous-workflow',
};

const RESULT_SECTIONS = [
  { key: 'itinerary', title: 'Itinéraire initial', missing: 'Absent : l’étape de planification n’a pas produit `itinerary`.' },
  { key: 'critique', title: 'Critique de l’évaluateur', missing: 'Pas encore de critique : TODO 1 à 3 dans src/exercice.ts, puis brancher l’étape (TODO 5).' },
  { key: 'revisedItinerary', title: 'Itinéraire révisé', missing: 'Pas encore de révision : TODO 4 dans src/exercice.ts, puis brancher l’étape (TODO 5).' },
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function keyDiff(payload: unknown, output: unknown) {
  const inKeys = isRecord(payload) ? Object.keys(payload) : [];
  const outObject = isRecord(output) ? output : {};
  const outKeys = Object.keys(outObject);
  const added = outKeys.filter((key) => !inKeys.includes(key));
  const missing = inKeys.filter((key) => !outKeys.includes(key));
  const containerOf = (key: string) =>
    added.find((candidate) => {
      const value = outObject[candidate];
      return isRecord(value) && key in value;
    });
  const regrouped = new Map<string, string[]>();
  for (const key of missing) {
    const container = containerOf(key);
    if (container) regrouped.set(container, [...(regrouped.get(container) ?? []), key]);
  }
  return {
    kept: outKeys.filter((key) => inKeys.includes(key)),
    added,
    regrouped: [...regrouped].map(([into, keys]) => ({ into, keys })),
    removed: missing.filter((key) => !containerOf(key)),
  };
}

function toStepStatus(status: string): StepStatus {
  if (status === 'success' || status === 'failed' || status === 'running' || status === 'skipped') return status;
  return 'pending';
}

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2) ?? 'undefined';
}

async function readEvents(response: Response, onEvent: (event: RunEvent) => void): Promise<void> {
  if (!response.body) throw new Error('Réponse vide du serveur.');
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) if (line.trim()) onEvent(JSON.parse(line) as RunEvent);
  }
}

export function WorkflowLab({ stages, source }: { stages: Stage[]; source: string }) {
  const [form, setForm] = useState<TravelForm>({ ...SCENARIOS.A, mode: 'demo' });
  const [statuses, setStatuses] = useState<Record<string, StepStatus>>({});
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [submitted, setSubmitted] = useState<TravelForm | null>(null);
  const [runId, setRunId] = useState(0);

  const steps = stages.flatMap((stage) => stage.steps);
  const agentSteps = steps.filter((step) => step.kind === 'agent');
  const observedLlmCalls =
    outcome && submitted?.mode === 'live' ? agentSteps.filter((step) => outcome.steps[step.id]?.status === 'success').length : 0;
  const declaredLlmCalls = outcome?.result?.llmCalls;

  function update<K extends keyof TravelForm>(key: K, value: TravelForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRunning(true);
    setSubmitted(form);
    setRunId((id) => id + 1);
    setOutcome(null);
    setIssues([]);
    setStatuses({});
    try {
      const response = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      await readEvents(response, (runEvent) => {
        if (runEvent.type === 'step-start') setStatuses((s) => ({ ...s, [runEvent.id]: 'running' }));
        if (runEvent.type === 'step-result') setStatuses((s) => ({ ...s, [runEvent.id]: toStepStatus(runEvent.status) }));
        if (runEvent.type === 'invalid') setIssues(runEvent.issues);
        if (runEvent.type === 'done') {
          setOutcome(runEvent.outcome);
          setStatuses(Object.fromEntries(Object.values(runEvent.outcome.steps).map((t) => [t.id, toStepStatus(t.status)])));
        }
      });
    } catch (error) {
      setOutcome({ status: 'failed', error: error instanceof Error ? error.message : String(error), steps: {}, durationMs: 0 });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div>
            <p className="eyebrow">TP Voyage · Mastra</p>
            <h1>Banc de test du workflow</h1>
          </div>
          <dl className="meta">
            <div>
              <dt>Workflow</dt>
              <dd>
                <code>{source}</code>
              </dd>
            </div>
            <div>
              <dt>Étapes</dt>
              <dd>
                {steps.length} dont {agentSteps.length} agent{agentSteps.length > 1 ? 's' : ''}
              </dd>
            </div>
          </dl>
        </div>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <form className="panel form" onSubmit={submit} aria-busy={running}>
            <h2>Demande de voyage</h2>

            <div className="field">
              <span className="field-label">Préremplir</span>
              <div className="scenarios">
                {(Object.keys(SCENARIOS) as ScenarioId[]).map((id) => (
                  <button key={id} type="button" className="scenario" onClick={() => setForm((f) => ({ ...SCENARIOS[id], mode: f.mode }))}>
                    <span>{SCENARIOS[id].label}</span>
                    <small>{SCENARIOS[id].hint}</small>
                  </button>
                ))}
              </div>
            </div>

            <label className="field">
              <span className="field-label">Destination</span>
              <input value={form.destination} onChange={(e) => update('destination', e.target.value)} required />
            </label>
            <div className="field-row">
              <label className="field">
                <span className="field-label">Budget total (€)</span>
                <input type="number" inputMode="numeric" min={1} value={form.budget} onChange={(e) => update('budget', Number(e.target.value))} required />
              </label>
              <label className="field">
                <span className="field-label">Transport A/R (€)</span>
                <input type="number" inputMode="numeric" min={0} value={form.transport} onChange={(e) => update('transport', Number(e.target.value))} required />
              </label>
            </div>
            <label className="field">
              <span className="field-label">Nombre de jours</span>
              <input type="number" inputMode="numeric" min={1} max={30} value={form.days} onChange={(e) => update('days', Number(e.target.value))} required />
            </label>
            <label className="checkbox">
              <input type="checkbox" checked={form.restaurants} onChange={(e) => update('restaurants', e.target.checked)} />
              <span>Inclure les restaurants</span>
            </label>

            <fieldset className="field">
              <legend className="field-label">Mode d’exécution</legend>
              <div className="segmented">
                <label>
                  <input type="radio" name="mode" checked={form.mode === 'demo'} onChange={() => update('mode', 'demo')} />
                  <span>Démo</span>
                </label>
                <label>
                  <input type="radio" name="mode" checked={form.mode === 'live'} onChange={() => update('mode', 'live')} />
                  <span>Live</span>
                </label>
              </div>
              <p className={`help ${form.mode === 'live' ? 'help-warning' : ''}`}>
                {form.mode === 'demo'
                  ? 'Réponses simulées, sans clé ni appel réseau.'
                  : 'Vrais appels OpenAI et recherche web : facturés à chaque exécution.'}
              </p>
            </fieldset>

            {issues.length > 0 && (
              <ul className="alert" role="alert">
                {issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            )}

            <button type="submit" className="primary" disabled={running}>
              {running && <Spinner />}
              {running ? 'Exécution en cours…' : 'Lancer le workflow'}
            </button>
          </form>
        </aside>

        <main className="content">
          <section className="panel">
            <SectionHeading title="Schéma du workflow" subtitle="Un seul objet circule de gauche à droite : chaque étape reçoit la sortie de la précédente et l’enrichit. Cliquez sur une étape pour voir ce qu’elle a reçu et produit." />
            <PipelineDiagram stages={stages} statuses={statuses} />
            <ul className="legend">
              <li>
                <span className="kind kind-code">Code</span> déterministe, aucun appel réseau
              </li>
              <li>
                <span className="kind kind-agent">Agent LLM</span> <code>agent.generate()</code> en live, réponse simulée en démo
              </li>
            </ul>
          </section>

          {!outcome && !running && (
            <section className="panel empty">
              <p>Choisissez un scénario puis lancez le workflow pour suivre l’information étape par étape.</p>
            </section>
          )}

          {outcome && (
            <>
              {outcome.error && (
                <p className="alert" role="alert">
                  <strong>Échec du workflow :</strong> {outcome.error}
                </p>
              )}

              <section className="stats" aria-label="Résumé de l’exécution">
                <Stat label="Durée totale" value={`${(outcome.durationMs / 1000).toFixed(1)} s`} />
                <Stat label="Appels LLM observés" value={String(observedLlmCalls)} hint={submitted?.mode === 'demo' ? 'mode démo' : 'étapes agent réussies'} />
                <Stat
                  label="llmCalls déclaré"
                  value={declaredLlmCalls === undefined ? '—' : String(declaredLlmCalls)}
                  hint={declaredLlmCalls === undefined ? 'champ absent' : 'renvoyé par le workflow'}
                />
                <BudgetStat result={outcome.result} />
              </section>

              <section className="panel">
                <SectionHeading title="Parcours de l’information" subtitle="Ce que chaque étape a reçu, produit et ajouté à l’objet." />
                <ol className="trace">
                  <li className="trace-item">
                    <span className="trace-marker trace-marker-io" aria-hidden="true" />
                    <div className="trace-body">
                      <div className="trace-head">
                        <strong>Entrée</strong>
                        <span className="muted">demande de voyage validée</span>
                      </div>
                      <JsonBlock label="inputData" value={submitted} />
                    </div>
                  </li>
                  {steps.map((step, index) => (
                    <TraceItem key={step.id} index={index + 1} step={step} trace={outcome.steps[step.id]} />
                  ))}
                </ol>
              </section>

              <section className="panel">
                <SectionHeading title="Sorties à comparer" subtitle="Itinéraire avant et après critique, à comparer avec extraits à l’appui." />
                <ResearchSources result={outcome.result} />
                <div className="outputs">
                  {RESULT_SECTIONS.map((section) => {
                    const text = outcome.result?.[section.key];
                    return (
                      <article key={section.key} className="output">
                        <h3>{section.title}</h3>
                        {typeof text === 'string' ? (
                          <div className="prose">{text}</div>
                        ) : (
                          <p className="muted">{outcome.status === 'success' ? section.missing : 'Non produit : le workflow s’est arrêté avant cette étape.'}</p>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>

              {submitted && outcome.result && (
                <TripMapPanel key={runId} destination={submitted.destination} mode={submitted.mode} result={outcome.result} />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="section-heading">
      <h2>{title}</h2>
      {subtitle && <p className="muted">{subtitle}</p>}
    </div>
  );
}

function StatusPill({ status }: { status: StepStatus }) {
  return (
    <span className={`pill pill-${status}`}>
      <span className="pill-dot" aria-hidden="true" />
      {STATUS_LABEL[status]}
    </span>
  );
}

function Arrow() {
  return (
    <svg className="arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-6.2-8.56" strokeLinecap="round" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  );
}

function IoNode({ kind, name }: { kind: string; name: string }) {
  return (
    <div className="node node-io">
      <span className="node-kind">{kind}</span>
      <code>{name}</code>
    </div>
  );
}

function PipelineDiagram({ stages, statuses }: { stages: Stage[]; statuses: Record<string, StepStatus> }) {
  return (
    <ol className="pipeline">
      <li className="stage">
        <IoNode kind="Entrée" name="request" />
      </li>
      {stages.map((stage, index) => (
        <li key={index} className="stage">
          <Arrow />
          <div className={`stage-group stage-${stage.mode}`}>
            {STAGE_LABEL[stage.mode] && <span className="stage-label">{STAGE_LABEL[stage.mode]}</span>}
            {stage.steps.map((step) => {
              const status = statuses[step.id] ?? 'pending';
              return (
                <a key={step.id} href={`#trace-${step.id}`} className={`node node-${step.kind} node-${status}`}>
                  <span className="node-top">
                    <span className={`kind kind-${step.kind}`}>{KIND_LABEL[step.kind]}</span>
                    <StatusPill status={status} />
                  </span>
                  <code className="node-id">{step.id}</code>
                  {step.agent && <span className="agent">{step.agent}</span>}
                  <span className="node-role">{step.role}</span>
                </a>
              );
            })}
          </div>
        </li>
      ))}
      <li className="stage">
        <Arrow />
        <IoNode kind="Sortie" name="result" />
      </li>
    </ol>
  );
}

function KeyChips({ payload, output }: { payload: unknown; output: unknown }) {
  const diff = keyDiff(payload, output);
  const chips: ReactNode[] = [
    ...diff.kept.map((key) => (
      <span key={`k-${key}`} className="key">
        {key}
      </span>
    )),
    ...diff.added.map((key) => (
      <span key={`a-${key}`} className="key key-added" title="Ajouté par cette étape">
        + {key}
      </span>
    )),
    ...diff.regrouped.map(({ into, keys }) => (
      <span key={`r-${into}`} className="key key-regrouped" title={`Champs reçus, désormais rangés dans ${into}`}>
        {keys.join(', ')} → {into}
      </span>
    )),
    ...diff.removed.map((key) => (
      <span key={`d-${key}`} className="key key-removed" title="Non transmis à l’étape suivante">
        − {key}
      </span>
    )),
  ];
  return <div className="keys">{chips}</div>;
}

function TraceItem({ index, step, trace }: { index: number; step: StepInfo; trace: StepTrace | undefined }) {
  const status = trace ? toStepStatus(trace.status) : 'pending';
  return (
    <li id={`trace-${step.id}`} className={`trace-item trace-${status}`}>
      <span className={`trace-marker trace-marker-${step.kind}`} aria-hidden="true">
        {index}
      </span>
      <div className="trace-body">
        <div className="trace-head">
          <code className="node-id">{step.id}</code>
          <span className={`kind kind-${step.kind}`}>{KIND_LABEL[step.kind]}</span>
          {step.agent && <span className="agent">{step.agent}</span>}
          <StatusPill status={status} />
          {trace?.durationMs !== undefined && <span className="muted duration">{trace.durationMs} ms</span>}
        </div>
        <p className="node-role">{trace ? step.role : 'Étape non exécutée.'}</p>
        {trace?.error && (
          <p className="alert" role="alert">
            {trace.error}
          </p>
        )}
        {trace && (
          <>
            {trace.output !== undefined && <KeyChips payload={trace.payload} output={trace.output} />}
            <div className="json-pair">
              <JsonBlock label="Reçu (payload)" value={trace.payload} />
              {trace.output !== undefined && <JsonBlock label="Produit (output)" value={trace.output} />}
            </div>
          </>
        )}
      </div>
    </li>
  );
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <details className="json">
      <summary>{label}</summary>
      <pre>{formatJson(value)}</pre>
    </details>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'ok' | 'bad' }) {
  return (
    <div className={`stat ${tone ? `stat-${tone}` : ''}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  );
}

function ResearchSources({ result }: { result: Record<string, unknown> | undefined }) {
  const research = result?.research;
  if (!isRecord(research) || !Array.isArray(research.sources)) return null;
  const sources = research.sources.filter(isRecord);
  const fictive = sources.length > 0 && sources.every((source) => typeof source.url === 'string' && source.url.startsWith('https://example.org/'));
  const tag = sources.length === 0 ? 'Aucune source citée' : fictive ? 'Fictives · mode démo' : 'Web · non vérifiées';
  return (
    <article className="sources">
      <div className="sources-head">
        <h3>Sources de la recherche</h3>
        <span className={`tag ${fictive ? 'tag-neutral' : 'tag-warning'}`}>{tag}</span>
      </div>
      {sources.length === 0 && (
        <p className="muted">Le Chercheur a répondu sans citer de page : son résumé n’est appuyé par aucune source. L’évaluateur devrait le relever.</p>
      )}
      <ul>
        {sources.map((source) => (
          <li key={String(source.url)}>
            <a href={String(source.url)} target="_blank" rel="noreferrer noopener">
              {String(source.title)}
              <ExternalIcon />
            </a>
          </li>
        ))}
      </ul>
      {typeof research.summary === 'string' && (
        <details className="json">
          <summary>Résumé du Chercheur</summary>
          <div className="prose">{research.summary}</div>
        </details>
      )}
    </article>
  );
}

const MAP_SOURCES = [
  { key: 'itinerary', label: 'Itinéraire initial' },
  { key: 'revisedItinerary', label: 'Itinéraire révisé' },
] as const;

type MapSourceKey = (typeof MAP_SOURCES)[number]['key'];

type MapState = { status: 'idle' } | { status: 'loading' } | { status: 'ready'; data: TripMap } | { status: 'error'; message: string };

function TripMapPanel({ destination, mode, result }: { destination: string; mode: TravelForm['mode']; result: Record<string, unknown> }) {
  const available = MAP_SOURCES.filter((source) => typeof result[source.key] === 'string');
  const [choice, setChoice] = useState<MapSourceKey>(available.at(-1)?.key ?? 'itinerary');
  const [state, setState] = useState<MapState>({ status: 'idle' });
  const live = mode === 'live';

  async function load(key: MapSourceKey) {
    setChoice(key);
    setState({ status: 'loading' });
    const itinerary = live ? result[key] : undefined;
    try {
      const response = await fetch('/api/map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination, itinerary: typeof itinerary === 'string' ? itinerary : undefined }),
      });
      const body = (await response.json()) as TripMap | { error: string };
      if (!response.ok || 'error' in body) throw new Error('error' in body ? body.error : `HTTP ${response.status}`);
      setState({ status: 'ready', data: body });
    } catch (error) {
      setState({ status: 'error', message: error instanceof Error ? error.message : String(error) });
    }
  }

  return (
    <section className="panel">
      <SectionHeading
        title="Carte du voyage"
        subtitle={
          live
            ? 'Les lieux sont extraits de l’itinéraire par un appel OpenAI hors workflow (non compté dans llmCalls), puis géolocalisés avec OpenStreetMap.'
            : 'En démo, l’itinéraire est simulé : seule la destination est placée, sans appel OpenAI.'
        }
      />
      <div className="map-actions">
        {live ? (
          available.map((source) => (
            <button
              key={source.key}
              type="button"
              className={`secondary ${state.status !== 'idle' && choice === source.key ? 'secondary-active' : ''}`}
              disabled={state.status === 'loading'}
              onClick={() => load(source.key)}
            >
              {state.status === 'loading' && choice === source.key && <Spinner />}
              Placer l’{source.label.toLocaleLowerCase('fr')}
            </button>
          ))
        ) : (
          <button type="button" className="secondary" disabled={state.status === 'loading'} onClick={() => load('itinerary')}>
            {state.status === 'loading' && <Spinner />}
            Afficher la destination
          </button>
        )}
      </div>

      {state.status === 'loading' && <p className="muted">Extraction et géolocalisation en cours (environ 1 seconde par lieu)…</p>}
      {state.status === 'error' && (
        <p className="alert" role="alert">
          {state.message}
        </p>
      )}
      {state.status === 'ready' && (
        <div className={`map-layout ${live ? 'map-layout-split' : ''}`}>
          <TripMapView data={state.data} />
          {live && (
            <div className="map-legend">
              <h3>Lieux placés</h3>
              {state.data.points.length === 0 ? (
                <p className="muted">Aucun lieu précis n’a été trouvé dans cet itinéraire.</p>
              ) : (
                <ol>
                  {state.data.points.map((point) => (
                    <li key={point.order}>
                      <strong>{point.name}</strong>
                      {point.day !== null && <span className="muted"> · jour {point.day}</span>}
                    </li>
                  ))}
                </ol>
              )}
              {state.data.missing.length > 0 && (
                <p className="muted">
                  Non localisés : {state.data.missing.join(', ')}.
                </p>
              )}
              <p className="help">Vérifiez chaque point : le modèle peut mal nommer un lieu, et le géocodage choisir un homonyme.</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function BudgetStat({ result }: { result: Record<string, unknown> | undefined }) {
  const budget = result?.budgetResult;
  if (!isRecord(budget) || typeof budget.margin !== 'number') return <Stat label="Budget" value="—" />;
  const feasible = budget.feasible === true;
  return (
    <Stat
      label="Marge budgétaire"
      value={`${budget.margin >= 0 ? '+' : ''}${budget.margin} €`}
      hint={feasible ? 'voyage faisable' : 'déficit · voyage impossible'}
      tone={feasible ? 'ok' : 'bad'}
    />
  );
}
