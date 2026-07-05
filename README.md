# Sttar Obfuscator

Lua obfuscation dashboard powered by the [Prometheus](https://github.com/levno-710/Prometheus) engine.

## Project structure (intentionally flat)

```
sttar-obfuscator/
├── server.js              # Express app: routes + static serving
├── lib/
│   └── obfuscate.js        # Wrapper that shells out to Prometheus CLI
├── scripts/
│   └── setup-prometheus.js # Auto-clones Prometheus into vendor/ on install
├── public/
│   ├── index.html           # Dashboard (all tabs live on one page)
│   ├── style.css
│   └── script.js
├── Dockerfile               # Needed because Render's Node image has no Lua
├── package.json
└── vendor/prometheus/       # Created automatically, not committed
```

That's it — no build step, no framework, no bundler.

## Running locally

You need `lua5.1` installed and on PATH as `lua`.

```bash
npm install        # also clones Prometheus into vendor/ via postinstall
node server.js
```

Visit `http://localhost:3000`.

## Deploying to Render

Render's default Node.js runtime doesn't ship Lua, so this uses **Docker**, which
Render supports natively as a "Web Service" type.

1. Push this repo to GitHub.
2. On Render: **New → Web Service** → connect the repo.
3. Runtime: **Docker** (Render auto-detects the `Dockerfile`).
4. Leave build/start commands blank — the Dockerfile handles both.
5. Set the `PORT` env var if you want something other than 3000 (Render sets this for you automatically).
6. Deploy.

The `postinstall` script clones Prometheus during `npm install` inside the Docker
build step, so nothing extra needs to be done at deploy time.

## API

See the **API Docs** tab in the dashboard itself — it documents `/api/v1/obfuscate`,
`/api/presets`, and how to generate a demo key.

## Notes

- API keys are stored in memory only (reset on restart). Swap `apiKeys` in
  `server.js` for a real database before going to production.
- Uploaded/pasted code is written to `tmp/` only for the duration of the
  obfuscation job, then deleted immediately.
