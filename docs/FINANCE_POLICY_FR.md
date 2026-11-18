# FINANCE_POLICY_FR — Règles et paramètres finance (SchoolOS)

**Statut :** squelette P0 (2026-11-18). À compléter à chaque phase (P1–P8).  
**Avertissement :** ce document et les implémentations associées ne constituent pas un avis juridique, fiscal ou comptable. Les règles citées sont implémentées comme **politiques configurables** et doivent être revues par un expert-comptable, un conseil juridique et/ou l’administration compétente avant toute mise en production. Dans le code, chaque règle issue d’une exigence légale/réglementaire doit porter un commentaire `// verify with expert-comptable / current legislation`.

## 1. Portée et décision de cible

| Sujet | Décision / défaut | Source / contexte | Statut de vérification |
|---|---|---|---|
| Cible produit finance (priorité) | Établissements privés (sous contrat d’association via OGEC-type, ou hors contrat) : contribution des familles, cantine, garderie/étude, activités, voyages, acomptes, bourses/remises, prélèvement SEPA, recouvrement, export comptable. Périscolaire/services gérés par l’établissement. | PROMPT 004 §2 ; `docs/DECISIONS.md` P11-1 | **À vérifier** (positionnement juridique exact de l’établissement cible) |
| EPLE / secteur public | Séparation des fonctions (préparateur / approbateur / agent comptable / ordonnateur) implémentée comme **modèle configurable + hooks d’export** uniquement ; pas d’implémentation du droit budgétaire public (M9.6/GFC) et pas de prétention à remplacer la comptabilité publique. | PROMPT 004 §2 ; education.gouv.fr fiche 8 ; IH2EF ; M9.6 | **À vérifier** (applicabilité, rôles légaux, périmètre) |
| Paramètre établissement | `school.finance_profile` (à définir) : `private` (défaut démo) / `public` pour afficher/masquer les modules applicables. Démo : « École Primaire Saint-Denis » (groupe scolaire privé). | `docs/DECISIONS.md` P11-2 | **À vérifier** |

## 2. Séparation des fonctions, délégations et approbations

| Règle | Implémentation prévue | Valeur / défaut | Source | Statut |
|---|---|---|---|---|
| Quatre yeux (préparateur ≠ approbateur) | Contrôle serveur sur opérations sensibles (factures/avoirs/remboursements/exports/lots SEPA/clôtures selon matrice) ; le créateur d’un fournisseur/bénéficiaire ne peut approuver un paiement vers celui-ci. | Activé par défaut ; seuils et périmètre configurables par politique d’établissement. | Principe EPLE (agent comptable / ordonnateur), adopté comme bonne pratique ; PROMPT 004 §3, §5 | **À vérifier** (expert-comptable / gouvernance) |
| Délégation de signature/approbation | Délégation nommée, écrite/loguée, avec périmètre + début/fin + motif + révocation + expiration ; flag `acting_under_delegation=true` dans l’audit finance ; communication au comptable (export/notification) selon politique. Réutilisation du modèle de délégation Part 9 si applicable. | Pas de délégation implicite ; expiration obligatoire. | IH2EF « Délégation » ; education.gouv.fr fiche 8 | **À vérifier** |
| Re-authentification (step-up) / MFA | MFA obligatoire pour profils finance ; step-up pour IBAN/mandats, export SEPA, remboursements, abandons de créance, exports, révélation de données sensibles, actions d’approbation. | Session idle/absolute selon politique sécurité ; à aligner avec exigences existantes. | PROMPT 004 §8 ; `docs/SECURITY_REVIEW_CHECKLIST.md` | **À vérifier** |

## 3. Établissements privés sous contrat (OGEC) et secteurs comptables

| Règle | Implémentation prévue | Valeur / défaut | Source | Statut |
|---|---|---|---|---|
| Contribution des familles | Lignes de frais avec `accounting_sector` et `cost_category` ; catégories de coûts couvertes paramétrables ; reporting sectoriel de premier niveau. | Catégories non figées en dur ; configuration établissement. | Code de l’éducation R442-48 (ex art. 15 décret 60-745) | **À vérifier** (expert-comptable / texte en vigueur) |
| Comptabilité analytique sectorisée | Secteurs prévus : sous contrat / hors contrat / périscolaire / cantine / voyages (extensible) ; états sectoriels. | Mapping éditable/versionné. | R442-19 ; annexe comptable OGEC | **À vérifier** |
| Règlement financier / contrat de scolarisation | Document versionné, acceptation du payeur horodatée (version + acteur) ; conditions de remboursement/départ au prorata selon règlement. | Version active par année scolaire ; historique conservé. | PROMPT 004 §3, §6 | **À vérifier** (juridique) |

## 4. Facturation, numérotation, avoirs, mentions et conservation

