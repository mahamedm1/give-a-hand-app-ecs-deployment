import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// Answers GET /health with {"status":"ok"} in `npm run dev` and `npm run preview`
const healthCheck = () => {
  const handler = (req, res) => {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ status: 'ok' }))
  }
  return {
    name: 'health-check',
    configureServer(server) { server.middlewares.use('/health', handler) },
    configurePreviewServer(server) { server.middlewares.use('/health', handler) },
  }
}

export default defineConfig({
  plugins: [react(), healthCheck()],
  server: {
    // Fixed port: Supabase's Site URL / redirect URLs point at localhost:5173,
    // and a changing port logs you out and confuses the browser's cache.
    port: 5173,
    strictPort: true,
  },
})
