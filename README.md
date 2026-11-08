# TP — Architecture multi-agent : préparer un voyage

**Durée : 1 h 30 · travail en binôme.** Question : un agent évaluateur améliore-t-il un itinéraire, et à quel coût ?

👉 Le déroulé pas à pas, avec cases à cocher et points de contrôle, est dans [GUIDE_ELEVES.md](GUIDE_ELEVES.md).

## Installation

Node.js 22.22+ et npm sont nécessaires. Depuis ce dossier :

```bash
npm install
npm run check
npm test
```

Copier `.env.example` vers `.env` (`Copy-Item .env.example .env` sous PowerShell, `cp .env.example .env` sous macOS/Linux). Renseigner `OPENAI_API_KEY` : le TP utilise uniquement OpenAI. Il s’agit d’une clé API, distincte d’un abonnement à ChatGPT. Le modèle par défaut est `openai/gpt-4o-mini` ; `MASTRA_MODEL` permet d’en choisir un autre parmi ceux auxquels la clé donne accès (ex. `openai/gpt-4.1-mini`). Ne pas partager ou ajouter `.env` au dépôt.

```bash
# Vérifier le pipeline sans clé (pas d'appel à un modèle)
npm start
# Lancer la recherche web et le planificateur réels avec la clé configurée
npm start -- --llm
```

La clé OpenAI est la seule clé nécessaire : aucune clé Tavily n’est requise. En mode `--llm`, l’étape `recherche` confie à un agent Chercheur la recherche web intégrée d’OpenAI : les sources sont de vraies pages, citées mais **non vérifiées**, et cette recherche compte comme un appel LLM. Sans `--llm`, les sources `example.org` sont **fictives**. Dans les deux modes, le coût journalier reste une hypothèse fictive calculée par le code, pas un prix vérifié. En mode `--llm`, les données du scénario sont envoyées à OpenAI et peuvent entraîner des frais. Vérifiez l’accès au modèle et les limites du compte avant la séance.

## Interface de test

```bash
npm run web
```

Ouvrir http://localhost:3000. L'interface (Next.js, dossier `web/`) charge le workflow de `src/workflow.ts`, utilise la même clé `.env` que la CLI et affiche :

- le **schéma du workflow** tel qu'il est réellement assemblé, avec la nature de chaque étape (code ou agent LLM) et son état pendant l'exécution ;
- le **parcours de l'information** : pour chaque étape, l'objet reçu, l'objet produit et les champs ajoutés ;
- les **sorties à comparer** : itinéraire initial, critique, itinéraire révisé, appels LLM observés et `llmCalls` déclaré par le workflow ;
- une **carte du voyage** (OpenStreetMap) : en live, un clic place les lieux de l'itinéraire initial ou révisé. Ce clic déclenche un appel OpenAI supplémentaire, hors workflow et non compté dans `llmCalls`, puis un géocodage Nominatim d'environ 1 seconde par lieu. Les positions sont à vérifier.

Les boutons « Scénario A » et « Scénario B » préremplissent les données ci-dessous. Le mode Live déclenche de vrais appels payants. Après une modification de `src/`, recharger la page suffit. Si vos étapes portent d'autres `id` que `evaluation` et `revision`, renseignez `description` dans `createStep` pour qu'elles soient expliquées dans le schéma.

## Scénarios à comparer

Utiliser les mêmes données pour les deux versions :

```bash
# A : voyage faisable selon les hypothèses du TP (total 1 000 €, marge 800 €)
npm start -- --llm -d Paris -b 1800 -j 4 -t 400
# B : transport seul supérieur au budget (total 1 100 €, déficit 600 €)
npm start -- --llm -d Paris -b 500 -j 2 -t 800
```

Les montants concernent le groupe entier. Les dates et le nombre de voyageurs ne sont pas renseignés : il faut le signaler. Les options `--no-restaurants`, `-d`, `-b`, `-j` et `-t` sont disponibles. Sans `--llm`, la sortie est une simulation déterministe ; elle permet de tester le budget, mais ne remplace pas l’évaluation d’un agent réel.

## Consignes

1. **Comprendre — 10 min.** Lire [SCHEMA_ET_ATTENDU.md](SCHEMA_ET_ATTENDU.md), repérer les entrées et sorties de chaque étape et identifier ce qui est déterministe ou produit par un LLM.
2. **Observer — 20 min.** Lancer les scénarios A et B. Conserver l’itinéraire initial, relever au moins une hypothèse et vérifier si le budget impossible est signalé.
3. **Implémenter — 30 min.** Compléter `src/exercice.ts` : créer l’évaluateur, lui transmettre demande, budget, sources et itinéraire initial, puis demander au planificateur une seule révision en utilisant la critique. Intégrer ces étapes au workflow et à l’exécution. Conserver les trois sorties. Le travail est volontairement non branché au départ. Suivez les TODO 1 à 7 dans l’ordre : ils sont répartis dans `src/exercice.ts` (TODO 1, 3, 4), `src/schema.ts` (2), `src/workflow.ts` (5), `src/cli.ts` (6) et `tests/review.test.ts` (7), et le haut de `src/exercice.ts` en donne le plan. Lancer `npm run check` puis `npm test` après chaque TODO.
4. **Comparer — 20 min.** Réexécuter les deux scénarios et comparer, pour chacun, l’itinéraire initial et l’itinéraire révisé (budget, hypothèses, sources), extraits à l’appui. Compter les appels réellement effectués, y compris la recherche, la critique et la révision.
5. **Restituer — 10 min.** Présenter un exemple d’amélioration ou d’échec, son coût en appels et une limite de l’évaluation.

L’évaluateur doit contrôler budget, contraintes, sources et incertitudes. Il ne garantit pas que son jugement soit correct. Ne modifiez pas le calcul budgétaire pour le confier au modèle. Une seule révision est autorisée.

## Livrables

Code, sortie initiale, critique, sortie révisée, comparaison avant/après et courte conclusion. Vérifier `npm run check` et `npm test` avant remise. Les tests fournis couvrent le budget et le workflow de départ ; ajouter au moins un test sur le passage critique → révision, avec des réponses simulées et sans appel réseau.

Docs : [workflows Mastra](https://mastra.ai/docs/workflows/overview), [agents Mastra](https://mastra.ai/docs/agents/overview).