| Règle | Implémentation prévue | Valeur / défaut | Source | Statut |
|---|---|---|---|---|
| Numérotation continue, sans trou | Séquence sérialisée par (école, série, exercice) avec verrouillage DB ; tests de concurrence (pas de trou/doublon). | Série/exercice configurables. | Pratique française / intégrité comptable ; PROMPT 004 §6, §7 | **À vérifier** |
| Immutabilité après émission | Facture émise non modifiable ; corrections par **avoir** + nouvelle facture ; écritures ledger append-only (triggers/politiques DB). | Aucune suppression/édition destructive des écritures émises. | PROMPT 004 §6, §7 | **À vérifier** |
| Mentions obligatoires | Identité vendeur (SIREN/RNA/SIRET selon cas), identité payeur, date, lignes, montants, statut fiscal/TVA, conditions de paiement ; PDF + données structurées. | Modèle paramétrable ; TVA par ligne configurable. | PROMPT 004 §3, §6 | **À vérifier** (mentions exactes, exonérations) |
| TVA / exonérations | `tax_code` par ligne de frais (enseignement exonéré vs cantine/garderie taxable, etc.) configurable ; aucun traitement fiscal codé en dur sans validation. | Défauts à confirmer. | PROMPT 004 §3 | **À vérifier** (expert-comptable impératif) |
| Conservation des écritures | Durées par type de donnée dans politique de rétention ; facturation/comptabilité ~10 ans par défaut cible (paramétrable). | À aligner avec `RetentionPolicy`/RGPD. | PROMPT 004 §3, §7 | **À vérifier** (durées légales applicables) |
| Arrondis et allocation | Montants en centimes entiers ; règle d’arrondi documentée (pas de banker’s rounding implicite) ; allocation remises/échéances sans perte de centimes (ex. plus grand reste). | Centimes EUR par défaut. | PROMPT 004 §6, §7 | **À vérifier** |

## 5. Prélèvements SEPA (SDD Core) et mandats

| Règle | Implémentation prévue | Valeur / défaut | Source | Statut |
|---|---|---|---|---|
| Mandat (mentions) | Titre « Mandat de prélèvement SEPA », RUM unique, nom/ICS créancier, notice des droits débiteur ; papier ou e-mandat. | Champs obligatoires validés. | Banque de France ; CFONB/EPC | **À vérifier** |
| Pré-notification | Délai configurable par mandat ; **défaut 14 jours calendaires** (montant, date d’échéance, RUM, ICS, créancier) ; jamais inférieur au délai convenu. Échéancier/facture peut valoir pré-notification si accord (paramètre). | 14 jours par défaut. | Banque de France « Le prélèvement SEPA » | **À vérifier** |
| Péremption du mandat récurrent | Mandat réputé caduc après **36 mois** sans prélèvement ; nouveau mandat requis. | Tâche planifiée + alertes. | justice.fr « prélèvement bancaire » | **À vérifier** |
| Révocation / contestation / remboursement | Révocation à tout moment ; contestation prélèvement non autorisé **13 mois** ; demande de remboursement prélèvement autorisé **8 semaines** (Core). Workflows et fenêtres en politique. | Fenêtres configurables avec garde-fous. | Banque de France ; justice.fr | **À vérifier** |
| R-transactions / rejets / retours | Machine d’états, codes retour mappés vers actions ; pas de représentation aveugle ; retries plafonnés par politique. | Pas de retry automatique non contrôlé. | CFONB FAQ SDD Core | **À vérifier** |
| Fichiers SEPA | Export ISO 20022 pain.008 validé XSD en tests ; export réservé rôle autorisé + step-up + audit ; approbation ≠ préparation. | Adaptateur `SepaFileGenerator` + fake déterministe. | PROMPT 004 §6, §7 | **À vérifier** (schémas/bank specs) |

## 6. Facturation électronique, e-reporting et fournisseurs

| Règle | Implémentation prévue | Valeur / défaut | Source | Statut |
|---|---|---|---|---|
| Réception factures fournisseurs | Port `EInvoiceReceiver` + adaptateur stub + point d’intégration PDP documenté (Phase 2). | Réception obligatoire depuis 1 sept. 2026 pour entreprises assujetties établies en France (contexte marché). | Calendrier réforme (Cegid, Sage, Abby, La Poste) ; recouper impots.gouv.fr | **À vérifier** (calendrier officiel, assujettissement) |
| Émission / B2C familles | Factures familles = PDF + données structurées ; hook export e-reporting (B2C) ; émission e-facture selon calendrier/assujettissement. | Non bloquant pour P0–P6. | PROMPT 004 §3 | **À vérifier** |
| Choix PDP / prestataires | Décision humaine/fournisseur ; non marquée « terminée » par le code. | Hors code. | PROMPT 004 §10 | **À vérifier** |

## 7. Paiements, PSP et cartes

