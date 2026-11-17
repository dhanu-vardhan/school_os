# Traceability

Status legend: done / partial / stubbed / missing / contradicted.

## Platform foundation (prompt 1 5.1)
| ID | Requirement | Module | Status | Evidence |
|---|---|---|---|---|
| P1-5.1-roles | Roles and permissions | tenancy | partial | SchoolRole enum; PolicyService not yet |
| P1-5.1-multichild | Multiple children under one parent | people | missing | no guardian model yet |
| P1-5.1-guardianship | Multiple guardians with rights | people | missing | no guardianship entity |
| P1-5.1-i18n | French/English UI | web | partial | i18n not wired in client |
| P1-5.1-pwa | PWA mobile-first | web | partial | Vite app, no PWA plugin |
| P1-5.1-notifications | Push/email/SMS | notifications | missing | module not created |
| P1-5.1-audit | Audit log | audit | stubbed | package only |
| P1-5.1-export | Data export/erasure | compliance | missing | no implementation |

## Student & family records (5.2)
| ID | Requirement | Module | Status | Evidence |
|---|---|---|---|---|
| P1-5.2-profile | Student profile | people | partial | Student entity |
| P1-5.2-ine | INE number | people | done | Student.ineNumber |
| P1-5.2-guardians | Guardians/emergency contacts | people | missing | - |
| P1-5.2-pickup | Authorised pickup list | people | missing | - |
| P1-5.2-custody | Custody restrictions | people | missing | - |
| P1-5.2-siblings | Sibling links | people | missing | - |
| P1-5.2-docs | Document storage | files | missing | - |

## Admissions (5.3)
| ID | Requirement | Module | Status | Evidence |
|---|---|---|---|---|
| P1-5.3-inquiry | Inquiry form | admissions | missing | - |
| P1-5.3-waitlist | Waitlist | admissions | missing | - |
| P1-5.3-contract | Enrolment contract e-sign | forms-signatures | missing | - |
| P1-5.3-deposit | Deposit payment | billing | missing | - |

## Attendance (5.4)
| ID | Requirement | Module | Status | Evidence |
|---|---|---|---|---|
| P1-5.4-daily | Daily attendance two taps | attendance | missing | module not created |
| P1-5.4-statuses | Statuses | attendance | missing | - |
| P1-5.4-parentdecl | Parent absence declaration | attendance | missing | - |
| P1-5.4-notify | Instant parent notification | notifications | missing | - |

## Pedagogy (5.5)
| ID | Requirement | Module | Status | Evidence |
|---|---|---|---|---|
| P1-5.5-classes | Class/group management | pedagogy | missing | - |
| P1-5.5-obs | Observation capture | pedagogy | missing | - |
| P1-5.5-skills | Skill progression | pedagogy | missing | - |
| P1-5.5-socle | Socle commun mapping | pedagogy | missing | - |
| P1-5.5-reports | AI-drafted narrative reports | ai | missing | - |
| P1-5.5-portfolio | Parent progress summaries | pedagogy | missing | - |

## Special needs (5.6)
| ID | Requirement | Module | Status | Evidence |
|---|---|---|---|---|
| P1-5.6-plans | Individual plans PAP/PPS/PAI | support-plans | missing | - |
| P1-5.6-versions | Version history | support-plans | missing | - |
| P1-5.6-confidentiality | Role-based confidentiality | support-plans | missing | - |

## Care (5.7)
| ID | Requirement | Module | Status | Evidence |
|---|---|---|---|---|
| P1-5.7-logs | Meals/naps/toilet/mood/temp | care | missing | - |
| P1-5.7-report | End-of-day report | care | missing | - |
| P1-5.7-photo | Photo/video sharing with consent | files | missing | - |
| P1-5.7-incident | Incident/accident reports | care | missing | - |

## Communication (5.8)
| ID | Requirement | Module | Status | Evidence |
|---|---|---|---|---|
| P1-5.8-messages | Direct messages | communication | missing | - |
| P1-5.8-announcements | School/class announcements | communication | missing | - |
| P1-5.8-feed | Class feed | communication | missing | - |
| P1-5.8-liaison | Liaison notebook | communication | missing | - |
| P1-5.8-translation | Auto translation | ai | missing | - |

## Events/trips/calendar (5.9/5.10)
| ID | Requirement | Module | Status | Evidence |
|---|---|---|---|---|
| P1-5.9-calendar | Shared calendar iCal sync | calendar | missing | - |
| P1-5.9-rsvp | Events RSVP | calendar | missing | - |
| P1-5.9-ptm | Parent-teacher meeting scheduling | calendar | missing | - |
| P1-5.9-trips | Trips permission slips | forms-signatures | missing | - |
| P1-5.10-yearsetup | School year setup | calendar | missing | - |
| P1-5.10-holidays | French holiday calendars by zone | calendar | partial | fr-holidays-zone-c.json data file |
| P1-5.10-closures | Closures/strike handling | calendar | missing | - |

## Finance/billing (5.12)
| ID | Requirement | Module | Status | Evidence |
|---|---|---|---|---|
| P1-5.12-fees | Fee structures | billing | missing | - |
| P1-5.12-sepa | SEPA direct debit | billing | missing | - |
| P1-5.12-invoices | French-compliant invoices | billing | missing | - |
| P1-5.12-reminders | Automatic reminders | billing | missing | - |
| P1-5.12-split | Split billing | billing | missing | - |

## Canteen (5.13)
| ID | Requirement | Module | Status | Evidence |
|---|---|---|---|---|
| P1-5.13-menu | Weekly menu publishing | activities-canteen | missing | - |
| P1-5.13-allergy | Allergy/dietary info | activities-canteen | missing | - |

