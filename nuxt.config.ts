import { parseLivekitNodeDescriptors } from './utils/livekitNodes.mjs'

const livekitNodes = parseLivekitNodeDescriptors(process.env.LIVEKIT_NODES)

const metricsPrefix = (process.env.NUXT_PUBLIC_ADMIN_METRICS_BASE || '/admin-api').replace(/\/$/, '')
const livekitMetricsPrefix =
  (process.env.NUXT_PUBLIC_ADMIN_LIVEKIT_METRICS_BASE || '/admin-livekit-metrics').replace(
    /\/$/,
    ''
  )

const metricsProxyTarget = process.env.ADMIN_METRICS_PROXY_TARGET || 'http://host.docker.internal:8081'
const livekitProxyHost = process.env.ADMIN_LIVEKIT_PROXY_HOST || 'host.docker.internal'

const livekitProxy: Record<string, any> = {
  [metricsPrefix]: {
    target: metricsProxyTarget,
    changeOrigin: true,
    rewrite: (path: string) =>
      path.startsWith(metricsPrefix) ? path.replace(metricsPrefix, '') : path,
  },
}

livekitNodes.forEach((node) => {
  const routePrefix = `${livekitMetricsPrefix}/${node.id}`
  livekitProxy[routePrefix] = {
    target: `http://${livekitProxyHost}:${node.prometheusPort}`,
    changeOrigin: true,
    rewrite: (_path: string) => '/metrics',
  }
})

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,

  srcDir: '.',
  pages: true,

  modules: ['@pinia/nuxt'],

  devServer: {
    host: '0.0.0.0',
    port: 3001,
  },

  runtimeConfig: {
    public: {
      livekitNodes,
      adminMetricsBase: process.env.NUXT_PUBLIC_ADMIN_METRICS_BASE ?? '/admin-api',
      adminLivekitMetricsBase:
        process.env.NUXT_PUBLIC_ADMIN_LIVEKIT_METRICS_BASE ?? '/admin-livekit-metrics',
    },
  },

  vite: {
    server: {
      host: true,
      proxy: livekitProxy,
    },
  },

  app: {
    baseURL: process.env.NUXT_ADMIN_APP_BASE_URL ?? '/admin/',
    head: {
      title: 'Kergit Admin',
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
    },
  },
})
