import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  root: 'src/client',
  build: {
    outDir: '../../dist',
    emptyOutDir: false,
  },
  plugins: [viteSingleFile()],
})
