# TP LangGraph : Système Multi-Agent pour Agence de Voyage - CORRECTION
# Durée : 1h | Niveau : Intermédiaire

"""
CORRECTION COMPLÈTE DU TP

Cette version montre une implémentation complète et fonctionnelle
avec Tavily pour la recherche web réelle.

PRÉREQUIS :
- pip install langgraph tavily-python python-dotenv langchain-openai
- Créez un fichier .env avec :
  * TAVILY_API_KEY="votre_clé" (pour les recherches web)
  * OPENAI_API_KEY="votre_clé" (pour les résumés AI)
  ou définissez les variables d'environnement système
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
# PARTIE 1 : ÉTAT PARTAGÉ - CORRECTION
# ============================================================================

class TravelState(TypedDict):
    """État partagé entre tous les agents"""
    
    # Informations de base
    messages: Annotated[Sequence[str], operator.add]
    destination: str
    budget: float
    duree_jours: int
    preferences: dict  # Type de voyage, intérêts, niveau confort
    
    # Résultats des agents
    recherche_resultats: dict  # Données Tavily
    budget_breakdown: dict  # Détail des coûts
    itineraire: dict  # Planning jour par jour
    
    # Métadonnées
    current_step: str
    etapes_completees: Annotated[Sequence[str], operator.add]
    timestamp_debut: str
    faisable: bool  # Le voyage est-il réalisable ?


# ============================================================================
# PARTIE 2 : AGENTS SPÉCIALISÉS
# ============================================================================

def agent_recherche(state: TravelState) -> TravelState:
    """
    Agent qui effectue des recherches web réelles avec Tavily
    """
    print("\n🔍 Agent Recherche activé...")
    
    if not tavily_client:
        state["messages"] = ["❌ Tavily non configuré"]
        state["recherche_resultats"] = {"erreur": "API non disponible"}
        state["etapes_completees"] = ["recherche"]
        return state
    
    destination = state["destination"]
    duree = state["duree_jours"]
    preferences = state.get("preferences", {})
    
    recherche_info = {
        "attractions": [],
        "restaurants": [],
        "cout_moyen_jour": 0,
        "meteo_info": "",
        "transport": "",
        "sources": []
    }
    
    try:
        # 1. Recherche des attractions principales
        print("   → Recherche des attractions...")
        attractions_response = tavily_client.search(
            query=f"top tourist attractions must see in {destination}",
            max_results=5
        )
        
        recherche_info["attractions"] = [
            {
                "titre": result.get("title", "N/A"),
                "url": result.get("url", ""),
                "description": result.get("content", "")[:200]
            }
            for result in attractions_response.get("results", [])
        ]
        
        # 2. Recherche du coût moyen
        print("   → Recherche du budget moyen...")
        budget_response = tavily_client.search(
            query=f"average daily cost budget travel {destination} per person",
            max_results=3
        )
        
        # Extraction intelligente du coût (simplifiée ici)
        budget_answer = budget_response.get("answer", "")
        recherche_info["cout_info"] = budget_answer
        
        # Estimation du coût basée sur la destination
        couts_estimation = {
            "Tokyo": 180, "Paris": 150, "Bangkok": 60,
            "New York": 200, "Barcelona": 130, "Berlin": 110,
            "Rome": 140, "London": 170, "Amsterdam": 150
        }
        recherche_info["cout_moyen_jour"] = couts_estimation.get(
            destination, 120
        )
        
        # 3. Recherche météo
        print("   → Recherche des conditions météo...")
        meteo_response = tavily_client.search(
            query=f"best time to visit {destination} weather climate",
            max_results=2
        )
        recherche_info["meteo_info"] = meteo_response.get(
            "answer", 
            "Informations météo non disponibles"
        )
        
        # 4. Transport local
        print("   → Recherche des transports...")
        transport_response = tavily_client.search(
            query=f"getting around {destination} public transportation",
            max_results=2
        )
        recherche_info["transport"] = transport_response.get(
            "answer",
            "Informations transport non disponibles"
        )
        
        # 5. Restaurants si demandé dans les préférences
        if preferences.get("inclure_restaurants", False):
            print("   → Recherche des restaurants...")
            resto_response = tavily_client.search(
                query=f"best local restaurants {destination} must try",
                max_results=3
            )
            recherche_info["restaurants"] = [
                result.get("title", "N/A") 
                for result in resto_response.get("results", [])
            ]
        
        state["recherche_resultats"] = recherche_info
        state["messages"] = [
            f"Recherche complète pour {destination} : "
            f"{len(recherche_info['attractions'])} attractions, "
            f"coût estimé {recherche_info['cout_moyen_jour']}€/jour"
        ]
        state["etapes_completees"] = ["recherche"]
        
        print(f"   ✓ {len(recherche_info['attractions'])} attractions trouvées")
        print(f"   ✓ Coût estimé : {recherche_info['cout_moyen_jour']}€/jour")
        
    except Exception as e:
        state["messages"] = [f"Erreur Tavily : {str(e)}"]
        state["recherche_resultats"] = {"erreur": str(e)}
        state["etapes_completees"] = ["recherche"]  # Marquer comme complété même en cas d'erreur
        print(f"   ✗ Erreur : {e}")
    
    return state


def agent_budget(state: TravelState) -> TravelState:
    """
    Agent qui analyse la faisabilité budgétaire
    """
    print("\nAgent Budget activé...")
    
    budget_total = state["budget"]
    duree = state["duree_jours"]
    recherche = state.get("recherche_resultats", {})
    preferences = state.get("preferences", {})
    
    # Récupération du coût moyen journalier
    cout_jour = recherche.get("cout_moyen_jour", 100)
    
    # Calcul détaillé des coûts
    cout_hebergement_jour = cout_jour * 0.50  # 50% hébergement
    cout_nourriture_jour = cout_jour * 0.30   # 30% nourriture
    cout_activites_jour = cout_jour * 0.15    # 15% activités
    cout_divers_jour = cout_jour * 0.05       # 5% divers
    
    # Coûts fixes (transport A/R)
    cout_transport_fixe = preferences.get("cout_transport", 0)
    
    # Calcul total
    cout_sejour = cout_jour * duree
    cout_total = cout_sejour + cout_transport_fixe
    
    # Analyse de faisabilité
    marge = budget_total - cout_total
    taux_utilisation = (cout_total / budget_total) * 100
    
    breakdown = {
        "hebergement": cout_hebergement_jour * duree,
        "nourriture": cout_nourriture_jour * duree,
        "activites": cout_activites_jour * duree,
        "divers": cout_divers_jour * duree,
        "transport": cout_transport_fixe,
        "total": cout_total,
        "budget_disponible": budget_total,
        "marge": marge,
        "taux_utilisation": taux_utilisation,
        "faisable": marge >= 0
    }
    
    state["budget_breakdown"] = breakdown
    state["faisable"] = breakdown["faisable"]
    
    if breakdown["faisable"]:
        state["messages"] = [
            f"Budget OK : {cout_total:.0f}€ / {budget_total:.0f}€ "
            f"(marge : {marge:.0f}€, {taux_utilisation:.0f}% utilisé)"
        ]
        print(f"   ✓ Budget suffisant avec {marge:.0f}€ de marge")
        print(f"   ✓ Répartition : Hébergement {breakdown['hebergement']:.0f}€, "
              f"Nourriture {breakdown['nourriture']:.0f}€, "
              f"Activités {breakdown['activites']:.0f}€")
    else:
        deficit = abs(marge)
        state["messages"] = [
            f"Budget insuffisant : {cout_total:.0f}€ > {budget_total:.0f}€ "
            f"(manque : {deficit:.0f}€)",
            f"Suggestion : Réduire à {int(budget_total / cout_jour)} jours "
            f"ou augmenter le budget de {deficit:.0f}€"
        ]
        print(f"   Déficit de {deficit:.0f}€")
        print(f"   Possibilité : {int(budget_total / cout_jour)} jours au lieu de {duree}")
    
    state["etapes_completees"] = ["budget"]
    
    return state


def agent_planificateur(state: TravelState) -> TravelState:
    """
    Agent qui crée l'itinéraire détaillé jour par jour
    """
    print("\nAgent Planificateur activé...")
    
    duree = state["duree_jours"]
    recherche = state.get("recherche_resultats", {})
    attractions = recherche.get("attractions", [])
    restaurants = recherche.get("restaurants", [])
    faisable = state.get("faisable", True)
    
    # Création d'un itinéraire optimisé
    itineraire = {}
    
    # Répartition des attractions sur les jours
    attractions_par_jour = max(1, len(attractions) // duree) if attractions else 0
    
    for jour in range(1, duree + 1):
        planning_jour = {
            "matin": [],
            "apres_midi": [],
            "soir": []
        }
        
        # Attribution des activités
        debut_idx = (jour - 1) * attractions_par_jour
        fin_idx = min(debut_idx + attractions_par_jour, len(attractions))
        
        attractions_jour = attractions[debut_idx:fin_idx] if attractions else []
        
        if jour == 1:
            planning_jour["matin"] = ["Arrivée et installation à l'hébergement"]
            if attractions_jour:
                planning_jour["apres_midi"] = [
                    f"Visite : {attractions_jour[0].get('titre', 'Attraction')}"
                ]
            else:
                planning_jour["apres_midi"] = ["Exploration de la ville"]
        elif jour == duree:
            if attractions_jour:
                planning_jour["matin"] = [
                    f"Visite : {attractions_jour[0].get('titre', 'Attraction')}"
                ]
            else:
                planning_jour["matin"] = ["Dernière visite libre"]
            planning_jour["apres_midi"] = ["Derniers achats souvenirs"]
            planning_jour["soir"] = ["Départ"]
        else:
            if len(attractions_jour) >= 2:
                planning_jour["matin"] = [
                    f"Visite : {attractions_jour[0].get('titre', 'Attraction')}"
                ]
                planning_jour["apres_midi"] = [
                    f"Visite : {attractions_jour[1].get('titre', 'Attraction')}"
                ]
            elif len(attractions_jour) == 1:
                planning_jour["matin"] = [
                    f"Visite : {attractions_jour[0].get('titre', 'Attraction')}"
                ]
                planning_jour["apres_midi"] = ["Exploration libre du quartier"]
            else:
                planning_jour["matin"] = ["Visite libre"]
                planning_jour["apres_midi"] = ["Exploration libre du quartier"]
        
        # Ajout de restaurants si disponibles
        if restaurants and jour <= len(restaurants):
            planning_jour["soir"] = [
                f"Dîner : {restaurants[jour-1]}"
            ]
        elif not planning_jour["soir"]:
            planning_jour["soir"] = ["Dîner dans le quartier"]
        
        itineraire[f"jour_{jour}"] = planning_jour
    
    state["itineraire"] = itineraire
    
    if faisable:
        state["messages"] = [
            f"Itinéraire créé pour {duree} jours avec "
            f"{len(attractions)} attractions principales"
        ]
    else:
        state["messages"] = [
            f"Itinéraire créé pour {duree} jours avec "
            f"{len(attractions)} attractions principales "
            f"(budget insuffisant - itinéraire indicatif)"
        ]
    
    state["etapes_completees"] = ["planification"]
    
    print(f"   Itinéraire de {duree} jours généré")
    print(f"   {len(attractions)} attractions réparties")
    if not faisable:
        print(f"   Budget insuffisant - itinéraire indicatif")
    
    return state


def superviseur(state: TravelState) -> Literal["agent_recherche", "agent_budget", "agent_planificateur", "fin"]:
    """
    Superviseur qui orchestre le workflow
    """
    print("\nSuperviseur : analyse de l'étape suivante...")
    
    etapes = state.get("etapes_completees", [])
    
    # Workflow : recherche → budget → planification → fin
    if "recherche" not in etapes:
        print("   → Direction : Agent Recherche")
        return "agent_recherche"
    elif "budget" not in etapes:
        print("   → Direction : Agent Budget")
        return "agent_budget"
    elif "planification" not in etapes:
        print("   → Direction : Agent Planificateur")
        return "agent_planificateur"
    else:
        print("   → Direction : Fin du workflow")
        return "fin"


# ============================================================================
# PARTIE 3 : CONSTRUCTION DU GRAPHE - CORRECTION
# ============================================================================

def create_travel_graph():
    """
    Construit le graphe LangGraph complet
    
    Structure optimisée :
    - Flux séquentiel : recherche → budget → planification → fin
    - Le superviseur décide de la prochaine étape après chaque agent
    - Chaque nœud a besoin de conditional edges car le superviseur peut décider
      de retourner à une étape précédente ou terminer le workflow
    """
    workflow = StateGraph(TravelState)
    
    # Ajout des nœuds (agents) - préfixe "agent_" pour éviter les conflits avec les clés d'état
    workflow.add_node("agent_recherche", agent_recherche)
    workflow.add_node("agent_budget", agent_budget)
    workflow.add_node("agent_planificateur", agent_planificateur)
    
    # Point d'entrée
    workflow.set_entry_point("agent_recherche")
    
    # Mapping commun pour toutes les transitions conditionnelles
    # Le superviseur peut retourner vers n'importe quel agent ou terminer
    routing_map = {
        "agent_recherche": "agent_recherche",
        "agent_budget": "agent_budget",
        "agent_planificateur": "agent_planificateur",
        "fin": END
    }
    
    # Chaque agent passe par le superviseur pour décider de la prochaine étape
    # On a besoin de 3 conditional edges car :
    # 1. Chaque nœud doit définir ses propres transitions de sortie
    # 2. Le superviseur peut décider de retourner à n'importe quel nœud
    # 3. Cela permet la flexibilité (retry, réexécution, etc.)
    workflow.add_conditional_edges("agent_recherche", superviseur, routing_map)
    workflow.add_conditional_edges("agent_budget", superviseur, routing_map)
    workflow.add_conditional_edges("agent_planificateur", superviseur, routing_map)
    
    return workflow.compile()


# ============================================================================
# PARTIE 4 : FONCTIONS BONUS - CORRECTION
# ============================================================================

def sauvegarder_resultat(state: TravelState, filename: str = None):
    """
    BONUS : Sauvegarde les résultats dans un fichier JSON
    """
    if filename is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"voyage_{state['destination']}_{timestamp}.json"
    
    # Préparation des données pour le JSON
    resultat = {
        "destination": state["destination"],
        "budget": state["budget"],
        "duree_jours": state["duree_jours"],
        "faisable": state.get("faisable", False),
        "timestamp": state.get("timestamp_debut", ""),
        "recherche": state.get("recherche_resultats", {}),
        "budget_breakdown": state.get("budget_breakdown", {}),
        "itineraire": state.get("itineraire", {}),
        "historique": state.get("messages", [])
    }
    
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(resultat, f, indent=2, ensure_ascii=False)
    
    print(f"\nRésultats sauvegardés dans : {filename}")
    return filename


def afficher_resume(state: TravelState):
    """
    BONUS : Affiche un résumé formaté du plan de voyage
    """
    print("\n" + "="*70)
    print("RÉSUMÉ DU PLAN DE VOYAGE")
    print("="*70)
    
    print(f"\nDestination : {state['destination']}")
    print(f"Durée : {state['duree_jours']} jours")
    print(f"Budget : {state['budget']}€")
    
    # Budget
    if state.get("budget_breakdown"):
        breakdown = state["budget_breakdown"]
        print(f"\nAnalyse budgétaire :")
        print(f"   • Hébergement : {breakdown.get('hebergement', 0):.0f}€")
        print(f"   • Nourriture : {breakdown.get('nourriture', 0):.0f}€")
        print(f"   • Activités : {breakdown.get('activites', 0):.0f}€")
        print(f"   • Transport : {breakdown.get('transport', 0):.0f}€")
        print(f"   • TOTAL : {breakdown.get('total', 0):.0f}€")
        
        if breakdown.get("faisable"):
            print(f"   Marge restante : {breakdown.get('marge', 0):.0f}€")
        else:
            print(f"   Dépassement : {abs(breakdown.get('marge', 0)):.0f}€")
    
    # Itinéraire
    if state.get("itineraire"):
        print(f"\nItinéraire détaillé :")
        for jour, planning in state["itineraire"].items():
            num_jour = jour.split("_")[1]
            print(f"\n   Jour {num_jour} :")
            if planning.get("matin"):
                print(f"      Matin : {', '.join(planning['matin'])}")
            if planning.get("apres_midi"):
                print(f"      Après-midi : {', '.join(planning['apres_midi'])}")
            if planning.get("soir"):
                print(f"      Soir : {', '.join(planning['soir'])}")
    
    # Attractions principales
    if state.get("recherche_resultats", {}).get("attractions"):
        print(f"\nAttractions principales trouvées :")
        for i, attraction in enumerate(state["recherche_resultats"]["attractions"][:5], 1):
            print(f"   {i}. {attraction.get('titre', 'N/A')}")
    
    print("\n" + "="*70)


def generer_resume_ai(state: TravelState) -> str:
    """
    Génère un résumé intelligent du plan de voyage avec ChatOpenAI
    """
    if not llm:
        return "Résumé AI non disponible (OPENAI_API_KEY non définie)"
    
    try:
        # Préparation des données pour le prompt
        destination = state.get("destination", "N/A")
        duree = state.get("duree_jours", 0)
        budget = state.get("budget", 0)
        breakdown = state.get("budget_breakdown", {})
        itineraire = state.get("itineraire", {})
        attractions = state.get("recherche_resultats", {}).get("attractions", [])
        faisable = state.get("faisable", False)
        
        # Construction du prompt
        prompt = f"""Tu es un expert en planification de voyage. Résume de manière concise et engageante le plan de voyage suivant :

