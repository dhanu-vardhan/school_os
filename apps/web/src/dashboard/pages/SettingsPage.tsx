import { useState, type FormEvent } from 'react'
import { Card, CardHeader, PageHeader } from '../components/primitives'
import { useDashboard } from '../state/DashboardContext'

interface FormState {
  name: string
  email: string
  school: string
  timezone: string
  digest: boolean
  aiAlerts: boolean
  billingAlerts: boolean
  density: string
}

const initial: FormState = {
  name: 'Camille Duval',
  email: 'camille.duval@example.edu',
  school: 'Saint-Denis',
  timezone: 'Europe/Paris',
  digest: true,
  aiAlerts: true,
  billingAlerts: false,
  density: 'Confortable',
}

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="ds-toggle-row">
      <div><strong>{label}</strong><span>{description}</span></div>
      <button type="button" className="ds-toggle" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} />
    </div>
  )
}

export function SettingsPage() {
  const { notify } = useDashboard()
  const [form, setForm] = useState<FormState>(initial)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }))

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const next: typeof errors = {}
    if (!form.name.trim()) next.name = 'Nom requis'
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) next.email = 'Adresse email invalide'
    if (!form.school.trim()) next.school = 'Etablissement requis'
    setErrors(next)
    if (Object.keys(next).length === 0) notify('Parametres enregistres (demo)')
  }

  return (
    <>
      <PageHeader eyebrow="Espace de travail" title="Parametres" subtitle="Profil, notifications et preferences d affichage." />

      <form onSubmit={submit} noValidate>
        <div className="ds-grid-even" style={{ marginTop: 0 }}>
          <Card>
            <CardHeader title="Profil" subtitle="Informations de l administrateur" />
            <div className="ds-card-body">
              <div className="ds-form-grid">
                <div className="ds-field">
                  <label htmlFor="settings-name">Nom complet</label>
                  <input id="settings-name" value={form.name} onChange={(e) => set('name', e.target.value)} aria-invalid={Boolean(errors.name)} />
                  {errors.name && <small>{errors.name}</small>}
                </div>
                <div className="ds-field">
                  <label htmlFor="settings-email">Email</label>
                  <input id="settings-email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} aria-invalid={Boolean(errors.email)} />
                  {errors.email && <small>{errors.email}</small>}
                </div>
                <div className="ds-field">
                  <label htmlFor="settings-school">Etablissement</label>
                  <input id="settings-school" value={form.school} onChange={(e) => set('school', e.target.value)} aria-invalid={Boolean(errors.school)} />
                  {errors.school && <small>{errors.school}</small>}
                </div>
                <div className="ds-field">
                  <label htmlFor="settings-tz">Fuseau horaire</label>
                  <select id="settings-tz" value={form.timezone} onChange={(e) => set('timezone', e.target.value)}>
                    <option value="Europe/Paris">Europe/Paris</option>
                    <option value="Europe/London">Europe/London</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Affichage" subtitle="Densite de l interface" />
            <div className="ds-card-body">
              <div className="ds-field">
                <label htmlFor="settings-density">Densite</label>
                <select id="settings-density" value={form.density} onChange={(e) => set('density', e.target.value)}>
                  <option>Confortable</option>
                  <option>Compacte</option>
                </select>
              </div>
              <p className="ds-ai-note" style={{ marginTop: 14 }}>Les montants sont saisis en centimes et affiches en EUR. Les dates sont enregistrees en UTC et affichees dans le fuseau de l etablissement.</p>
            </div>
          </Card>
        </div>

        <div className="ds-stack">
          <Card>
            <CardHeader title="Notifications" subtitle="Choix des alertes recevables" />
            <div className="ds-card-body">
              <Toggle label="Resume hebdomadaire" description="Un resume des indicateurs chaque lundi." checked={form.digest} onChange={(v) => set('digest', v)} />
              <Toggle label="Suggestions IA" description="Etre notifie lorsqu un brouillon attend une revue." checked={form.aiAlerts} onChange={(v) => set('aiAlerts', v)} />
              <Toggle label="Alertes de facturation" description="Etre notifie des factures en retard." checked={form.billingAlerts} onChange={(v) => set('billingAlerts', v)} />
            </div>
          </Card>
        </div>

        <div className="ds-actions" style={{ marginTop: 18 }}>
          <button type="submit" className="ds-btn ds-btn-primary">Enregistrer les modifications</button>
          <button type="button" className="ds-btn" onClick={() => { setForm(initial); setErrors({}); notify('Modifications annulees') }}>Reinitialiser</button>
        </div>
      </form>
    </>
  )
}
