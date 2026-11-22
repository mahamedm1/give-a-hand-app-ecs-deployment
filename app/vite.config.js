import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  server: {
    // Fixed port: Supabase's Site URL / redirect URLs point at localhost:5173,
    // and a changing port logs you out and confuses the browser's cache.
    port: 5173,
    strictPort: true,
  },
})
