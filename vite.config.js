import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              debugName: 'vendor-dependencies',
              name: (moduleId) => {
                const normalizedId = moduleId.replaceAll('\\', '/')
                if (normalizedId.includes('/node_modules/three/')) return 'vendor-three'
                if (normalizedId.includes('/node_modules/@react-three/fiber/')) return 'vendor-fiber'
                if (normalizedId.includes('/node_modules/@react-three/drei/')) return 'vendor-drei'
                return 'vendor'
              },
              test: /node_modules[\\/]/,
              maxSize: 450 * 1024,
              minSize: 20 * 1024,
            },
          ],
        },
      },
    },
  },
})
