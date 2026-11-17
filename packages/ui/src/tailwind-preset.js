/* Tailwind 3 preset mirroring packages/ui/src/styles.css tokens. */
const css = (name) => `rgb(var(${name}) / <alpha-value>)`

const scale = (prefix, stop) => css(`--${prefix}-${stop}`)

const palette = (prefix) => Object.fromEntries(
  [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map(n => [n, scale(prefix, n)])
)

/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      colors: {
        brand: palette('brand'),
        accent: palette('accent'),
        warning: palette('warning'),
        danger: palette('danger'),
        info: palette('info'),
        neutral: { ...palette('neutral'), 0: css('--neutral-0') },
        app: css('--app-bg'),
        surface: {
          DEFAULT: css('--surface'),
          2: css('--surface-2'),
          3: css('--surface-3'),
        },
        line: {
          DEFAULT: css('--border'),
          strong: css('--border-strong'),
          control: css('--control-border'),
        },
        content: {
          DEFAULT: css('--text'),
          muted: css('--text-muted'),
          subtle: css('--text-subtle'),
          inverse: css('--text-inverse'),
        },
        sidebar: {
          DEFAULT: css('--sidebar'),
          text: css('--sidebar-text'),
        },
        /* Component tokens — prefer these in action components. */
        action: {
          primary: css('--action-primary-bg'),
          'primary-hover': css('--action-primary-bg-hover'),
          'primary-fg': css('--action-primary-fg'),
          secondary: css('--action-secondary-bg'),
          'secondary-hover': css('--action-secondary-bg-hover'),
          'secondary-fg': css('--action-secondary-fg'),
          danger: css('--action-danger-bg'),
          'danger-hover': css('--action-danger-bg-hover'),
          'danger-fg': css('--action-danger-fg'),
          ai: css('--action-ai-bg'),
          'ai-fg': css('--action-ai-fg'),
          'ai-border': css('--action-ai-border'),
        },
        overlay: css('--overlay'),
        grid: css('--grid-line'),
        role: {
          admin: css('--role-admin'),
          teacher: css('--role-teacher'),
          parent: css('--role-parent'),
          student: css('--role-student'),
          safeguarding: css('--role-safeguarding'),
          finance: css('--role-finance'),
          operator: css('--role-operator'),
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        display: ['var(--font-display)'],
        mono: ['var(--font-mono)'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        full: 'var(--radius-full)',
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        focus: 'var(--shadow-focus)',
      },
      transitionTimingFunction: { out: 'var(--ease-out)', spring: 'var(--ease-spring)' },
      transitionDuration: {
        press: 'var(--duration-press)',
        state: 'var(--duration-state)',
        exit: 'var(--duration-exit)',
        fast: 'var(--duration-fast)',
        base: 'var(--duration-base)',
        enter: 'var(--duration-enter)',
        slow: 'var(--duration-slow)',
      },
      keyframes: {
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        'page-in': { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'none' } },
        ripple: { from: { transform: 'scale(0)', opacity: '0.5' }, to: { transform: 'scale(2.6)', opacity: '0' } },
      },
      animation: {
        shimmer: 'shimmer 1.4s ease-in-out infinite',
        'page-in': 'page-in var(--duration-enter) var(--ease-out) both',
        ripple: 'ripple var(--duration-ripple) var(--ease-out) forwards',
      },
      minHeight: { touch: '44px' },
      minWidth: { touch: '44px' },
      screens: { xs: '360px' },
    },
  },
  plugins: [],
}
