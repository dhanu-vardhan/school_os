import { formatMoney } from '../domain/format'
import type { DashboardData, SeriesPoint } from '../domain/models'

const series = (labels: string[], current: number[], previous: number[]): SeriesPoint[] =>
  labels.map((label, i) => ({ label, current: current[i], previous: previous[i] }))

const revenue: DashboardData['revenue'] = {
  '30d': series(
    ['19 oct', '22 oct', '25 oct', '28 oct', '31 oct', '03 nov', '06 nov', '09 nov', '12 nov', '15 nov', '18 nov'],
    [18200, 21400, 19800, 24600, 23100, 26800, 25400, 29100, 27600, 31200, 33800],
    [16400, 17800, 19100, 20500, 19800, 22400, 23600, 24800, 25900, 27100, 28300],
  ),
  '90d': series(
    ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'S12', 'S13'],
    [92000, 98500, 94000, 108000, 112000, 106000, 124000, 131000, 127000, 139000, 146000, 152000, 161000],
    [86000, 89000, 91000, 95000, 98000, 101000, 104000, 109000, 112000, 117000, 121000, 126000, 131000],
  ),
  '12m': series(
    ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'],
    [182000, 191000, 188000, 204000, 212000, 208000, 226000, 219000, 234000, 241000, 252000, 268500],
    [164000, 170000, 176000, 181000, 187000, 193000, 199000, 205000, 212000, 219000, 226000, 234000],
  ),
}

const engagement: DashboardData['engagement'] = {
  '30d': series(['S1', 'S2', 'S3', 'S4'], [820, 910, 940, 1024], [760, 790, 830, 880]),
  '90d': series(['M1', 'M2', 'M3'], [820, 940, 1024], [760, 830, 880]),
  '12m': series(['T1', 'T2', 'T3', 'T4'], [740, 810, 930, 1024], [690, 750, 800, 860]),
}

