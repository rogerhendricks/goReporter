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
    allowedHosts: ['dev.nuttynarwhal.com', 'localhost'],
    proxy: {
      '/api':{
        target: 'http://localhost:5000',
        changeOrigin: true
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
