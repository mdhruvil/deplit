Deplit aims to provide a streamlined deployment experience for static web projects, drawing inspiration from platforms like [Vercel](https://vercel.com/). Currently, Deplit focuses exclusively on static deployments, meaning it does not support server-side rendering or serverless functions (such as [Next.js API routes](https://nextjs.org/docs/api-routes/introduction)).

## Core Requirements

Deplit is designed with the following key features in mind to offer a robust and developer-friendly workflow:

- **Deployment Environments:** Distinct environments cater to different stages of development:
  - **Production:** Automatically deployed from the `main` branch, representing the live version of the application.
  - **Preview:** Generated for any other branches and pull requests, allowing for testing and review before merging to `main`.
- **Custom Domains:** (Planned Feature) Users will eventually be able to assign their own custom domains to their projects.
- **Default Subdomains:** Every project receives unique, automatically generated subdomains:
  - Production: `<project-slug>.deplit.site`
  - Preview: `<project-slug>-<commit-hash-short>.deplit.site` (Using a shortened commit hash for brevity)
- **Git Integration & CI/CD:** New deployments are triggered instantly whenever code is pushed to the linked [GitHub](https://github.com/) repository.
- **Instant Rollbacks:** The production environment supports immediate rollbacks to previous successful deployments.
- **Global Caching:** Leverages a Content Delivery Network (CDN) for worldwide caching, ensuring fast load times for end-users.

## Architectural Decisions

Key technical decisions shape how Deplit operates:

1.  **Code Building Pipeline:**
    - **On-Demand Containerized Builds:** When a deployment is triggered, a dedicated container environment is spun up using [Azure Container Apps Jobs](https://learn.microsoft.com/en-us/azure/container-apps/jobs). This ensures isolation for each build.
    - **Build Process:**
      - The system pulls the source code from the specified GitHub repository and branch/commit.
      - It utilizes the `vercel build` command, adhering to the [Vercel Build Output API v3 specification](https://vercel.com/docs/build-output-api/v3). This standard defines a predictable structure (`.vercel/output`) for build artifacts.
      - Build artifacts are processed based on their type as defined by the spec:
        - Static assets (`.vercel/output/static`) are uploaded for deployment.
        - Serverless functions (`.vercel/output/functions`) are currently ignored, aligning with the static-only support.
      - Uploaded assets are stored and versioned for deployment (see Storage).
2.  **Storage of Assets:**
    - **Centralized Storage:** [Azure Blob Storage](https://learn.microsoft.com/en-us/azure/storage/blobs/) is used to store all project artifacts.
    - **Versioning:** Each deployment's assets are stored immutably using their corresponding Git commit hash. All assets for a specific commit (`commitHash`) reside within a dedicated path: `<project-slug>/<commitHash>/`. This structure ensures that every deployment version is preserved and accessible.
3.  **CDN and Routing:**
    - **Global Distribution:** A cloudflare worker serves as the global CDN, configured with the custom route `*.deplit.site`.
    - **Metadata Storage:** Project metadata, including the mapping between project slugs and their currently active production/preview `commitHash`, is stored in the cloudflare KV. This allows for quick lookups at the edge.
    - **Routing Logic:**
      - When a request arrives (e.g., for `test-app.deplit.site/path/to/asset`), the CloudFront Function extracts the subdomain (`test-app`).
      - It queries the KV to find the currently deployed `commitHash` associated with the `test-app` project slug (distinguishing between production and preview requests based on the full hostname).
      - The worker fetches the request path to point directly to the specific versioned asset in Azure Blob Storage (e.g., `<azure-blob-storage-domain>/test-app/<commitHash>/path/to/asset`).
    - **Instant Updates/Rollbacks:** When a new deployment is successful or a rollback is initiated, the build process simply updates the relevant `commitHash` value in the cloudflare KV. Subsequent requests are immediately routed to the new version by the cf worker, achieving near-instant updates without cache invalidation delays for the routing logic itself.

## Vercel's Build Output API (v3)

Deplit leverages the [Vercel Build Output API v3](https://vercel.com/docs/build-output-api/v3) specification to understand the structure of build outputs. The key components within the generated `.vercel/output` directory are:

1.  **`static/` Directory:**
    - Contains all static assets (HTML, CSS, JavaScript, images, fonts, etc.) intended for public access.
    - Files here are uploaded to Azure Blob Storage under the corresponding `<project-slug>/<commitHash>/` path.
    - cloudflare worker serves these files directly. For example, `.vercel/output/static/images/logo.png` becomes accessible via `https://<project-slug>.deplit.site/images/logo.png`, and `.vercel/output/static/about-us/index.html` becomes accessible via `https://<project-slug>.deplit.site/about-us/`.
2.  **`functions/` Directory:**
    - Contains definitions for Serverless Functions (e.g., `.vercel/output/functions/api/data.func`).
    - **Deplit currently ignores this directory** as it only supports static deployments.
3.  **`config.json` File:**
    - Defines routing rules, headers, and other deployment configurations according to the spec.
    - Deplit parses this file to understand routing, but primarily relies on the `static/` directory structure and its own CloudFront routing for serving assets.

## Monorepo Directory Structure

The project is organized as a monorepo using [pnpm workspaces](https://pnpm.io/workspaces) and managed with [Turborepo](https://turbo.build/repo) for optimized build and task execution.

```bash
.
├── apps                 # Runnable applications/services
│   ├── api              # Main backend API
│   ├── builder          # Container image for building user code
│   ├── controlplane     # Frontend dashboard/UI
│   ├── sidecar          # Secure proxy for builder communication
│   └── spawner          # Azure Function to trigger builds
├── bruno                # API testing collection (using Bruno)
│   ├── bruno.json
│   ├── deployment
│   ├── environments
│   └── project
├── package.json         # Root package configuration
├── packages             # Shared libraries/configurations
│   ├── eslint-config    # Shared ESLint configuration
│   ├── typescript-config# Shared TypeScript configuration
│   └── ui               # Shared React UI components (using shadcn/ui)
├── pnpm-lock.yaml       # pnpm lockfile
├── pnpm-workspace.yaml  # pnpm workspace configuration
├── README.md            # Project README
└── turbo.json           # Turborepo configuration
```

### Package Details:

#### `@deplit/api`

- **Description:** The main backend API service for Deplit, handling user authentication, project management, deployment history, and interactions with other services.
- **Deployment:** Hosted on [Azure Web Apps](https://learn.microsoft.com/en-us/azure/app-service/)
- **Tech Stack:**
  - [Hono](https://hono.dev/)
  - [Drizzle ORM](https://orm.drizzle.team/)

#### `@deplit/builder`

- **Description:** A containerized application responsible for the core build process. It clones user repositories, executes the `vercel build` command, and uploads the resulting static assets to Azure Blob Storage via the sidecar.
- **Deployment:** Runs as manually triggered jobs on [Azure Container Apps Jobs](https://learn.microsoft.com/en-us/azure/container-apps/jobs). Triggered by `@deplit/spawner`.
- **Isolation:** Runs user code in an isolated environment. It does not have direct access to sensitive credentials or the main backend API.

#### `@deplit/sidecar`

- **Description:** A companion container deployed alongside the `@deplit/builder`. It acts as a secure proxy, allowing the builder to communicate with necessary external services (like Azure Blob Storage or potentially the `@deplit/api` for status updates) without exposing credentials directly to the builder environment.
- **Deployment:** Runs alongside `@deplit/builder` within the same Azure Container Apps Job instance.
- **Communication Security:**
  - Builder communicates with the sidecar over `localhost`.
  - Both containers receive a unique, shared secret token via environment variables when the job starts.
  - The builder includes this token in the `Authorization` header of requests to the sidecar.
  - The sidecar verifies this token on every incoming request, rejecting any without a valid token.
  - Crucially, the build process itself (running user code) does **not** have access to this token.

#### `@deplit/controlplane`

- **Description:** The web-based frontend dashboard where users manage their projects, view deployments, configure settings, and potentially manage custom domains in the future.
- **Deployment:** Likely deployed as a static site itself
- **Tech Stack:**
  - [Vite](https://vitejs.dev/):
  - [React](https://react.dev/):
  - [Tailwind CSS](https://tailwindcss.com/)
  - [shadcn/ui](https://ui.shadcn.com/)
  - [TanStack Router](https://tanstack.com/router/latest):

#### `@deplit/spawner`

- **Description:** An [Azure Function](https://learn.microsoft.com/en-us/azure/azure-functions/) responsible for initiating the build process. It listens for messages on a queue and triggers the creation of an Azure Container Apps Job (containing the builder and sidecar).
- **Trigger:** Uses an [Azure Storage Queue](https://learn.microsoft.com/en-us/azure/storage/queues/) trigger. The `@deplit/api` service places a message onto this queue when a new build needs to be started (e.g., due the new commits pushed to the repo)
