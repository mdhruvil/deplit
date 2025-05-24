# Deplit

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/mdhruvil/deplit)

Deplit is my attempt to create Vercel from scratch. I have been using Vercel and Cloudflare Pages to host my sites. So one day I thought _How does this actually works ?_ Then I started to research about this topic and created this topic.

The blog [Behind the scenes of Vercel's infrastructure](https://vercel.com/blog/behind-the-scenes-of-vercels-infrastructure) was very helpful in understaing how vercel actually works under the hood.

## 🌟 Features

- ⚡ **Instant Rollback** - One-click rollback to previous deployments
- 📦 **Preview Deployments** - Preview your deployments before production.
- 🌐 **Global CDN** - Serve your site from nearest to your users
- 🚀 **Instant Automatic Deployments** - Push to GitHub, get instant deployments
- 🔗 **Subdomains** - Free `.deplit.tech` subdomains for all projects
- 📊 **Build Logs** - Real-time build monitoring and detailed logs
- 💻️ **Serverless Function** _(Soon)_ - Deploy your SSR or ISR apps to deplit

## 📦️ Project Structure

```bash
.
├── apps
│   ├── api                # main backend api
│   ├── builder            # container image for building user code
│   ├── controlplane       # dashboard
│   ├── proxy              # cf worker that works as proxy for *.deplit.tech/*
│   └── sidecar            # Secure proxy for builder communication
├── bruno
├── LICENSE
├── package.json
├── packages               # shared packages
│   ├── eslint-config
│   ├── typescript-config
│   └── ui
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── README.md
└── turbo.json
```

## 🏗️ Infrastructure

- Cloudflare Workers (proxy, api)
- Cloudflare Cache layer (proxy)
- Cloudflare D1 (database)
- Cloudflare KV (kv store for metadata)
- Azure Container App Jobs (build container and sidecar)
- Azure Blob Storage (for storing build assets)
- GitHub Packages (for publishing builder, sidecar images)

## 💻️ Local Setup

TODO

## 🧑‍💻 Contributing

TODO

## 📄 License

[MIT](./LICENSE)
