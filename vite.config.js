import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,        // Expose on LAN (0.0.0.0) — needed for phone testing
    port: 5173,
    strictPort: false,
  }
})