## Activities (5.14 + prompt3)
| ID | Requirement | Module | Status | Evidence |
|---|---|---|---|---|
| P1-5.14-catalogue | Activity catalogue | activities | partial | Activity entity |
| P1-5.14-registration | Registration/waitlist | activities | partial | ActivityOffering, ActivityRegistration entities |
| P1-5.14-attendance | Per-session attendance | activities | partial | ActivityAttendance entity |
| P1-5.14-billing | Billing attached | activities | missing | - |
| P3-1.4-#2 | Parent books activities conflict detection | activities | missing | - |
| P3-1.4-#3 | Waitlist auto-promotion | activities | missing | - |
| P3-1.4-#4 | Offline attendance + notifications | activities | missing | - |
| P3-1.4-#5 | Provider scoped access | activities | missing | - |

## Health/safety (5.15)
| ID | Requirement | Module | Status | Evidence |
|---|---|---|---|---|
| P1-5.15-medical | Medical/allergy alerts | care | missing | - |
| P1-5.15-emergency | Emergency contacts one-tap | care | missing | - |

## Staff/HR (5.16)
| ID | Requirement | Module | Status | Evidence |
|---|---|---|---|---|
| P1-5.16-profiles | Staff profiles/roles | people | missing | - |
| P1-5.16-docs | Staff docs/qualifications | people | missing | - |

## Forms/e-signature (5.17)
| ID | Requirement | Module | Status | Evidence |
|---|---|---|---|---|
| P1-5.17-formbuilder | Form builder | forms-signatures | missing | - |
| P1-5.17-templates | Templates | forms-signatures | missing | - |
| P1-5.17-esign | E-signature | forms-signatures | missing | - |

## Reporting/compliance (5.19)
| ID | Requirement | Module | Status | Evidence |
|---|---|---|---|---|
| P1-5.19-dashboard | Director dashboard | reporting | missing | - |
| P1-5.19-inspection | Inspection-ready records | reporting | missing | - |
| P1-5.19-import | Import wizard | reporting | missing | - |

## AI (5.21)
| ID | Requirement | Module | Status | Evidence |
|---|---|---|---|---|
| P1-5.21-reports | AI-drafted narrative reports | ai | missing | - |
| P1-5.21-stt | Voice-to-text | ai | missing | - |
| P1-5.21-translate | Translate messages/reports | ai | missing | - |

## Tenancy/security (prompt2)
| ID | Requirement | Module | Status | Evidence |
|---|---|---|---|---|
| P2-7-tenantflow | Tenant request flow 4 steps | security | done | TenantResolutionFilter, TenantAwareDataSource, RLS |
| P2-7-rls | RLS enabled+forced all tenant tables | db | done | V1, V2 migrations; CI check not implemented |
| P2-7-roles | DB roles owner/app/support | db | partial | init-db.sql creates app/support; owner is POSTGRES_USER |
| P2-8-storage | Object storage rules | files | missing | - |
| P2-9-encryption | Field-level encryption | common | missing | - |
| P2-10-crossTenant | Cross-tenant security suite | security | partial | CrossTenantIsolationTest for Student |
| P2-11-testing | Integration/e2e | - | partial | one integration test |

## Multi-platform (prompt4)
| ID | Requirement | Module | Status | Evidence |
|---|---|---|---|---|
| P4-3-adapters | Platform adapter layer | platform | partial | interfaces + web + mock |
| P4-4-auth | Auth per platform | security | missing | - |
| P4-5-push | Push gateway | notifications | missing | - |
| P4-6-offline | Offline store | platform | partial | interface only |
| P4-11-spike | Phase 0 spike on real devices | - | missing | docs/PLATFORM_SPIKE.md |
| P4-8-cicd | CI/CD signing | - | partial | .github/workflows/ci.yml basic |

## Missing foundations (prompt3)
| ID | Requirement | Module | Status | Evidence |
|---|---|---|---|---|
| P3-4-export | Per-school export/restore | lifecycle | missing | - |
| P3-4-retention | Retention engine | lifecycle | partial | RetentionPolicy entity |
| P3-5-rollover | Year rollover | lifecycle | missing | - |
| P3-6-guardianlifecycle | Guardian account lifecycle | people | missing | - |
| P3-7-notifinfra | Notification deliverability | notifications | missing | - |
| P3-8-safeguarding | Safeguarding concern workflow | safeguarding | partial | SafeguardingConcern entity |
| P3-9-paper | Paper fallbacks/print | - | missing | - |
| P3-10-nfr | NFR quality gates | - | missing | - |
| P3-11-compliance | Compliance doc pack | compliance | partial | docs/COMPLIANCE.md |
| P3-12-support | Support/help | support | stubbed | package only |
| P3-13-pilot | Pilot readiness mode | - | partial | docs/PILOT_READINESS.md |

## Prompt5
| ID | Requirement | Module | Status | Evidence |
|---|---|---|---|---|
| P5-2-authz | Authorisation model/matrix | security | missing | docs not created |
| P5-3-multicampus | Multi-campus hierarchy | tenancy | missing | - |
| P5-4-inclusion | Inclusion module | inclusion | missing | - |
| P5-5-health | Health/canteen/transport | care | missing | - |
| P5-6-facilities | Facilities/safety | facilities-safety | missing | - |
| P5-7-staff | Staff administration | people | missing | - |
| P5-8-finance | Finance depth | billing | missing | - |
| P5-9-integrations | Data migration/integrations | - | missing | - |
| P5-10-search | Search/reporting/exports | reporting | missing | - |
| P5-11-ai | AI governance | ai | missing | - |
| P5-12-reliability | Reliability/observability | - | missing | - |
| P5-13-synthetic | Synthetic data generator | - | missing | - |
| P5-15-docs | Documentation/devex | - | partial | multiple docs exist |
echo done
