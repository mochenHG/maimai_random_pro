import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// @ts-expect-error Plain JS server helper is shared with the production launcher.
import { attachSync } from './sync.mjs'
// @ts-expect-error Shared plain JS HTTP handler.
import { handleMusic } from './music.mjs'
function services(server: {httpServer: Parameters<typeof attachSync>[0]; middlewares: {use: (handler: (...args: any[]) => void) => void}}) {
  if(server.httpServer) attachSync(server.httpServer)
  server.middlewares.use((req, res, next) => { void handleMusic(req, res).then((handled: boolean) => {if(!handled) next()}).catch(next) })
}
export default defineConfig({ plugins: [react(), { name: 'local-services', configureServer: services, configurePreviewServer: services }], server: { port: 5174, strictPort: true }, preview: {port:5174, strictPort:true}, build: { sourcemap: false }, worker: { format: 'es' } })
