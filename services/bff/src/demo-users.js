export const SCHOOL_A = '11111111-1111-4111-8111-111111111111'
export const SCHOOL_B = '22222222-2222-4222-8222-222222222222'

export const DEMO_USERS = [
  { role: 'director', sub: 'demo-director', schoolId: SCHOOL_A, name: 'Camille Durand', apiRoles: ['DIRECTOR'] },
  { role: 'deputy', sub: 'demo-deputy', schoolId: SCHOOL_A, name: 'Nora Benali', apiRoles: ['DEPUTY'] },
  { role: 'teacher', sub: 'demo-teacher', schoolId: SCHOOL_A, name: 'Élise Martin', apiRoles: ['TEACHER'] },
  { role: 'assistant', sub: 'demo-assistant', schoolId: SCHOOL_A, name: 'Yanis Petit', apiRoles: ['ASSISTANT'] },
  { role: 'finance', sub: 'demo-finance', schoolId: SCHOOL_A, name: 'Sarah Cohen', apiRoles: ['FINANCE'] },
  { role: 'admissions', sub: 'demo-admissions', schoolId: SCHOOL_A, name: 'Lucie Bernard', apiRoles: ['ADMISSIONS'] },
  { role: 'reception', sub: 'demo-reception', schoolId: SCHOOL_A, name: 'Hugo Leroy', apiRoles: ['RECEPTION'] },
  { role: 'guardian', sub: 'demo-guardian', schoolId: SCHOOL_A, name: 'Famille Martin', apiRoles: ['GUARDIAN'] },
  { role: 'guardian2', sub: 'demo-guardian-2', schoolId: SCHOOL_A, name: 'Alex Moreau', apiRoles: ['GUARDIAN'] },
  { role: 'instructor', sub: 'demo-instructor', schoolId: SCHOOL_A, name: 'Mina Diallo', apiRoles: ['INSTRUCTOR'] },
  { role: 'provider', sub: 'demo-provider', schoolId: SCHOOL_A, name: 'Club Échecs Paris', apiRoles: ['PROVIDER'] },
  { role: 'safeguarding', sub: 'demo-safeguarding', schoolId: SCHOOL_A, name: 'Dr Paul Girard', apiRoles: ['SAFEGUARDING'] },
  { role: 'operator', sub: 'demo-operator', schoolId: SCHOOL_A, name: 'Opérateur Plateforme', apiRoles: ['OPERATOR'] },
]

export function findDemoUser(role, schoolId) {
  const user = DEMO_USERS.find(u => u.role === role)
  if (!user) return null
  if (schoolId && schoolId !== SCHOOL_A && schoolId !== SCHOOL_B) return null
  return { ...user, schoolId: schoolId || user.schoolId }
}

export function publicDemoUsers() {
  return DEMO_USERS.map(({ role, name, schoolId }) => ({ role, name, schoolId }))
}
