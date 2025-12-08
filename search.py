# TP LangGraph : Système Multi-Agent pour Agence de Voyage - EXERCICE
# Durée : 1h | Niveau : Intermédiaire

"""
EXERCICE À COMPLÉTER

Vous devez implémenter un système multi-agents avec LangGraph pour planifier
des voyages. Le système utilise Tavily pour effectuer des recherches web réelles.

PRÉREQUIS :
- pip install langgraph tavily-python python-dotenv langchain-openai
- Créez un fichier .env avec :
  * TAVILY_API_KEY="votre_clé" (pour les recherches web)
  * OPENAI_API_KEY="votre_clé" (pour les résumés AI)
  ou définissez les variables d'environnement système

INSTRUCTIONS :
1. Complétez les parties marquées avec TODO
2. Les constantes (coûts moyens, pourcentages) sont déjà fournies
3. Testez votre implémentation avec : python search.py --destination "Paris" --budget 2000 --days 4
"""

from typing import TypedDict, Annotated, Sequence, Literal
from langgraph.graph import StateGraph, END
import operator
import json
import os
import argparse
from datetime import datetime
from dotenv import load_dotenv
from tavily import TavilyClient
from langchain_openai import ChatOpenAI

# ============================================================================
# CONFIGURATION
# ============================================================================

load_dotenv()
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not TAVILY_API_KEY:
    print("ATTENTION : TAVILY_API_KEY non définie !")
tavily_client = TavilyClient(api_key=TAVILY_API_KEY) if TAVILY_API_KEY else None

# Initialisation de ChatOpenAI pour les résumés
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.7) if OPENAI_API_KEY else None


# ============================================================================
# PARTIE 1 : ÉTAT PARTAGÉ - À COMPLÉTER
# ============================================================================

# TODO 1 : Définir la classe TravelState avec TypedDict
# Elle doit contenir :
# - messages : liste de chaînes (utiliser Annotated avec operator.add)
# - destination : chaîne
# - budget : nombre décimal
# - duree_jours : entier
# - preferences : dictionnaire
# - recherche_resultats : dictionnaire
# - budget_breakdown : dictionnaire
# - itineraire : dictionnaire
# - current_step : chaîne
# - etapes_completees : liste de chaînes (utiliser Annotated avec operator.add)
# - timestamp_debut : chaîne
# - faisable : booléen

class TravelState(TypedDict):
    """État partagé entre tous les agents"""
    # TODO : Complétez la définition de l'état
    pass


# ============================================================================
# PARTIE 2 : AGENTS SPÉCIALISÉS
# ============================================================================

def agent_recherche(state: TravelState) -> TravelState:
    """
    Agent qui effectue des recherches web réelles avec Tavily
    
    TODO 2 : Implémenter la logique de recherche
    - Vérifier si tavily_client est disponible
    - Effectuer des recherches pour :
      * Les attractions principales (max 5 résultats)
      * Le coût moyen par jour
      * Les conditions météo
      * Les transports locaux
      * Les restaurants (si inclure_restaurants est True dans preferences)
    - Utiliser le dictionnaire couts_estimation pour estimer le coût si nécessaire
    - Mettre à jour state["recherche_resultats"] avec les résultats
    - Ajouter un message dans state["messages"]
    - Marquer "recherche" dans state["etapes_completees"]
    """
    print("\n🔍 Agent Recherche activé...")
    
    # TODO : Complétez l'implémentation
    # Indice : Utilisez tavily_client.search() pour chaque type de recherche
    
    # Constantes fournies - NE PAS MODIFIER
    couts_estimation = {
        "Tokyo": 180, "Paris": 150, "Bangkok": 60,
        "New York": 200, "Barcelona": 130, "Berlin": 110,
        "Rome": 140, "London": 170, "Amsterdam": 150
    }
    
    # Structure de recherche_info à utiliser
    recherche_info = {
        "attractions": [],
        "restaurants": [],
        "cout_moyen_jour": 0,
        "meteo_info": "",
        "transport": "",
        "sources": []
    }
    
    # TODO : Votre code ici
    
    return state


def agent_budget(state: TravelState) -> TravelState:
    """
    Agent qui analyse la faisabilité budgétaire
    
    TODO 3 : Implémenter le calcul du budget
    - Récupérer le coût moyen par jour depuis recherche_resultats
    - Calculer les coûts journaliers selon les pourcentages :
      * Hébergement : 50% du coût journalier
      * Nourriture : 30% du coût journalier
      * Activités : 15% du coût journalier
      * Divers : 5% du coût journalier
    - Récupérer le coût de transport depuis preferences.get("cout_transport", 0)
    - Calculer le coût total du séjour
    - Calculer la marge (budget_total - cout_total)
    - Calculer le taux d'utilisation en pourcentage
    - Déterminer si le voyage est faisable (marge >= 0)
    - Créer le dictionnaire breakdown avec toutes les informations
    - Mettre à jour state["budget_breakdown"] et state["faisable"]
    - Ajouter un message approprié dans state["messages"]
    - Marquer "budget" dans state["etapes_completees"]
    """
    print("\n💰 Agent Budget activé...")
    
    # TODO : Complétez l'implémentation
    # Indice : Utilisez les pourcentages fournis dans les commentaires ci-dessus
    
    # Constantes fourniesx
    POURCENTAGE_HEBERGEMENT = 0.50  # 50%
    POURCENTAGE_NOURRITURE = 0.30   # 30%
    POURCENTAGE_ACTIVITES = 0.15    # 15%
    POURCENTAGE_DIVERS = 0.05       # 5%
    
    # TODO : Votre code ici
    
    return state


