import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',   // ← APK化で必須。これがないと真っ白になる
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})