export const dashboardFixture: DashboardData = {
  kpis: [
    { id: 'revenue', label: 'Revenu collecte', value: formatMoney(26850000), delta: 12.4, hint: 'vs periode precedente', trend: revenue['12m'].map((p) => p.current), tone: 'indigo' },
    { id: 'families', label: 'Familles actives', value: '1 284', delta: 8.2, hint: '12 nouvelles ce mois', trend: [920, 960, 1010, 1040, 1090, 1140, 1180, 1210, 1240, 1260, 1270, 1284], tone: 'sky' },
    { id: 'retention', label: 'Retention', value: '94,2 %', delta: 2.1, hint: 'objectif : 92 %', trend: [88, 89, 89, 90, 91, 91, 92, 92, 93, 93, 94, 94.2], tone: 'emerald' },
    { id: 'drafts', label: 'Suggestions IA', value: '4', delta: -3.5, hint: 'en attente de revue', trend: [8, 7, 9, 6, 7, 5, 6, 4, 5, 4, 3, 4], tone: 'amber' },
  ],
  revenue,
  engagement,
  funnel: [
    { label: 'Visiteurs', value: 12480 },
    { label: 'Inscrits', value: 1920 },
    { label: 'Actives', value: 1540 },
    { label: 'Retenues', value: 1284 },
  ],
  segments: [
    { name: 'Platinum', value: 284, color: '#4F46E5' },
    { name: 'Growth', value: 512, color: '#7C8CF8' },
    { name: 'Standard', value: 488, color: '#C7D2FE' },
  ],
  planMix: [
    { name: 'Scolarite', value: 62, color: '#4F46E5' },
    { name: 'Activites', value: 21, color: '#059669' },
    { name: 'Cantine', value: 12, color: '#F59E0B' },
    { name: 'Autre', value: 5, color: '#CBD5E1' },
  ],
  families: [
    { id: 'F-1042', name: 'Famille Martin', school: 'Saint-Denis', segment: 'Platinum', lifetimeCents: 1840000, health: 96, lastActive: 'il y a 2 h' },
    { id: 'F-1038', name: 'Famille Bernard', school: 'Lyon Est', segment: 'Growth', lifetimeCents: 1120000, health: 88, lastActive: 'il y a 5 h' },
    { id: 'F-1021', name: 'Famille Dubois', school: 'Saint-Denis', segment: 'Platinum', lifetimeCents: 1680000, health: 93, lastActive: 'hier' },
    { id: 'F-0997', name: 'Famille Petit', school: 'Bordeaux', segment: 'Standard', lifetimeCents: 640000, health: 71, lastActive: 'il y a 3 j' },
    { id: 'F-0984', name: 'Famille Laurent', school: 'Lyon Est', segment: 'Growth', lifetimeCents: 980000, health: 82, lastActive: 'il y a 2 j' },
    { id: 'F-0961', name: 'Famille Moreau', school: 'Bordeaux', segment: 'Standard', lifetimeCents: 520000, health: 64, lastActive: 'il y a 8 j' },
    { id: 'F-0950', name: 'Famille Garcia', school: 'Nantes', segment: 'Growth', lifetimeCents: 1040000, health: 85, lastActive: 'hier' },
    { id: 'F-0933', name: 'Famille Roux', school: 'Nantes', segment: 'Standard', lifetimeCents: 710000, health: 77, lastActive: 'il y a 4 j' },
  ],
  invoices: [
    { id: 'INV-2481', family: 'Famille Martin', label: 'Scolarite T1', amountCents: 245000, due: '12 dec. 2026', status: 'Paid' },
    { id: 'INV-2480', family: 'Famille Bernard', label: 'Activites', amountCents: 89000, due: '15 dec. 2026', status: 'Pending' },
    { id: 'INV-2479', family: 'Famille Petit', label: 'Scolarite T1', amountCents: 245000, due: '02 dec. 2026', status: 'Overdue' },
    { id: 'INV-2478', family: 'Famille Dubois', label: 'Cantine', amountCents: 46000, due: '18 dec. 2026', status: 'Paid' },
    { id: 'INV-2477', family: 'Famille Moreau', label: 'Scolarite T1', amountCents: 245000, due: '08 dec. 2026', status: 'Pending' },
    { id: 'INV-2476', family: 'Famille Laurent', label: 'Activites', amountCents: 112000, due: '20 dec. 2026', status: 'Paid' },
  ],
  drafts: [
    { id: 'A-1', title: 'Relancer 18 familles a risque', summary: 'Les familles avec une sante sous 70 et aucune activite depuis 7 jours presentent un risque de depart. Proposer un point personnalise.', impact: '+ 12 400 EUR de revenu conservable', confidence: 87, category: 'Retention', status: 'draft', createdAt: '18 nov. 09:12' },
    { id: 'A-2', title: 'Proposer le palier Growth', summary: '42 familles Standard avec plus de 2 enfants inscrits pourraient beneficier du palier Growth. Verifier l eligibility avant tout envoi.', impact: '+ 3,8 % de revenu mensuel', confidence: 79, category: 'Revenue', status: 'draft', createdAt: '18 nov. 08:40' },
    { id: 'A-3', title: 'Deplacer le createau cantine', summary: 'Les pics d attente a 12h15 sur le site de Lyon Est suggestent de renforcer une file. Valider avec l equipe sur place.', impact: '- 9 min d attente moyenne', confidence: 72, category: 'Operations', status: 'draft', createdAt: '17 nov. 16:05' },
    { id: 'A-4', title: 'Rappel de facture avant echeance', summary: 'Les rappels envoyes 3 jours avant l echeance reduisent les retards de 24 % dans le jeu de donnees de demonstration.', impact: '- 24 % de retards', confidence: 91, category: 'Revenue', status: 'draft', createdAt: '17 nov. 11:30' },
  ],
  activity: [
    { id: 'E-1', actor: 'Famille Martin', action: 'a regle une facture', target: 'INV-2481', time: 'il y a 12 min' },
    { id: 'E-2', actor: 'Systeme', action: 'a detecte un risque de retention', target: '18 familles', time: 'il y a 40 min' },
    { id: 'E-3', actor: 'Famille Bernard', action: 'a inscrit un enfant', target: 'Activites', time: 'il y a 2 h' },
    { id: 'E-4', actor: 'Direction', action: 'a publie une annonce', target: 'Saint-Denis', time: 'il y a 3 h' },
    { id: 'E-5', actor: 'Famille Petit', action: 'a signale une absence', target: 'CP A', time: 'hier' },
  ],
  retention: series(['Juin', 'Juil', 'Aout', 'Sep', 'Oct', 'Nov'], [89, 90, 91, 92, 93, 94.2], [86, 87, 88, 89, 90, 91]),
}
