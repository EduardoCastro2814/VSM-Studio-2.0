import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Detect production / GitHub Actions environments to set base path automatically
const isProdBuild = process.env.NODE_ENV === 'production' || process.env.GITHUB_ACTIONS === 'true';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: isProdBuild ? '/vsm-studio/' : '/',
})
