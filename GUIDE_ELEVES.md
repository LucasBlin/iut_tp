# Guide élève — TP multi-agent Mastra

**Durée : 1 h 30 · en binôme.**
Question du TP : *un agent évaluateur améliore-t-il un itinéraire de voyage, et à quel coût ?*

Vous partez d'un workflow qui fonctionne (recherche → budget → planification) et vous y ajoutez un agent **Évaluateur** qui critique l'itinéraire, puis **une seule** révision par le Planificateur.

```
Aujourd'hui :  recherche → budget → planification
Objectif   :  recherche → budget → planification → evaluation → revision
```

Cochez chaque case au fur et à mesure.

---

## Étape 0 — Installer (avant la séance ou 5 premières minutes)

- [ ] Vérifier Node.js : `node -v` doit afficher **22.22** ou plus.
- [ ] Installer les dépendances depuis le dossier du projet :
  ```bash
  npm install
  ```
- [ ] Créer le fichier `.env` à partir de l'exemple :
  ```bash
  cp .env.example .env            # macOS / Linux
  Copy-Item .env.example .env     # Windows PowerShell
  ```
- [ ] Coller la clé OpenAI fournie dans `OPENAI_API_KEY=`. **Ne jamais partager ni committer `.env`.**
- [ ] Vérifier que tout est vert :
  ```bash
  npm run check   # types TypeScript
  npm test        # tests (3 tests « todo » sont normaux : c'est l'étape 8)
  ```

> ✅ **Point de contrôle** : `npm run check` ne renvoie rien, `npm test` affiche `fail 0`.

---

## Étape 1 — Comprendre (10 min)

- [ ] Lire [SCHEMA_ET_ATTENDU.md](SCHEMA_ET_ATTENDU.md), en particulier la section **Parcours de l'information**.
- [ ] Lancer l'interface de test :
  ```bash
  npm run web
  ```
  puis ouvrir http://localhost:3000.
- [ ] Cliquer sur **Scénario A**, laisser le mode **Démo**, puis **Lancer le workflow**.
- [ ] Dans « Parcours de l'information », déplier « Reçu » et « Produit » de chaque étape.

Répondez par écrit (cela servira à la restitution) :