def agent_planificateur(state: TravelState) -> TravelState:
    """
    Agent qui crée l'itinéraire détaillé jour par jour
    
    TODO 4 : Implémenter la création de l'itinéraire
    - Récupérer la durée, les attractions et restaurants depuis l'état
    - Répartir les attractions sur les jours disponibles
    - Pour chaque jour, créer un planning avec :
      * matin : liste d'activités
      * apres_midi : liste d'activités
      * soir : liste d'activités
    - Jour 1 : Matin = "Arrivée et installation", puis attractions si disponibles
    - Dernier jour : Après-midi = "Derniers achats souvenirs", Soir = "Départ"
    - Jours intermédiaires : Répartir les attractions entre matin et après-midi
    - Ajouter les restaurants dans "soir" si disponibles
    - Mettre à jour state["itineraire"]
    - Ajouter un message dans state["messages"]
    - Marquer "planification" dans state["etapes_completees"]
    """
    print("\n📅 Agent Planificateur activé...")
    
    # TODO : Complétez l'implémentation
    # Indice : Utilisez une boucle for jour in range(1, duree + 1)
    
    # TODO : Votre code ici
    
    return state


def superviseur(state: TravelState) -> Literal["agent_recherche", "agent_budget", "agent_planificateur", "fin"]:
    """
    Superviseur qui orchestre le workflow
    
    TODO 5 : Implémenter la logique de routage
    Le workflow doit suivre cet ordre :
    1. agent_recherche (si "recherche" n'est pas dans etapes_completees)
    2. agent_budget (si "budget" n'est pas dans etapes_completees)
    3. agent_planificateur (si "planification" n'est pas dans etapes_completees)
    4. "fin" (si toutes les étapes sont complétées)
    
    Retourner le nom de l'agent suivant ou "fin"
    """
    print("\n🎯 Superviseur : analyse de l'étape suivante...")
    
    # TODO : Complétez l'implémentation
    # Indice : Utilisez state.get("etapes_completees", [])
    
    # TODO : Votre code ici
    
    return "fin"  # À remplacer par votre logique


# ============================================================================
# PARTIE 3 : CONSTRUCTION DU GRAPHE - À COMPLÉTER
# ============================================================================

def create_travel_graph():
    """
    Construit le graphe LangGraph complet
    
    TODO 6 : Construire le graphe LangGraph
    - Créer un StateGraph avec TravelState
    - Ajouter les 3 nœuds : "agent_recherche", "agent_budget", "agent_planificateur"
    - Définir le point d'entrée avec set_entry_point("agent_recherche")
    - Ajouter des conditional_edges pour chaque agent qui pointent vers le superviseur
    - Créer un routing_map qui mappe les retours du superviseur vers les nœuds ou END
    - Compiler et retourner le graphe
    
    Structure attendue :
    - Chaque agent doit avoir une conditional_edge vers le superviseur
    - Le routing_map doit mapper : "agent_recherche", "agent_budget", "agent_planificateur", "fin" -> END
    """
    
    # TODO : Complétez l'implémentation
    # Indice : Utilisez workflow.add_node(), workflow.set_entry_point(), 
    #          workflow.add_conditional_edges(), et workflow.compile()
    
    # TODO : Votre code ici
    
    pass  # À remplacer par votre implémentation


# ============================================================================
# PARTIE 4 : FONCTIONS BONUS - À COMPLÉTER (OPTIONNEL)
# ============================================================================

def sauvegarder_resultat(state: TravelState, filename: str = None):
    """
    BONUS : Sauvegarde les résultats dans un fichier JSON
    
    TODO 7 (BONUS) : Implémenter la sauvegarde
    - Si filename est None, générer un nom avec timestamp et destination
    - Créer un dictionnaire avec toutes les informations importantes
    - Sauvegarder en JSON avec json.dump()
    """
    # TODO : Votre code ici (optionnel)
    pass


def afficher_resume(state: TravelState):
    """
    BONUS : Affiche un résumé formaté du plan de voyage
    
    TODO 8 (BONUS) : Implémenter l'affichage formaté
    - Afficher destination, durée, budget
    - Afficher le breakdown budgétaire si disponible
    - Afficher l'itinéraire jour par jour
    - Afficher les attractions principales
    """
    # TODO : Votre code ici (optionnel)
    pass


