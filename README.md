# TP LangGraph : Système Multi-Agent pour Agence de Voyage

Ce projet implémente un système multi-agents avec LangGraph pour planifier des voyages. Le système utilise Tavily pour effectuer des recherches web réelles sur les destinations, calculer les budgets et créer des itinéraires détaillés.

## Installation

1. Installer les dépendances:
```bash
pip install -r requirements.txt
```

2. Créer un fichier `.env` à la racine du projet avec vos clés API:
```bash
# Créer le fichier .env
echo "TAVILY_API_KEY=tvly-xxxxxx" > .env
echo "OPENAI_API_KEY=sk-xxxxxx" >> .env
```

Ou créez manuellement un fichier `.env` avec le contenu suivant:
```
TAVILY_API_KEY=tvly-xxxxxx
OPENAI_API_KEY=sk-xxxxxx
```

**Note:** Pour utiliser `search.py`, vous devez ajouter vos clés API :
1. **TAVILY_API_KEY** : Pour les recherches web réelles
   - Créez un compte gratuit sur [https://tavily.com](https://tavily.com)
   - Récupérez votre clé API
   - Ajoutez-la au fichier `.env` : `TAVILY_API_KEY=tvly-xxxxxx`
2. **OPENAI_API_KEY** : Pour les résumés intelligents (optionnel mais recommandé)
   - Créez un compte sur [https://platform.openai.com](https://platform.openai.com)
   - Récupérez votre clé API
   - Ajoutez-la au fichier `.env` : `OPENAI_API_KEY=sk-xxxxxx`

## Utilisation

### Système de planification de voyage (search.py) - EXERCICE

Le fichier `search.py` contient un exercice à compléter. Il implémente un système multi-agents avec trois agents spécialisés :

- **Agent Recherche** : Effectue des recherches web avec Tavily pour trouver attractions, coûts, météo, transports et restaurants
- **Agent Budget** : Analyse la faisabilité budgétaire et calcule la répartition des coûts
- **Agent Planificateur** : Crée un itinéraire détaillé jour par jour

Lancer le système avec les paramètres par défaut:
```bash
python search.py
```

Avec des paramètres personnalisés:
```bash
python search.py --destination "Paris" --budget 2000 --days 4
python search.py -d "Tokyo" -b 3000 --days 7 --transport 1000
python search.py --destination "Barcelona" --budget 1500 --days 3 --no-restaurants
```

**Options disponibles:**
- `-d, --destination` : Destination du voyage (défaut: Tokyo)
- `-b, --budget` : Budget total en euros (défaut: 2500)
- `--days, -j` : Nombre de jours du séjour (défaut: 5)
- `-t, --transport` : Coût du transport aller-retour en euros (défaut: 800)
- `--no-restaurants` : Ne pas inclure la recherche de restaurants
- `--restaurants` : Inclure la recherche de restaurants (par défaut)

## Structure

- `search.py` - **EXERCICE** : Système multi-agents pour planification de voyage avec Tavily (à compléter)
- `search-correction.py` - Correction complète de l'exercice
- `requirements.txt` - Dépendances Python

## Exemple de sortie

Voici un exemple de sortie du système de planification de voyage :

```
Démarrage du système de planification de voyage
======================================================================
Destination : Canarias
Budget : 500.0€
Durée : 2 jours
======================================================================

🔍 Agent Recherche activé...
   → Recherche des attractions...
   → Recherche du budget moyen...
   → Recherche des conditions météo...
   → Recherche des transports...
   → Recherche des restaurants...
   ✓ 5 attractions trouvées
   ✓ Coût estimé : 120€/jour

Superviseur : analyse de l'étape suivante...
   → Direction : Agent Budget

💰 Agent Budget activé...
   Déficit de 540€
   Possibilité : 4 jours au lieu de 2

Superviseur : analyse de l'étape suivante...
   → Direction : Agent Planificateur

📅 Agent Planificateur activé...
   Itinéraire de 2 jours généré
   5 attractions réparties
   Budget insuffisant - itinéraire indicatif

Superviseur : analyse de l'étape suivante...
   → Direction : Fin du workflow

======================================================================
RÉSUMÉ DU PLAN DE VOYAGE
======================================================================

Destination : Canarias
Durée : 2 jours
Budget : 500.0€

Analyse budgétaire :
   • Hébergement : 120€
   • Nourriture : 72€
   • Activités : 36€
   • Transport : 800€
   • TOTAL : 1040€
   Dépassement : 540€

Itinéraire détaillé :

   Jour 1 :
      Matin : Arrivée et installation à l'hébergement
      Après-midi : Visite : What to Do in Canary Islands ️ 10 Must-Try Experiences
      Soir : Dîner : THE 10 BEST Local Eats in Gran Canaria (UPDATED 2025)

   Jour 2 :
      Matin : Visite : Canary Islands Travel Guide
      Après-midi : Derniers achats souvenirs
      Soir : Dîner : The best restaurants in Gran Canaria - Passport & Palmtree

Attractions principales trouvées :
   1. What to Do in Canary Islands ️ 10 Must-Try Experiences
   2. 21 best things to do in Gran Canaria (+ photos)
   3. Canary Islands Travel Guide
   4. 33 ultimate best places to visit in Gran Canaria, Spain
   5. THE 15 BEST Things to Do in The Canary Islands (2025)

======================================================================

Planification terminée avec succès !
```