| Règle | Implémentation prévue | Valeur / défaut | Source | Statut |
|---|---|---|---|---|
| Données carte | Jamais traitées/stokées par l’application ; PSP hosted fields/redirect (SAQ-A visé), 3-D Secure/SCA (PSD2). | Port `PaymentProvider` + fake sandbox. | PROMPT 004 §3, §8 | **À vérifier** (contrat PSP, PCI, SCA) |
| Webhooks | Vérification signature, tolérance horodatage, protection rejeu, idempotence ; réconciliation règlements PSP ; ne jamais faire confiance au statut client. | Rejeu refusé ; journalisé/audité. | PROMPT 004 §8 | **À vérifier** |
| Encaissements manuels | Espèces/chèque/virement enregistrés avec contrôles ; plafonds espèces en avertissement/politique. | Plafonds configurables. | PROMPT 004 §6 | **À vérifier** (plafonds légaux) |

## 8. Social, familles et situations particulières

| Règle | Implémentation prévue | Valeur / défaut | Source | Statut |
|---|---|---|---|---|
| Tarification sociale | QF/tranches, remises fratrie, bourses/fonds solidarité, échéanciers, acomptes ; simulation. | Règles paramétrables et versionnées. | PROMPT 004 §3, §6 | **À vérifier** (règlement établissement) |
| Documents revenus/QF | Stockage restreint, chiffrement, accès finance uniquement, rétention minimale, invisibles enseignants/assistants. | Suppression après décision + délai court (paramétrable). | RGPD ; PROMPT 004 §3 | **À vérifier** |
| Parents séparés / garde alternée | Facturation fractionnée (% ou par service), plusieurs payeurs par élève, plusieurs élèves par payeur. | Règles par famille/contrat. | PROMPT 004 §3 | **À vérifier** |
| Mesures affectant un élève | Aucune action automatique (suspension service, non-réinscription, résiliation) ; signalement finance possible, décision **directeur uniquement** avec motif documenté ; jamais visible aux enseignants ni notifiée aux autres parents. | Workflow d’approbation direction (Validations). | PROMPT 004 §3, §5 | **À vérifier** (juridique/éthique) |
| Mise en demeure | Niveau 3 recouvrement : projet pour signature directeur ; pas de signature finance automatique. | Modèles FR/EN paramétrables. | PROMPT 004 §6 | **À vérifier** (juridique) |

## 9. RGPD, sécurité, audit et conservation

| Règle | Implémentation prévue | Valeur / défaut | Source | Statut |
|---|---|---|---|---|
| Données mineurs/familles | Minimisation, hébergement UE, base légale/obligation selon traitement, DPIA addendum finances/données sociales. | À compléter avec DPO. | RGPD ; `docs/COMPLIANCE.md` | **À vérifier** |
| Rétention / effacement | Politiques par type : factures/compta ~10 ans ; mandats SEPA (durée de vie + 13 mois après dernier prélèvement, cible) ; documents revenus supprimés après décision + délai court. Exceptions d’obligation légale documentées. | Paramétrable. | PROMPT 004 §3, §7 | **À vérifier** (délais exacts) |
| Journalisation finance | Écritures et lectures sensibles auditées (acteur, rôle, délégation, entité, hash avant/après) ; chaîne de hachage (anti-altération) + vérification. | Append-only. | PROMPT 004 §7 | **À vérifier** |
| Chiffrement / masquage | Chiffrement champ-niveau (IBAN/BIC, documents revenus), clés gérées (rotation) ; affichage masqué (ex. FR76 •••• 1234) avec « révéler » audité ; jamais dans logs/traces/erreurs/URL/analytics/IA/notifications. | KMS/gestion clés à définir. | PROMPT 004 §7, §8 | **À vérifier** |

## 10. Exports comptables et clôtures

| Règle | Implémentation prévue | Valeur / défaut | Source | Statut |
|---|---|---|---|---|
| FEC | Export FEC + validation par outil officiel (cible). | Port `AccountingExporter` ; tests de génération. | PROMPT 004 §3, §6 | **À vérifier** (acceptation outil officiel, expert-comptable) |
| Journaux / balance / mapping | CSV journaux (ventes, banque, OD), balance, plan comptable/mapping versionné. | Éditable établissement. | PROMPT 004 §6 | **À vérifier** |
| Exports sensibles | Manager + step-up, watermark (utilisateur, horodatage, hash), lien signé expirant, audit. | Défaut le plus restrictif. | PROMPT 004 §6, §8 | **À vérifier** |
| Clôtures | Verrouillage mensuel/annuel ; interdiction d’écriture en période verrouillée (DB) ; réouverture directeur + motif + audit. | Contrôle serveur/DB. | PROMPT 004 §6, §7 | **À vérifier** |

## 11. Registre des règles "verify" (à maintenir)

> À enrichir au fil des phases : pour chaque règle implémentée, ajouter `règle | fichier(s) code | commentaire verify présent | source | défaut | validé par (humain) | date`.

| ID | Règle | Code | Source | Défaut | Statut |
|---|---|---|---|---|---|
| FP-001 | (exemple à remplacer) pré-notification SEPA | à venir | Banque de France | 14 jours | À vérifier |

## 12. Historique

- 2026-11-18 (P0) : création du squelette, décisions de portée P11-1..P11-7 référencées, aucune règle validée par expert-comptable/juriste.
