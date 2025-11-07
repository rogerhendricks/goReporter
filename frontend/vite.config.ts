import path from "path"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  },
  server: {
    port: 8000,
    strictPort:false,
		host: '0.0.0.0',
    allowedHosts: ['dev.nuttynarwhal.com', 'dev-mini.nuttynarwhal.com','localhost'],
    proxy: {
      '/api':{
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '/n8n-webhook': {
        target: 'https://n8n.nuttynarwhal.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) =>
          path.replace(
            /^\/n8n-webhook/,
            '/webhook-test/64f46eaa-c284-4eea-a6e1-50030248ce18'
          ),
      },
      // '/uploads': {
      //   target: 'http://localhost:5000',
      //   changeOrigin: true
      // }
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