Destination : {destination}
Durée : {duree} jours
Budget : {budget}€

Analyse budgétaire :
- Hébergement : {breakdown.get('hebergement', 0):.0f}€
- Nourriture : {breakdown.get('nourriture', 0):.0f}€
- Activités : {breakdown.get('activites', 0):.0f}€
- Transport : {breakdown.get('transport', 0):.0f}€
- Total : {breakdown.get('total', 0):.0f}€
- Faisable : {'Oui' if faisable else 'Non'}

Attractions principales :
{chr(10).join([f"- {attr.get('titre', 'N/A')}" for attr in attractions[:5]])}

Itinéraire :
{json.dumps(itineraire, indent=2, ensure_ascii=False)}

Génère un résumé en français de 3-4 phrases maximum qui :
1. Présente la destination et la durée
2. Indique si le budget est suffisant ou non
3. Mentionne les points forts du voyage
4. Donne un conseil si le budget est insuffisant

Résumé :"""
        
        response = llm.invoke(prompt)
        return response.content
        
    except Exception as e:
        return f"Erreur lors de la génération du résumé AI : {str(e)}"


# ============================================================================
# PARTIE 5 : TEST ET EXÉCUTION - CORRECTION
# ============================================================================

def travel(destination: str = "Tokyo", budget: float = 2500, duree_jours: int = 5, 
                       cout_transport: float = 800, inclure_restaurants: bool = True):
    """
    Fonction de test complète avec paramètres configurables
    
    Args:
        destination: Nom de la destination (ex: "Tokyo", "Paris", "New York")
        budget: Budget total en euros
        duree_jours: Nombre de jours du séjour
        cout_transport: Coût du transport aller-retour en euros
        inclure_restaurants: Inclure la recherche de restaurants
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
        
        # Affichage du résumé
        afficher_resume(result)
        
        # Génération du résumé AI
        print("\n" + "="*70)
        print("RÉSUMÉ INTELLIGENT (AI)")
        print("="*70)
        resume_ai = generer_resume_ai(result)
        print(f"\n{resume_ai}\n")
        print("="*70)
        
        # Sauvegarde optionnelle
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
    """
    
    # Configuration du parser d'arguments
    parser = argparse.ArgumentParser(
        description="Système de planification de voyage multi-agents avec Tavily",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemples d'utilisation:
  python search-correction.py --destination "Paris" --budget 2000 --days 4
  python search-correction.py -d "Tokyo" -b 3000 --days 7 --transport 1000
  python search-correction.py --destination "Barcelona" --budget 1500 --days 3 --no-restaurants
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
        print("\nConfiguration requise Tavily")

    else:
        # Exécution avec les paramètres fournis
        travel(
            destination=args.destination,
            budget=args.budget,
            duree_jours=args.days,
            cout_transport=args.transport,
            inclure_restaurants=args.inclure_restaurants
        )
        