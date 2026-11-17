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

## Part 8 — parcours analytique (données fictives, ~5 min)

1. Se connecter comme **Direction** (`Camille Durand`), puis ouvrir `/app/analytics`.
   - Le badge **« Données fictives »** est obligatoire: toutes les réponses ont `meta.mock=true` et `sourceAvailable=false`.
   - Chaque carte affiche `n`, l'IC et la fraîcheur; « Expliquer » ouvre la formule du dictionnaire et les mises en garde.
   - Chaque graphique a une **question** pour titre, un résumé aria avec `n`, et un lien « Voir le tableau de données ».
   - Les filtres (année, trimestre, classe, niveau, matière, grain) sont synchronisés avec l'URL; les vues nommées ne vivent qu'en mémoire et disparaissent au rechargement.
2. Se connecter comme **Analyste de données**, puis ouvrir `/app/analytics/explore`.
   - Choisir une métrique, voir la série, la table paginée et la matrice croisée (les cellules `n<5` sont masquées).
   - « Simulateur de scénarios » montre une projection étiquetée « estimation, pas un fait ».
   - L'export exige la vérification en deux étapes (MFA); il renvoie un job asynchrone fictif avec filigrane de confidentialité.
3. Ouvrir `/ui-kit/analytics` pour comparer les primitives en thèmes clair/sombre et voir l'état « Masqué ».

### Motifs plantés P1–P6 (générateur déterministe `packages/shared/src/analytics-demo.ts`)

Ces motifs existent **uniquement** dans le jeu de données fictif de démonstration; ils servent à
montrer que les règles d'insight et les graphiques réagissent à des situations plausibles.

| Motif | Où le voir | Ce qui est planté |
|---|---|---|
| **P1** | Absences par jour/classe, `6e B` (`c-6e`), 2025-26 T1–T2 | Pic d'absence du lundi (+12 pts sur le taux d'absence) sur les dates scolaires de septembre à mars. |
| **P2** | Diagnostic d'items, mathématiques `6e B`, 2025-26 T2 | Item « Q3 — fractions » réussi par ~18 % des ~24 élèves ayant tenté,plus faible que les autres items. |
| **P3** | Évolution des notes, `6e B`, 2025-26 T3 | +2,5 points sur les notes (profil « amélioration après intervention »). Le commentaire du générateur parle de cohorte 2024; l'implémentation cible bien la classe `c-6e` de 2025-26 (cohorte `2025`). |
| **P4** | Absences/saisonnalité | Baisse de présence en janvier/février (~1,8 pt), en début/fin de semaine et dans les 3 jours suivant les vacances de zone C (~3,5 pts). |
| **P5** | Recouvrement mensuel | Baisse de recouvrement en septembre et décembre (~16 % contre ~5 % les autres mois). |
| **P6** | Qualité des registres, `CM2` (`c-cm2`) | Registres saisis à temps ~78 % des jours (contre ~96 % ailleurs). |

Le jeu couvre 3 années scolaires (2024-25, 2025-26, 2026-27 jusqu'au 17/11/2026), avec 8 classes,
5 matières, 3 trimestres, un bruit déterministe (graine `20261117`) et un horodatage fictif fixe
`2026-11-17T08:15:00Z`. Aucune de ces valeurs n'est écrite dans PostgreSQL ni présentée comme
une donnée réelle.