def generer_resume_ai(state: TravelState) -> str:
    """
    Génère un résumé intelligent du plan de voyage avec ChatOpenAI
    
    TODO 9 (BONUS) : Implémenter la génération de résumé avec ChatOpenAI
    - Vérifier si llm est disponible
    - Préparer un prompt avec les informations du voyage (destination, durée, budget, breakdown, itinéraire, attractions)
    - Appeler llm.invoke(prompt) pour générer le résumé
    - Retourner le contenu de la réponse
    - Gérer les erreurs et retourner un message d'erreur si nécessaire
    """
    if not llm:
        return "Résumé AI non disponible (OPENAI_API_KEY non définie)"
    
    # TODO : Votre code ici (optionnel)
    # Indice : Utilisez llm.invoke() avec un prompt décrivant le voyage
    # Le prompt doit inclure : destination, durée, budget, breakdown, itinéraire, attractions
    
    return "Résumé AI non implémenté"


# ============================================================================
# PARTIE 5 : TEST ET EXÉCUTION - DÉJÀ COMPLÉTÉ
# ============================================================================

def travel(destination: str = "Tokyo", budget: float = 2500, duree_jours: int = 5, 
                       cout_transport: float = 800, inclure_restaurants: bool = True):
    """
    Fonction de test complète avec paramètres configurables
    
    Cette fonction est déjà complète, vous n'avez pas besoin de la modifier.
    """
    
    # Création de l'état initial
    initial_state = {
        "messages": [],
        "destination": destination,
        "budget": budget,
        "duree_jours": duree_jours,
        "preferences": {
            "inclure_restaurants": inclure_restaurants,
            "cout_transport": cout_transport,
            "type_voyage": "culturel"
        },
        "recherche_resultats": {},
        "budget_breakdown": {},
        "itineraire": {},
        "current_step": "init",
        "etapes_completees": [],
        "timestamp_debut": datetime.now().isoformat(),
        "faisable": True
    }
    
    print("Démarrage du système de planification de voyage")
    print("="*70)
    print(f"Destination : {initial_state['destination']}")
    print(f"Budget : {initial_state['budget']}€")
    print(f"Durée : {initial_state['duree_jours']} jours")
    print("="*70)
    
    # Création et exécution du graphe
    graph = create_travel_graph()
    
    try:
        result = graph.invoke(initial_state)
        
        # Affichage du résumé (si implémenté)
        afficher_resume(result)
        
        # Génération du résumé AI (si implémenté)
        if llm:
            print("\n" + "="*70)
            print("RÉSUMÉ INTELLIGENT (AI)")
            print("="*70)
            resume_ai = generer_resume_ai(result)
            print(f"\n{resume_ai}\n")
            print("="*70)
        
        # Sauvegarde optionnelle (si implémentée)
        if result.get("faisable", False):
            sauvegarder_resultat(result)
        
        print("\nPlanification terminée avec succès !")
        
        return result
        
    except Exception as e:
        print(f"\nErreur lors de l'exécution : {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    """
    Point d'entrée principal avec support des arguments en ligne de commande
    Cette partie est déjà complète.
    """
    
    # Configuration du parser d'arguments
    parser = argparse.ArgumentParser(
        description="Système de planification de voyage multi-agents avec Tavily",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemples d'utilisation:
  python search.py --destination "Paris" --budget 2000 --days 4
  python search.py -d "Tokyo" -b 3000 --days 7 --transport 1000
  python search.py --destination "Barcelona" --budget 1500 --days 3 --no-restaurants
        """
    )
    
    parser.add_argument(
        "-d", "--destination",
        type=str,
        default="Tokyo",
        help="Destination du voyage (défaut: Tokyo)"
    )
    
    parser.add_argument(
        "-b", "--budget",
        type=float,
        default=2500,
        help="Budget total en euros (défaut: 2500)"
    )
    
    parser.add_argument(
        "--days", "-j",
        type=int,
        default=5,
        dest="days",
        help="Nombre de jours du séjour (défaut: 5)"
    )
    
    parser.add_argument(
        "-t", "--transport",
        type=float,
        default=800,
        help="Coût du transport aller-retour en euros (défaut: 800)"
    )
    
    parser.add_argument(
        "--no-restaurants",
        action="store_false",
        dest="inclure_restaurants",
        help="Ne pas inclure la recherche de restaurants"
    )
    
    parser.add_argument(
        "--restaurants",
        action="store_true",
        dest="inclure_restaurants",
        default=True,
        help="Inclure la recherche de restaurants (par défaut)"
    )
    
    args = parser.parse_args()
    
    if not TAVILY_API_KEY:
        print("\n⚠️  Configuration requise : TAVILY_API_KEY")
        print("   Le système fonctionnera en mode limité sans recherche web réelle")

    # Exécution avec les paramètres fournis
    travel(
        destination=args.destination,
        budget=args.budget,
        duree_jours=args.days,
        cout_transport=args.transport,
        inclure_restaurants=args.inclure_restaurants
    )
