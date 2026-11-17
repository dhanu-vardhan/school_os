# Security review checklist (human review before launch)

- [ ] Authentication and token handling
- [ ] Tenant context and RLS helpers
- [ ] Authorisation policies
- [ ] File access and pre-signed URLs
- [ ] Payment webhooks
- [ ] Encryption and key handling
- [ ] Audit log
- [ ] Impersonation
- [ ] Data export and deletion

Evidence for each: code references, tests, and sign-off date.
EOF
python3 -c "
p='/Users/anthapuvivekanandareddy/Desktop/SMS_SOF/docs/SECURITY_REVIEW_CHECKLIST.md'
s=open(p).read()
i=s.rfind('date.')
open(p,'w').write(s[:i+5]+'\n')
print('ok')
"