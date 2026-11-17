# Platform spike (Phase 0)

Status: scaffolded. Native shells not yet built (no Rust/Android SDK in this environment). Real-device validation pending.

## Checklist
- [ ] Web login + school switch
- [ ] Desktop (Tauri) login
- [ ] Android (Capacitor) login
- [ ] iOS (Capacitor) login
- [ ] Offline attendance sync
- [ ] Push notifications
- [ ] QR scan, photo, voice note upload
- [ ] Biometric lock + wipe on logout
- [ ] Deep links

See docs/DECISIONS.md for platform decisions.
EOF
python3 -c "
p='/Users/anthapuvivekanandareddy/Desktop/SMS_SOF/docs/PLATFORM_SPIKE.md'
s=open(p).read()
i=s.rfind('decisions.')
open(p,'w').write(s[:i+10]+'\n')
print('ok')
"