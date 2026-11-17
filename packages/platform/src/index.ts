export interface Capability { supported: boolean; permission?: string }

export interface TokenStore {
  get(): Promise<string | null>
  set(token: string): Promise<void>
  clear(): Promise<void>
}

export interface Auth {
  login(): Promise<void>
  logout(): Promise<void>
  handleCallback(url: string): Promise<void>
}

export interface Push {
  register(): Promise<string | null>
  unregister(): Promise<void>
}

export interface Camera {
  capture(): Promise<Blob | null>
}

export interface QrScanner {
  scan(): Promise<string | null>
}

export interface AudioRecorder {
  record(): Promise<Blob | null>
}

export interface Biometric {
  available(): Promise<boolean>
  unlock(): Promise<boolean>
}

export interface OfflineStore {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T): Promise<void>
  clear(): Promise<void>
}

export interface Files {
  save(blob: Blob, name: string): Promise<void>
  share(blob: Blob, name: string): Promise<void>
}

export interface DeepLinks {
  onLink(cb: (url: string) => void): () => void
}

export interface Updater {
  check(): Promise<void>
}

export interface Network {
  online(): boolean
}

export interface PlatformAdapters {
  tokenStore: TokenStore
  auth: Auth
  push: Push
  camera: Camera
  qrScanner: QrScanner
  audioRecorder: AudioRecorder
  biometric: Biometric
  offlineStore: OfflineStore
  files: Files
  deepLinks: DeepLinks
  updater: Updater
  network: Network
  capabilities: Record<string, Capability>
}
EOF
cp /dev/stdin /Users/anthapuvivekanandareddy/Desktop/SMS_SOF/packages/platform/src/adapters/index.ts 2>/dev/null
# write properly via python
python3 - <<'PY'
p="/Users/anthapuvivekanandareddy/Desktop/SMS_SOF/packages/platform/src/adapters/index.ts"
PY
echo "placeholder"