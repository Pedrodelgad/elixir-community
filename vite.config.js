import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Resolve o pacote npm "buffer" para a @solana/web3.js (usado só no checkout crypto).
  // NÃO usar define:{global} aqui — quebra o render do Three.js (logo 3D).
  resolve: { alias: { buffer: 'buffer' } },
  optimizeDeps: { include: ['buffer'] },
  server: {
    historyApiFallback: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: 'localhost',
      },
      // arquivos das ferramentas (download) servidos pelo backend
      '/uploads': { target: 'http://localhost:3001', changeOrigin: true, secure: false },
    },
  },
})
