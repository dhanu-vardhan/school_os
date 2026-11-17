/** @type {import('tailwindcss').Config} */
import preset from '../../packages/ui/src/tailwind-preset.js'

export default {
  presets: [preset],
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
}
