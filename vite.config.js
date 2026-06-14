import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'login.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        vault: resolve(__dirname, 'vault.html'),
        authenticator: resolve(__dirname, 'authenticator.html'),
        paste: resolve(__dirname, 'paste.html'),
        share: resolve(__dirname, 'share.html'),
        settings: resolve(__dirname, 'settings.html'),
      },
    },
  },
})
