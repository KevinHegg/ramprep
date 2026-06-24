import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'

const commitHash =
  process.env.VITE_APP_COMMIT ??
  (() => {
    try {
      return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
    } catch {
      return 'dev'
    }
  })()

// https://vite.dev/config/
export default defineConfig({
  base: '/ramprep/',
  define: {
    __APP_BUILD_DATE__: JSON.stringify(new Date().toISOString()),
    __APP_COMMIT__: JSON.stringify(commitHash),
  },
  plugins: [react()],
})
