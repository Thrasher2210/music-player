<div align="center">

<br/>
<br/>

<img src="logo/icon.svg" alt="GaneGan app icon" width="140" />

# GaneGan

### Ad-Free Web-First YouTube Music Client

<br/>

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge&labelColor=0d1117)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6.svg?style=for-the-badge&labelColor=0d1117)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg?style=for-the-badge&labelColor=0d1117)](https://nextjs.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5-black.svg?style=for-the-badge&labelColor=0d1117)](https://fastify.dev/)
[![Package Manager](https://img.shields.io/badge/pnpm-10-f69220.svg?style=for-the-badge&labelColor=0d1117)](https://pnpm.io/)

<br/>

[**Features**](#features) · [**Architecture**](#architecture) · [**Quick Start**](#quick-start) · [**Browser Extension**](#browser-extension) · [**Contributing**](#contributing) · [**Disclaimer**](#disclaimer) · [**License**](#license)

</div>

> [!IMPORTANT]
> GaneGan is an independent, clean-room music streaming client. It is not affiliated with, endorsed by, or connected to YouTube or Google LLC in any way. Media streams are delivered directly to the client browser without intermediary server storage or proxying.

---

<div align="center">

<h1><a id="features"></a>Features</h1>

<table>
  <tr>
    <td width="50%" valign="top">

#### Playback & Streaming Engine
- **Direct Client-to-CDN Streaming** — Audio byte ranges stream straight from `googlevideo.com` directly to the client browser via Shaka MSE, ensuring zero audio egress or server bottlenecks.
- **Ad-Free Playback** — Play, search, and browse the YouTube Music catalog without commercial ad pipelines.
- **Client Fallback Walk** — Robust InnerTube client resolution cycling through VISIONOS, WEB_REMIX, WEB, and MWEB endpoints.
- **DASH Audio Delivery** — Direct Opus (itag 251) and AAC (itag 140) playback with in-memory MPD generation.
- **Zero-Install Web Trial** — Immediate search and streaming out of the box with zero required plugins; companion extension prompted only for personalized library sync.

#### Design System & UX
- **Dying Design System (`@mp/dying`)** — Custom tokenized dark design system engineered specifically for high-contrast OLED media streaming.
- **Desktop 3-Panel Layout** — Ergonomic Spotify-grade navigation paired with Apple Music luxury aesthetics.
- **Accessible & Responsive** — Strict WCAG 2.2 AA contrast compliance, Radix focus management, and fluid mobile drawer navigation.
- **Synchronized Lyrics** — High-precision time-aligned lyric display integrated with LRCLIB multi-provider resolution.

    </td>
    <td width="50%" valign="top">

#### Cloud Library & Personal Data
- **Centralized Authentication** — Robust account management via Better Auth supporting email/password and Google OAuth.
- **Cloud Library Sync** — Persistent playlists, liked tracks, and full listening history backed by PostgreSQL and Drizzle ORM.
- **Guest-to-User Migration** — Seamless automatic transfer of local guest history and likes upon sign-in.
- **Spotify Library Import** — Asynchronous playlist migration powered by BullMQ queues and Redis workers.

#### Extension & Connectivity
- **WXT MV3 Companion Bridge** — Lightweight browser extension providing transparent CORS/DNR header handling.
- **YouTube Session Authentication** — Automatic SAPISIDHASH signing using existing browser cookies for personal YouTube Music library sync.
- **Media Session API** — Native OS media controls, lock screen metadata, playback states, and track scrubbing.
- **Full Monorepo TypeScript Contracts** — End-to-end typed API communication between frontend, backend, and extension using Zod contracts.

    </td>
  </tr>
</table>

</div>

---

<div align="center">

<h1><a id="architecture"></a>Architecture</h1>

</div>

GaneGan is structured as a pnpm monorepo separating framework-agnostic audio playback, UI design primitives, web application layers, and backend services:

| Package | Path | Description |
|---|---|---|
| `@mp/web` | `frontend/app` | Next.js 15 App Router web client and user interface |
| `@mp/extension` | `frontend/extension` | WXT Manifest V3 browser extension for YouTube session bridging and DNR header rules |
| `@mp/dying` | `packages/dying` | Tokenized dark design system, layout primitives, and UI components |
| `@mp/player-core` | `packages/player-core` | Headless playback engine, InnerTube client, and Shaka MSE audio driver |
| `@mp/api` | `backend/api` | Fastify REST API, Better Auth authentication, and user data routes |
| `@mp/worker` | `backend/worker` | BullMQ background worker for Spotify import and asynchronous jobs |
| `@mp/db` | `backend/db` | PostgreSQL database schemas, connection pooling, and Drizzle migrations |
| `@mp/api-contract` | `backend/shared` | Shared Zod schemas and request/response TypeScript contracts |

---

<div align="center">

<h1><a id="quick-start"></a>Quick Start</h1>

</div>

### Prerequisites

- Node.js >= 22
- pnpm 10 (`corepack enable`)
- Docker & Docker Compose (for PostgreSQL and Redis)

### 1. Clone & Install Dependencies

```bash
git clone git@github.com:anshul-dying/music-player.git
cd music-player
corepack enable
pnpm install
```

### 2. Configure Environment

Copy the example configuration to `.env.local` in the project root:

```bash
cp .env.example .env.local
```

### 3. Start Database Infrastructure

Launch the PostgreSQL and Redis containers:

```bash
pnpm db:up
pnpm db:migrate
```

### 4. Run Development Servers

Run the web frontend and backend services concurrently:

```bash
# Terminal 1: Web Frontend (http://localhost:3000)
pnpm dev:web

# Terminal 2: API Service (http://localhost:4000)
pnpm dev:api

# Terminal 3: Background Worker
pnpm dev:worker
```

### Verification & Quality Gates

Run the automated test suite, typechecking, and architecture compliance checks:

```bash
pnpm typecheck
pnpm test
pnpm check:lines
pnpm build
```

---

<div align="center">

<h1><a id="browser-extension"></a>Browser Extension</h1>

</div>

The optional GaneGan Companion Extension enables full YouTube Music account synchronization, private playlist playback, and transparent CORS handling via Manifest V3 Declarative Net Request (DNR).

### Running Extension in Development

```bash
pnpm dev:ext
```

Load the resulting build from `frontend/extension/.output/chrome-mv3` into your browser:
1. Navigate to `chrome://extensions` in Chromium (or `about:debugging` in Firefox).
2. Enable **Developer mode**.
3. Select **Load unpacked** and choose the output directory.

### Packaging Extension

To produce a production zip archive:

```bash
pnpm package:ext
```

The compiled archive will be placed in `frontend/app/public/downloads/ganegan-extension.zip`.

---

<div align="center">

<h1><a id="contributing"></a>Contributing</h1>

</div>

Contributions are welcome. Before opening a pull request, ensure your code adheres to project standards:

- **UI Standards**: All user interface elements must use `@mp/dying` components and tokens. Raw HTML inputs/buttons and arbitrary utility styles are prohibited.
- **File Length Enforcement**: All source files (`.ts`, `.tsx`, `.js`, `.css`) must remain strictly within the 300-line ceiling enforced by `pnpm check:lines`.
- **Validation**: Ensure `pnpm typecheck`, `pnpm test`, and `pnpm build` pass cleanly without warnings or errors.

---

<div align="center">

<h1><a id="disclaimer"></a>Disclaimer & Legal Notice</h1>

</div>

GaneGan is an independent, community-developed client application and is **not** affiliated with, endorsed by, or associated with Google LLC, YouTube, YouTube Music, or Spotify.

- **No Media Hosting**: GaneGan does not host, cache, duplicate, or distribute copyrighted media files. All playback streams are resolved directly between the user's browser client and upstream media endpoints.
- **Fair Use & API Research**: This software is developed solely for educational, research, and interoperability purposes. Users remain responsible for compliance with applicable local copyright legislation and platform terms of service.
- **Clean-Room Engineering**: This codebase is implemented from scratch with independent modular architecture and does not incorporate proprietary or viral third-party codebases.

---

<div align="center">

<h1><a id="license"></a>License</h1>

This project is open-source software licensed under the **[MIT License](https://opensource.org/licenses/MIT)**.

</div>
