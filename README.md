# Kergit Admin Client

Experimental Nuxt operator dashboard for Kergit metrics and control-plane views.
It is not a polished public product UI and must not be exposed directly to the
public internet.

The dashboard reads the root backend's control-plane metrics through
`/admin-api` and LiveKit metrics through `/admin-livekit-metrics`. Keep these
routes and the dashboard behind trusted local or private-network access.

## Environment

Configure the repo-root `.env`. The main variables are:

- `NUXT_ADMIN_APP_BASE_URL`
- `NUXT_PUBLIC_ADMIN_METRICS_BASE`
- `NUXT_PUBLIC_ADMIN_LIVEKIT_METRICS_BASE`
- `ADMIN_METRICS_PROXY_TARGET`
- `ADMIN_LIVEKIT_PROXY_HOST`
- `LIVEKIT_NODES`

The full stack normally supplies these values from the repo-root `.env`.

## Development

From the repo root:

```bash
./clients/admin/docker/run-app.sh --detached
```

For direct development from `clients/admin/`, configure the repo-root `.env`, then run:

```bash
pnpm install
./run_nuxt_dev.sh
```

There is currently no automated test script. Validate changes with:

```bash
pnpm build
```

The direct development server binds to loopback port `3001`. The full stack
serves the dashboard at `${WEB_DOMAIN}/admin/`.

## Known Limitations

- Access control is provided by the surrounding trusted-network/Caddy setup, not
  by a polished dashboard authentication flow.
- Metrics views and operator workflows are experimental.