1. Quel champ chaque étape ajoute-t-elle à l'objet qui circule ?
2. Quelles étapes sont du **code déterministe** ? Lesquelles appellent un **agent LLM** ?
3. Qui calcule le budget : le code ou le modèle ? Pourquoi est-ce important ?
4. Que recevra votre future étape `evaluation` ? (indice : c'est le « Produit » de `planification`)

---

## Étape 2 — Observer la version de départ (20 min)

Lancer les deux scénarios **en mode live** (vrais appels OpenAI, payants) :

```bash
# A : faisable (total 1 000 €, marge 800 €)
npm start -- --llm -d Paris -b 1800 -j 4 -t 400
# B : impossible — le transport seul (800 €) dépasse le budget (500 €)
npm start -- --llm -d Paris -b 500 -j 2 -t 800
```

(ou depuis l'interface : boutons Scénario A / B, mode **Live**)

- [ ] Copier la sortie de chaque scénario dans un fichier (vous en aurez besoin pour comparer).
- [ ] Relever **au moins une hypothèse** faite par le modèle (un prix, une durée, une information supposée…).
- [ ] Scénario B : l'impossibilité (déficit de 600 €) est-elle clairement annoncée ?
- [ ] Les sources trouvées par la recherche web sont-elles citées ? Présentées comme non vérifiées ?
- [ ] Combien d'appels LLM ont été faits ? (regardez « Appels LLM observés » dans l'interface)

---

## Étape 3 — Écrire l'évaluateur · TODO 1 (`src/exercice.ts`)

Lisez d'abord **tout le commentaire en haut** de `src/exercice.ts` : il donne le plan complet.

- [ ] Remplacer `'TODO 1 : …'` par les **instructions** de l'Évaluateur. Il doit contrôler :
  - le **budget** (sans le recalculer) et l'annonce d'un éventuel déficit ;
  - les **contraintes** de la demande (durée, restaurants, destination) ;
  - les **sources** (citées ? présentées comme non vérifiées ?) ;
  - les **incertitudes** (prix, horaires inventés, informations manquantes : dates, nombre de voyageurs…).
- [ ] Demander une critique **structurée** avec des **changements concrets** : c'est le Planificateur qui la lira.

> 💡 Inspirez-vous de `createPlanner()` dans `src/agents.ts`.

---

## Étape 4 — Déclarer les schémas · TODO 2 (`src/schema.ts`)

- [ ] Déclarer et exporter `reviewedSchema` = `resultSchema` + `critique` (texte) + `llmCalls` (entier ≥ 0).
- [ ] Déclarer et exporter `revisedSchema` = `reviewedSchema` + `revisedItinerary` (texte).

> 💡 Regardez comment `budgetedSchema` et `resultSchema` sont construits avec `.extend({ … })`.

> ✅ **Point de contrôle** : `npm run check` passe.

---

## Étape 5 — L'étape « evaluation » · TODO 3 (`src/exercice.ts`)

- [ ] **3a** — Écrire `buildReviewPrompt(data)` : le texte envoyé à l'Évaluateur doit contenir `request`, `research`, `budgetResult` et `itinerary`.
- [ ] **3b** — Compléter `reviewStep` :
  - [ ] passer `outputSchema` à `reviewedSchema` ;
  - [ ] **mode démo** : renvoyer une critique simulée, **sans appeler l'agent** (utiliser `budgetResult` pour mentionner un éventuel déficit) ;
  - [ ] **mode live** : appeler l'Évaluateur avec votre prompt et récupérer le texte de la réponse ;
  - [ ] renvoyer l'objet reçu enrichi de `critique` et `llmCalls` ;
  - [ ] supprimer le `throw`.
- [ ] Calculer `llmCalls` correctement : combien d'appels LLM ont **déjà** eu lieu avant cette étape en live ? Et en démo ?

> ⚠️ Si l'appel au modèle échoue, laissez l'erreur remonter. Ne renvoyez jamais un faux texte « réussi ».

---

## Étape 6 — L'étape « revision » · TODO 4 (`src/exercice.ts`)

- [ ] **4a** — Écrire `buildRevisionPrompt(data, critique)` : données + **itinéraire initial** + **critique**, et la consigne de corriger chaque point soulevé.
  > 💡 Le Planificateur ne se souvient pas de son premier appel : il faut tout lui renvoyer.
- [ ] **4b** — Compléter `reviseStep` :
  - [ ] `inputSchema` = `reviewedSchema`, `outputSchema` = `revisedSchema` ;
  - [ ] démo : itinéraire révisé simulé, sans appel ;
  - [ ] live : **un seul** appel au Planificateur (`createPlanner`, à importer) ;
  - [ ] renvoyer l'objet enrichi de `revisedItinerary`, et `llmCalls` + 1 en live ;
  - [ ] **ne pas modifier** `itinerary` (l'itinéraire initial doit rester pour la comparaison).

---

## Étape 7 — Brancher et afficher · TODO 5 et 6

- [ ] **TODO 5** (`src/workflow.ts`) : ajouter `reviewStep` puis `reviseStep` après `planStep`, et mettre `revisedSchema` comme `outputSchema` du workflow.
- [ ] **TODO 6** (`src/cli.ts`) : remplacer l'affichage JSON brut par **5 blocs titrés** :
  1. données et budget calculé
  2. itinéraire initial
  3. critique
  4. itinéraire révisé
  5. nombre d'appels LLM

> ✅ **Point de contrôle** :
> - `npm run check` passe ;
> - `npm start` (démo, sans clé) affiche les 5 blocs ;
> - l'interface web affiche **5 étapes** dans le schéma, toutes vertes en démo ;
> - les cartes « Critique » et « Itinéraire révisé » sont remplies.

---

## Étape 8 — Tester sans réseau · TODO 7 (`tests/review.test.ts`)

Remplacer chaque `test.todo(...)` par un vrai test. **Aucun test ne doit appeler OpenAI.**

- [ ] Le prompt de révision contient la critique **et** l'itinéraire initial (tester `buildRevisionPrompt` avec de fausses données).
- [ ] Le workflow en démo exécute `evaluation` puis `revision`, chacune une seule fois (regarder `result.stepExecutionPath`).
- [ ] Scénario B en démo : la critique signale le déficit de 600 €.

> 💡 Inspirez-vous de `tests/workflow.test.ts`. Structure conseillée : *given / when / then*.

> ✅ **Point de contrôle** : `npm test` affiche `fail 0` et plus aucun `todo`.

---

## Étape 9 — Comparer (20 min)

- [ ] Relancer les scénarios A et B en **live** avec la version complète.
- [ ] Pour chaque scénario, comparer l'**itinéraire initial** (avant critique) et l'**itinéraire révisé** (après critique) sur le budget, les hypothèses et incertitudes signalées, et la présentation des sources. Justifier chaque réponse par un extrait court.
- [ ] Compter le **nombre réel d'appels LLM** : version de départ vs version complète (attendu : 2 puis 4 par scénario en live).
- [ ] Compléter l'analyse : une amélioration (avec extrait avant/après), une erreur manquée ou introduite par l'évaluateur, le bénéfice par rapport au coût.

> 💡 La recherche web change à chaque exécution. Comparez l'itinéraire initial et l'itinéraire révisé **d'une même exécution** : ils partent des mêmes sources.

## En cas de problème

| Symptôme | Piste |
| --- | --- |
| `Ajoutez OPENAI_API_KEY dans .env.` | Le fichier `.env` manque ou la clé est vide. |
| `npm run check` signale une erreur de schéma | Le `outputSchema` d'une étape ne correspond pas à l'`inputSchema` de la suivante. |
| L'interface affiche une page d'erreur | Erreur de syntaxe dans `src/` : lancer `npm run check` pour trouver la ligne. |
| Une étape est rouge dans l'interface | Lire son message d'erreur dans « Parcours de l'information ». |
| `TODO 3 : étape evaluation non implémentée.` | L'étape est branchée mais le `throw` n'a pas été remplacé. |
| Port 3000 déjà utilisé | Next choisit un autre port (3001…) : lire l'adresse dans le terminal. |
