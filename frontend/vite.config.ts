import path from "path"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(), 
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5 // 5 minutes
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      manifest: {
        name: 'GoReporter',
        short_name: 'GoReporter',
        description: 'Medical Reporting System',
        theme_color: '#ffffff',
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React & Router
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          
          // UI Libraries (Radix UI components)
          'ui-vendor': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-hover-card',
            '@radix-ui/react-label',
            '@radix-ui/react-popover',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs'
          ],
          
          // PDF Libraries (heavy dependencies)
          'pdf-vendor': [
            '@react-pdf/renderer',
            'pdf-lib',
            'pdfjs-dist'
          ],
          
          // Charts
          'chart-vendor': [
            'chart.js',
            'react-chartjs-2'
          ],
          
          // Utilities
          'utils-vendor': [
            'axios',
            'date-fns',
            'zod',
            'zustand',
            'clsx',
            'tailwind-merge',
            'class-variance-authority'
          ],
          
          // XML/Excel parsing
          'data-vendor': [
            'fast-xml-parser',
            'xlsx'
          ],
          
          // DnD and other UI utilities
          'dnd-vendor': [
            '@dnd-kit/core',
            '@dnd-kit/sortable',
            '@dnd-kit/utilities'
          ]
        }
      }
    }
  },
  server: {
    port: 8000,
    strictPort:false,
		host: '0.0.0.0',
    allowedHosts: ['dev.nuttynarwhal.com', 'dev-mini.nuttynarwhal.com','localhost'],
    proxy: {
      '/api':{
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true
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
