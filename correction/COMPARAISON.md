# Comparaison — corrigé de référence

Binôme : Corrigé enseignant
Modèle et date : gpt-4o-mini / claude-haiku — novembre 2026

| Scénario | Critère | Avant critique | Après critique | Preuve / remarque |
| --- | --- | --- | --- | --- |
| A : faisable | Budget respecté | Oui — itinéraire dans l'enveloppe de 1800 € | Oui — confirmé par l'évaluateur | Le budget calculé (total 1000 €, marge 800 €) est repris tel quel |
| A : faisable | Hypothèses et incertitudes signalées | Partiellement — certaines hypothèses implicites | Oui — l'évaluateur force l'explicitation | La révision mentionne que les prix sont des hypothèses pédagogiques |
| A : faisable | Sources fictives identifiées comme telles | Oui — example.org mentionné | Oui — renforcé après critique | L'évaluateur rappelle que les sources sont des données de TP |
| B : impossible | Déficit et transport signalés | Oui — « budget insuffisant » | Oui — déficit de 600 € explicité | Transport (800 €) > budget total (500 €), 0 jour abordable |
| B : impossible | Proposition sans tarif inventé | Oui — aucun prix inventé | Oui — confirmé | Aucun horaire ni tarif réel dans la sortie |
| A et B | Nombre réel d'appels LLM | 1 (planificateur seul) | 3 (plan + critique + révision) | Compteur intégré dans la sortie |

## Analyse

- Une modification apportée par l'évaluateur, avec un extrait avant/après :
  L'itinéraire initial du scénario A mentionnait les sources sans préciser leur nature fictive. Après critique, la révision ajoute systématiquement « source fictive — données de TP » à chaque référence example.org. Cela renforce la transparence sur la fiabilité des informations.

- Une erreur manquée ou introduite par l'évaluateur :
  Sur le scénario A, l'évaluateur n'a pas détecté que la répartition 50/30/15/5 du budget journalier est une hypothèse arbitraire du code, non une donnée réelle. Il valide cette répartition sans la questionner. L'évaluateur ne peut critiquer que ce qui lui est visible — la logique déterministe du code lui échappe.

- Quel bénéfice justifie, ou non, les appels supplémentaires ?
  Le passage de 1 à 3 appels LLM (×3 en coût) apporte un gain modéré : meilleure explicitation des incertitudes et des sources fictives. Cependant, sur le scénario B (budget impossible), l'itinéraire initial signalait déjà le problème — la critique n'ajoute que de la reformulation. Le bénéfice est plus net sur les cas limites ou ambigus que sur les cas clairement faisables ou clairement impossibles. Pour un usage en production, le surcoût ne se justifie que si la qualité de la première passe est insuffisante.
