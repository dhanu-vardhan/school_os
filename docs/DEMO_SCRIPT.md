# DEMO_SCRIPT (v1, ~10-15 min)

Données fictives, mode démo navigateur (état local partagé entre changements de rôle, persistant localStorage). URL: http://localhost:3000

## Lancement
- `make demo` ou `./scripts/demo.sh` puis ouvrir http://localhost:3000
- Reset: bouton "Réinitialiser la démo" (sidebar) ou http://localhost:3000/?reset=1

## Rôles 1 clic (écran d'accueil)
Direction, Direction adjointe, Enseignant, Assistant, Finance, Admissions, Accueil, Parent (2 enfants), Second parent, Intervenant, Prestataire, Protection, Opérateur.

## Parcours clés
1. **Direction**: KPIs cliquables, Classes (liste/filtres/créer classe/passage d'année simulé), envoyer annonce → journal.
2. **Enseignant**: Présences CP A (marquer présent/absent/retard, hors-ligne toggle) → stats classes mises à jour; Messages (envoyer) → visible côté Parent; Observations (ajouter).
3. **Parent**: voir enfants/statuts, déclarer absence → visible Présences/Direction; Messages (répondre) → visible Enseignant; Paiements sandbox (payer facture) → reçu en "boîte démo"/journal, statut payé; Activités (inscrire/liste d'attente); QR retrait.
4. **Accueil/Finance/Protection/Opérateur**: écrans démo avec données fictives (actions avancées marquées à compléter).

## Attendus
- Chaque action: feedback toast, état persisté, effets inter-rôles visibles après changement de rôle.
- Aucun appel API réel requis en mode navigateur; `/api` backend reste protégé (401 sans JWT) sur stack réelle.
