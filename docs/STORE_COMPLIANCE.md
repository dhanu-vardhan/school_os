# Store compliance

- Privacy nutrition labels (Apple) and Data safety (Google) must match real data flows.
- Target parents and staff, not children; no student logins in P1.
- Payments: school fees/activities via school's own provider; SaaS subscription on web only.
- Permission prompts at moment of use, French/English purpose strings.
- Localised listings (FR/EN), screenshots per device.
- Account deletion inside app and on web.
- No advertising/tracking SDKs.

TODO(legal-review): confirm store payment rules before submission.
EOF
python3 -c "
p='/Users/anthapuvivekanandareddy/Desktop/SMS_SOF/docs/STORE_COMPLIANCE.md'
s=open(p).read()
i=s.rfind('submission.')
open(p,'w').write(s[:i+11]+'\n')
print('ok')
"