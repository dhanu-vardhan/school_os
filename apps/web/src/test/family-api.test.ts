import { describe, expect, it } from 'vitest'
import {
  demoLogin, declareAbsence, addAuthorizedPerson, downloadFamilyDocument, getFamilyChild,
  getFamilyOverview, getFamilyPolicy, listAuthorizedPersons, listFamilyAttendance,
  getFamilyBilling, listFamilyChildren, listFamilyConsents, listFamilyForms,
  listFamilyInvitations, listFamilyThreads, getOtherGuardianContact, payFamilyInvoice,
  listFamilyActivities, cancelFamilyActivity, listFamilyCanteen, cancelCanteenReservation,
  sendFamilyMessage, signFamilyForm,
} from '@schoolos/api-client'
import { ApiError } from '@schoolos/api-client'

async function loginGuardian2() {
  await demoLogin('guardian2')
}

describe('guardian portal scoping', () => {
  it('derives children from the session, never from the request', async () => {
    await demoLogin('guardian')
    const overview = await getFamilyOverview()
    expect(overview.data.children.map(child => child.id).sort()).toEqual(['stu-1', 'stu-2'])
    const children = await listFamilyChildren()
    expect(children.data).toHaveLength(2)
  })

  it('refuses another family’s child (IDOR)', async () => {
    await demoLogin('guardian')
    await expect(getFamilyChild('stu-5')).rejects.toMatchObject({ status: 403 })
    await expect(listFamilyAttendance('stu-5')).rejects.toMatchObject({ status: 403 })
    await expect(declareAbsence({
      childId: 'stu-5', fromDate: '2026-11-18', toDate: '2026-11-18', period: 'full_day', reasonCode: 'illness',
    })).rejects.toMatchObject({ status: 403 })
  })

  it('shows only the requesting guardian’s restrictions', async () => {
    await demoLogin('guardian')
    const overview = await getFamilyOverview()
    expect(overview.data.children.every(child => child.restrictions.length === 0)).toBe(true)

    await loginGuardian2()
    const alex = await getFamilyOverview()
    expect(alex.data.children.map(child => child.id)).toEqual(['stu-2'])
    expect(alex.data.children[0].restrictions.map(item => item.type).sort()).toEqual(['collect_child', 'media'])
    // A pick-up restriction does not hide school information.
    const attendance = await listFamilyAttendance()
    expect(attendance.data.days.length).toBeGreaterThan(0)
    await expect(addAuthorizedPerson({
      childId: 'stu-2', name: 'Test', relationship: 'Voisin', phone: '0600000000', idCheckRequired: true, validFrom: '2026-11-18',
    })).rejects.toMatchObject({ status: 403 })
  })

  it('returns the same school information to both guardians', async () => {
    await demoLogin('guardian')
    const a = await listFamilyThreads()
    await loginGuardian2()
    const b = await listFamilyThreads()
    expect(a.data.map(thread => thread.id).sort()).toEqual(b.data.map(thread => thread.id).sort())
  })

  it('keeps the other guardian contact readable unless an address restriction applies', async () => {
    await loginGuardian2()
    const contact = await getOtherGuardianContact('stu-2')
    expect(contact.data?.name).toBe('Camille Martin')
    expect(contact.data?.masked).toBe(false)
  })

  it('does not relay messages between guardians', async () => {
    await demoLogin('guardian')
    await expect(sendFamilyMessage({ recipientRole: 'guardian', subject: 'Hello', body: 'Hello' }))
      .rejects.toMatchObject({ status: 403 })
  })
})

