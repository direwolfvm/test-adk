import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Dev proxy to avoid CORS when calling the remote ADK agent from the browser.
    // Requests to /agent will be forwarded to the remote host during `npm run dev`.
    proxy: {
      '/agent': {
        target: 'https://permitting-adk-650621702399.us-east4.run.app',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
