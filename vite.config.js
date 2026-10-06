import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// В режиме разработки вместе с сайтом поднимается заглушка GREEN-API (scripts/mock-green-api.js),
// чтобы демо-вход работал от одной команды npm run dev. Отключить: NO_MOCK=1 npm run dev
const mockGreenApi = {
  name: 'mock-green-api',
  apply: 'serve',
  configureServer() {
    if (!process.env.NO_MOCK) import('./scripts/mock-green-api.js')
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), mockGreenApi],
})
