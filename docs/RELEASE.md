# Release

## Signing secrets
Stored in secrets manager, never in repo: Apple Developer, Google Play, Windows cert, macOS Developer ID, Linux signing.

## CI/CD
Web: build, test, deploy to CDN.
Desktop: matrix build Windows/macOS/Linux, sign, notarise, publish installers + signed update feed.
Android: build AAB, sign, upload to internal testing track.
iOS: macOS runner builds IPA, signs, uploads to TestFlight.

Release builds from tagged commits only. Staged rollouts on both stores.
EOF
python3 -c "
p='/Users/anthapuvivekanandareddy/Desktop/SMS_SOF/docs/RELEASE.md'
s=open(p).read()
i=s.rfind('stores.')
open(p,'w').write(s[:i+7]+'\n')
print('ok')
"