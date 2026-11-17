import { cn } from '../lib/cn'

export type BrandMarkProps = { className?: string; size?: number }

/** Original inline SVG mark: graduation cap over rising bars. */
export function BrandMark({ className, size = 32 }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={cn('shrink-0', className)}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="bm-bars" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.55" />
          <stop offset="100%" stopColor="currentColor" />
        </linearGradient>
      </defs>
      {/* rising bars */}
      <rect x="6" y="30" width="6" height="12" rx="1.5" fill="url(#bm-bars)" />
      <rect x="16" y="22" width="6" height="20" rx="1.5" fill="url(#bm-bars)" />
      <rect x="26" y="14" width="6" height="28" rx="1.5" fill="url(#bm-bars)" />
      {/* graduation cap */}
      <path
        d="M24 4 L44 12 L24 20 L4 12 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M14 15 v6 c0 3 4.5 6 10 6 s10 -3 10 -6 v-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M44 12 v9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="44" cy="23" r="1.6" fill="currentColor" />
    </svg>
  )
}