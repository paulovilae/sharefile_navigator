import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': `http://localhost:${process.env.VITE_BACKEND_PORT || 8000}`
    }
  },
  optimizeDeps: {
    include: ['@mui/material/styles', '@emotion/styled'],
  }
})
