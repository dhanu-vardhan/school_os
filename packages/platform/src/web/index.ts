import type { PlatformAdapters } from '../index'

export const webAdapters: PlatformAdapters = {
  tokenStore: { get: async () => null, set: async () => {}, clear: async () => {} },
  auth: { login: async () => {}, logout: async () => {}, handleCallback: async () => {} },
  push: { register: async () => null, unregister: async () => {} },
  camera: { capture: async () => null },
  qrScanner: { scan: async () => null },
  audioRecorder: { record: async () => null },
  biometric: { available: async () => false, unlock: async () => false },
  offlineStore: { get: async () => null, set: async () => {}, clear: async () => {} },
  files: { save: async () => {}, share: async () => {} },
  deepLinks: { onLink: () => () => {} },
  updater: { check: async () => {} },
  network: { online: () => (typeof navigator !== 'undefined' ? navigator.onLine : true) },
  capabilities: {}
}
EOF
python3 -c "
p='/Users/anthapuvivekanandareddy/Desktop/SMS_SOF/packages/platform/src/web/index.ts'
s=open(p).read()
i=s.rfind('}')
open(p,'w').write(s[:i+1]+'\n')
print('ok')
"