describe('guardian forms and signatures', () => {
  it('requires the linked signatories and snapshots their ids', async () => {
    await demoLogin('guardian')
    const forms = await listFamilyForms('stu-2')
    const trip = forms.data.find(form => form.id === 'fa-1')!
    expect(trip.signatoryRule).toBe('both_guardians')
    expect(trip.requiredSignerSubs.sort()).toEqual(['demo-guardian', 'demo-guardian-2'])
  })

  it('lets the second guardian complete a both_guardians form', async () => {
    await loginGuardian2()
    const result = await signFamilyForm('fa-1', { device: 'test', method: 'password' })
    expect(result.data.assignment.status).toBe('signed')
    expect(result.data.assignment.signatures.map(sig => sig.signerSub).sort())
      .toEqual(['demo-guardian', 'demo-guardian-2'])
  })

  it('refuses signing for a child outside the guardian scope', async () => {
    await loginGuardian2()
    await expect(signFamilyForm('fa-2', {})).rejects.toMatchObject({ status: 403 })
  })

  it('accepts one_guardian signatures from either eligible guardian', async () => {
    await demoLogin('guardian')
    const result = await signFamilyForm('fa-2', { method: 'mfa' })
    expect(result.data.assignment.status).toBe('signed')
    expect(result.data.assignment.signatures[0].method).toBe('mfa')
  })

  it('keeps signature proof hashed', async () => {
    await demoLogin('guardian')
    const result = await signFamilyForm('fa-2', {})
    const signature = result.data.assignment.signatures[0]
    expect(signature.ipHash.startsWith('hmac:')).toBe(true)
    expect(signature.documentHash.startsWith('sha256:')).toBe(true)
  })
})

describe('guardian billing and documents', () => {
  it('enforces split billing by payer', async () => {
    await demoLogin('guardian')
    const billing = await getFamilyBilling()
    expect(billing.data.invoices.map(invoice => invoice.id).sort()).toEqual(['finv-1', 'finv-2'])
    await expect(payFamilyInvoice('finv-3')).rejects.toMatchObject({ status: 403 })

    await loginGuardian2()
    const alex = await getFamilyBilling()
    expect(alex.data.invoices.map(invoice => invoice.id)).toEqual(['finv-3'])
  })

  it('settles an invoice only for the payer, after step-up', async () => {
    await demoLogin('guardian')
    const receipt = await payFamilyInvoice('finv-1', 'card')
    expect(receipt.data.stepUpUsed).toBe(true)
    expect(receipt.data.invoiceId).toBe('finv-1')
    const after = await getFamilyBilling()
    expect(after.data.invoices.find(invoice => invoice.id === 'finv-1')?.status).toBe('paid')
  })

  it('cancels activity enrolments and canteen reservations', async () => {
    await demoLogin('guardian')
    const activities = await listFamilyActivities('stu-2')
    const enrolment = activities.data.enrolments[0]
    const cancelled = await cancelFamilyActivity(enrolment.id)
    expect(cancelled.data.status).toBe('cancelled')

    const canteen = await listFamilyCanteen('stu-2')
    const reservation = canteen.data.reservations[0]
    const removed = await cancelCanteenReservation(reservation.id)
    expect(removed.data.status).toBe('cancelled')
  })

  it('watermarks and audits downloads, and refuses other children', async () => {
    await demoLogin('guardian')
    const result = await downloadFamilyDocument('doc-1')
    expect(result.data.download.watermark).toContain('Tom Martin')
    expect(result.data.download.watermark).toContain('Famille Martin')
    await loginGuardian2()
    await expect(downloadFamilyDocument('doc-2')).rejects.toMatchObject({ status: 403 })
  })
})

describe('guardian portal policy and invitations', () => {
  it('exposes the school policy and never enables ranking by default', async () => {
    await demoLogin('guardian')
    const policy = await getFamilyPolicy()
    expect(policy.data.gradeRankingEnabled).toBe(false)
    expect(policy.data.agePolicy).toBe('require_student_consent')
    expect(policy.data.signatureNotice).toContain('TODO(legal-review)')
  })

  it('returns invitation state and prevents reuse of expired links', async () => {
    await demoLogin('guardian')
    const invitations = await listFamilyInvitations()
    const expired = invitations.data.find(item => item.id === 'inv-expired')!
    expect(expired.state.usable).toBe(false)
    expect(expired.state.reason).toBe('expired')
    expect(expired.codeHint).toMatch(/^••••/)
  })

  it('keeps consent withdrawal available and scoped', async () => {
    await demoLogin('guardian')
    const consents = await listFamilyConsents()
    expect(consents.data).toHaveLength(3)
    await loginGuardian2()
    const alex = await listFamilyConsents()
    expect(alex.data.map(consent => consent.id)).toEqual(['con-3'])
  })

  it('rejects non-guardian roles with 403', async () => {
    await demoLogin('teacher')
    const error = await getFamilyOverview().catch(err => err)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(403)
  })
})
