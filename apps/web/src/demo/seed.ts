export type Role = 'director'|'deputy'|'teacher'|'assistant'|'finance'|'admissions'|'reception'|'guardian'|'guardian2'|'instructor'|'provider'|'safeguarding'|'operator'
export type User = { id:string; role:Role; name:string; avatar:string; desc:string }
export type Child = { id:string; name:string; classId:string; school:'Primaire Saint-Denis'|'Maternelle Rivoli'; attendance:'present'|'absent'|'retard'|'non'; pickup:'ok'|'restricted' }
export type ClassItem = { id:string; name:string; level:string; teacher:string; headcount:number; capacity:number; room:string; attendanceToday:number }
export type Message = { id:string; from:string; to:string; childId?:string; subject:string; body:string; time:string; reply?:string }
export type Invoice = { id:string; childId:string; label:string; amount:number; status:'payee'|'due'|'en_retard'|'echoue'|'remboursement_en_attente' }
export type Activity = { id:string; name:string; slots:number; booked:number; waitlist:number; day:string }
export type Observation = { id:string; childId:string; author:string; text:string; time:string }
export type DemoState = {
  user?:User; users:User[]; classes:ClassItem[]; children:Child[]; messages:Message[]; invoices:Invoice[]; activities:Activity[]; observations:Observation[];
  announcements:string[]; audit:string[]; inbox:{id:string;channel:string;to:string;subject:string;body:string}[];
  clock:string; offline:boolean; toasts:string[];
}

export const USERS:User[] = [
  {id:'u-dir',role:'director',name:'Camille Durand',avatar:'CD',desc:'Direction · École Primaire Saint-Denis'},
  {id:'u-dep',role:'deputy',name:'Nora Benali',avatar:'NB',desc:'Direction adjointe'},
  {id:'u-tea',role:'teacher',name:'Élise Martin',avatar:'EM',desc:'Enseignante CP A'},
  {id:'u-ast',role:'assistant',name:'Yanis Petit',avatar:'YP',desc:'Assistant pédagogique'},
  {id:'u-fin',role:'finance',name:'Sarah Cohen',avatar:'SC',desc:'Gestion financière'},
  {id:'u-adm',role:'admissions',name:'Lucie Bernard',avatar:'LB',desc:'Admissions'},
  {id:'u-rec',role:'reception',name:'Hugo Leroy',avatar:'HL',desc:'Accueil / Kiosque'},
  {id:'u-g1',role:'guardian',name:'Famille Martin',avatar:'FM',desc:'Parent · Léa (CP A) et Tom (MS A)'},
  {id:'u-g2',role:'guardian2',name:'Alex Moreau',avatar:'AM',desc:'Second parent · foyer séparé'},
  {id:'u-ins',role:'instructor',name:'Mina Diallo',avatar:'MD',desc:'Intervenante activités'},
  {id:'u-pro',role:'provider',name:'Club Échecs Paris',avatar:'CE',desc:'Prestataire externe'},
  {id:'u-saf',role:'safeguarding',name:'Dr Paul Girard',avatar:'PG',desc:'Référent protection'},
  {id:'u-op',role:'operator',name:'Opérateur Plateforme',avatar:'OP',desc:'Console opérateur'},
]

export function makeSeed():DemoState {
  return {
    users: USERS,
    classes: [
      {id:'c1',name:'Moyenne Section A',level:'MS',teacher:'Amélie Roux',headcount:22,capacity:24,room:'Salle 04',attendanceToday:21},
      {id:'c2',name:'CP A',level:'CP',teacher:'Élise Martin',headcount:23,capacity:25,room:'Salle 08',attendanceToday:22},
      {id:'c3',name:'CE1',level:'CE1',teacher:'Inès Diallo',headcount:24,capacity:26,room:'Salle 10',attendanceToday:24},
      {id:'c4',name:'CM1-CM2',level:'CM1/CM2',teacher:'Laura Perrin',headcount:26,capacity:28,room:'Salle 12',attendanceToday:25},
    ],
    children: [
      {id:'ch1',name:'Léa Martin',classId:'c2',school:'Primaire Saint-Denis',attendance:'non',pickup:'ok'},
      {id:'ch2',name:'Tom Martin',classId:'c1',school:'Maternelle Rivoli',attendance:'present',pickup:'ok'},
    ],
    messages: [
      {id:'m1',from:'Élise Martin',to:'Famille Martin',childId:'ch1',subject:'Sortie musée',body:"Bonjour, pensez à signer l'autorisation pour mardi.",time:'Aujourd\'hui 08:12'},
    ],
    invoices: [
      {id:'i1',childId:'ch1',label:'Cantine — Novembre 2026',amount:84.00,status:'due'},
      {id:'i2',childId:'ch2',label:'Garderie — Novembre 2026',amount:42.00,status:'echoue'},
    ],
    activities: [
      {id:'a1',name:'Échecs — CP/CE1',slots:16,booked:15,waitlist:3,day:'Mardi 16:30'},
      {id:'a2',name:'Arts plastiques',slots:12,booked:10,waitlist:0,day:'Jeudi 15:00'},
    ],
    observations: [
      {id:'o1',childId:'ch1',author:'Élise Martin',text:'Lecture fluide en autonomie, belle progression.',time:'Hier'},
    ],
    announcements: ['Réunion parents-professeurs le 20/11 à 18h.'],
    audit: ['Démo initialisée.'],
    inbox: [],
    clock: 'Lun 16 nov 2026 · 08:30',
    offline: false,
    toasts: [],
  }
}
