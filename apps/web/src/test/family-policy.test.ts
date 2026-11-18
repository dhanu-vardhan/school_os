import { describe, expect, it } from 'vitest'
import {
  makeFamilyData, requiredSignatories, signState, restrictionBlocks, guardianContactFor,
  majorityAccess, safeNotificationText, canteenCutoff, subjectAverages, overallAverage,
  visibleAnnouncements, quietHoursState, invitationState, canWithdrawConsent, ageAt,
  type GuardianLink, type GuardianRestriction,
} from '@schoolos/shared'

const NOW = new Date('2026-11-18T12:00:00Z')
const TODAY = '2026-11-18'
const data = makeFamilyData(NOW)
const links = data.links
const form = (id: string) => data.forms.find(item => item.id === id)!

const informationRestriction: GuardianRestriction = {
  id: 'gr-test', childId: 'stu-2', guardianSub: 'demo-guardian-2', type: 'school_information',
  scope: 'test', courtDocumentRef: 'TJ-0', courtDocumentName: 'order.pdf', setBy: 'direction',
  effectiveFrom: '2026-01-01', active: true,
}

describe('guardian relationship rules', () => {
  it('requires every guardian with parental authority for both_guardians', () => {
    expect(requiredSignatories('both_guardians', links, TODAY, 'stu-2').sort())
      .toEqual(['demo-guardian', 'demo-guardian-2'])
  })

  it('never infers a second parent from a household', () => {
    expect(requiredSignatories('both_guardians', links, TODAY, 'stu-1')).toEqual(['demo-guardian'])
  })

  it('blocks signing when an information restriction applies to this guardian', () => {
    const assignment = form('fa-4')
    const restricted = signState(assignment, 'demo-guardian-2', links, [informationRestriction], TODAY)
    expect(restricted.allowed).toBe(false)
    expect(restricted.reason).toBe('restricted')
  })

  it('lets either linked guardian sign a one_guardian form', () => {
    const assignment = form('fa-2')
    expect(signState(assignment, 'demo-guardian', links, [], TODAY).allowed).toBe(true)
    const father = { ...links[2] }
    const withFather = [...links, { ...father, id: 'gl-test', childId: 'stu-1' } as GuardianLink]
    expect(signState(assignment, 'demo-guardian-2', withFather, [], TODAY).allowed).toBe(true)
  })

  it('reports already signed and complete states', () => {
    expect(signState(form('fa-1'), 'demo-guardian', links, [], TODAY).reason).toBe('already_signed')
    expect(signState(form('fa-3'), 'demo-guardian', links, [], TODAY).reason).toBe('complete')
  })

  it('maps restriction types to the exact data class only', () => {
    const camilleRestrictions = data.restrictions.filter(item => item.guardianSub === 'demo-guardian')
    expect(restrictionBlocks(camilleRestrictions, 'collection', TODAY)).toBe(false)
    const alexRestrictions = data.restrictions.filter(item => item.guardianSub === 'demo-guardian-2')
    expect(restrictionBlocks(alexRestrictions, 'collection', TODAY)).toBe(true)
    expect(restrictionBlocks(alexRestrictions, 'media', TODAY)).toBe(true)
    expect(restrictionBlocks(alexRestrictions, 'information', TODAY)).toBe(false)
    expect(restrictionBlocks(alexRestrictions, 'records', TODAY)).toBe(false)
  })

  it('masks the other guardian contact only for address-disclosure restrictions', () => {
    const contact = { name: 'Alex Moreau', email: 'alex.moreau@example.fr', phone: '06 12 34 56 78' }
    const masked = guardianContactFor(contact, [{ ...informationRestriction, type: 'address_disclosure' }], TODAY)
    expect(masked.masked).toBe(true)
    expect(masked.email).not.toContain('alex.moreau')
    expect(masked.phone).toContain('••••')
    expect(guardianContactFor(contact, [], TODAY).masked).toBe(false)
  })
})

describe('majority and notifications', () => {
  it('applies the school age policy at 18', () => {
    expect(ageAt('2008-11-18', TODAY)).toBe(18)
    expect(majorityAccess('2008-11-19', TODAY, data.policy)).toBe('full')
    expect(majorityAccess('2008-11-18', TODAY, data.policy)).toBe('consent_required')
    expect(majorityAccess('2008-11-18', TODAY, { agePolicy: 'stop' })).toBe('stopped')
  })

  it('never puts content in push or email copy', () => {
    for (const category of ['attendance', 'grades', 'billing', 'safety'] as const) {
      const text = safeNotificationText(category)
      expect(text.title).not.toMatch(/Léa|Tom|Martin|\d+ ?€/)
      expect(text.body).not.toMatch(/Léa|Tom|Martin|\d+ ?€/)
    }
  })

  it('respects quiet hours and the canteen cutoff', () => {
    expect(quietHoursState({ start: '18:00', end: '08:00', enabled: true }, '2026-11-18T19:00:00Z').quiet).toBe(true)
    expect(quietHoursState({ start: '18:00', end: '08:00', enabled: true }, '2026-11-18T12:00:00Z').quiet).toBe(false)
    expect(canteenCutoff('2026-11-19', '2026-11-19T09:00:00Z').open).toBe(true)
    expect(canteenCutoff('2026-11-19', '2026-11-19T10:00:00Z').open).toBe(false)
  })

  it('hides announcements when school information is restricted', () => {
    expect(visibleAnnouncements(data.announcements, ['stu-2'], [], TODAY).length).toBeGreaterThan(0)
    expect(visibleAnnouncements(data.announcements, ['stu-2'], [informationRestriction], TODAY)).toEqual([])
  })

  it('computes weighted averages without peer ranking', () => {
    const grades = data.grades.filter(grade => grade.childId === 'stu-2')
    const averages = subjectAverages(grades)
    expect(averages.find(item => item.subject === 'Lecture')?.average).toBeCloseTo(17.3, 1)
    expect(overallAverage(grades)).toBeCloseTo(16.8, 1)
  })
})

describe('invitations and consent', () => {
  it('marks expired invitations unusable and allows consent withdrawal', () => {
    expect(invitationState(data.invitations[1], NOW).usable).toBe(false)
    expect(invitationState(data.invitations[1], NOW).reason).toBe('expired')
    const consent = data.consents[0]
    expect(canWithdrawConsent(consent)).toBe(true)
    expect(canWithdrawConsent({ ...consent, legalBasis: 'legal_obligation' })).toBe(false)
  })
})
