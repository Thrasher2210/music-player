# GaneGan — Architecture & Delivery Plan

> **GaneGan**: A web-first, ad-free YouTube Music client powered by the **dying** design system.
> Clean-room implementation (no code copied from BitChord — independent architecture designed to compete and win).
> Monorepo core built to power Web first, Electron desktop next, and Phone app later.

---

## 1. Product Summary & Competitive Posture

| | |
|---|---|
| **What** | Next.js 15 web client that searches, browses, and streams the YouTube Music catalog ad-free with Apple Music–grade aesthetics, personal cloud library (Better Auth), and Spotify playlist import. |
| **Design System** | **dying** (`@mp/dying`): Dedicated luxury dark design system (just like Fluent 2 or Carbon, but built for dark OLED music streaming). |
| **Competitive Wedge vs BitChord** | **Zero-install instant web trial:** Users search and stream immediately on web with zero setup (fallback metadata proxy). No forced extension install to listen. Extension prompted only for YouTube account sync / personal library. |
| **Cross-Platform Roadmap** | **Web (Next.js)** → **Electron (Desktop)** → **Mobile (Phone App)**, sharing `@mp/player-core` and `@mp/dying`. |
| **North Star UX** | Spotify 3-panel scannable ergonomics + Apple Music luxury materials via the **dying** design system. |

### Why "no fork" matters (legal & architectural posture)
- BitChord is **GPLv3** — copying its code forces GPLv3 viral licensing.
- We implement clean-room from scratch using only **MIT/Apache libraries** and documented InnerTube endpoints.
- We maintain a written disclaimer (not affiliated with YouTube/Google; no media hosting; users responsible for local law) and **never proxy or store audio on our servers**.

---

## 2. Core Technical Architecture: Streaming Engine

### Chosen: **Client-side streaming with pluggable adapters**

Audio never touches our servers. The client talks to YouTube's InnerTube API directly and fetches audio segments straight from `googlevideo.com`.

```
┌─────────────────────────── CLIENT ENVIRONMENT ──────────────────────────┐
│                                                                         │
│  Next.js Web / Electron / Mobile App                                    │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  @mp/player-core (Framework-Free TypeScript)                      │  │
│  │  ├─ InnerTube Client (Custom lightweight, zero-dependency)        │  │
│  │  ├─ Client Walk (VISIONOS → WEB_REMIX → WEB → MWEB)                │  │
│  │  ├─ Verdict Cache (10-min benching, localStorage + in-memory)     │  │
│  │  ├─ StreamProvider (Direct-URL DASH primary; SABR stubbed)        │  │
│  │  ├─ NetworkAdapter (Pluggable: Ext Bridge / Dev Proxy / Native)   │  │
│  │  └─ AudioDriver (Pluggable: Shaka MSE Web/Desktop / Native Audio) │  │
│  └─────────────────────────────────┬─────────────────────────────────┘  │
│                                    │                                    │
│       ┌────────────────────────────┴────────────────────────────┐       │
│       ▼ (Web with Extension)                                    ▼       │
│  WXT MV3 Extension (frontend/extension/)           Native / Dev-Proxy   │
│  ├─ SAPISIDHASH signer                             ├─ Electron/Mobile   │
│  ├─ Account cookies (include)                      │  direct native HTTP│
│  └─ DNR: Origin / Referer / CORS bypass            └─ Web fallback dev  │
└───────────────────────┬──────────────────────────────────┬──────────────┘
                        │ tiny JSON (InnerTube)            │
                        ▼                                  ▼
              youtube.com/youtubei               music.youtube.com
                        │
                        │ direct audio URLs (Opus itag 251 / AAC itag 140)
                        ▼
              googlevideo.com ──▶ byte-range audio ──▶ Shaka MSE ──▶ user's ears
                                                       (no ad pipeline ever loads)

┌──────────────── OUR BACKEND (stateless, lightweight, cheap) ────────────┐
│  Fastify API + BullMQ Worker (backend/)                                 │
│  ├─ Accounts (Better Auth: email/password, Google OAuth), Postgres      │
│  ├─ Playlists, likes, play history sync                                 │
│  ├─ Spotify OAuth + import jobs (BullMQ + Redis)                        │
│  ├─ Lyrics proxy (LRCLIB multi-provider, Redis cached)                  │
│  └─ Metadata dev-proxy (fallback when web user has no extension)        │
└─────────────────────────────────────────────────────────────────────────┘
```

### Pluggable Core Interfaces (`@mp/player-core`)

1. **`NetworkAdapter`**:
   - `WebExtensionAdapter`: Talks to WXT extension via `window.postMessage` bridge with DNR headers.
   - `DevProxyAdapter`: Routes metadata through Next.js dev proxy (`/api/yt/*`) for zero-install instant play and headless tests.
   - `NativeHttpAdapter`: Direct `fetch` without CORS restrictions (used in Electron and Mobile apps).
2. **`AudioDriver`**:
   - `ShakaMseAudioDriver`: Headless Shaka Player with in-memory DASH MPD (Opus itag 251, AAC itag 140) via MediaSource Extensions (MSE) for Web and Electron. Prevents the 70s googlevideo throttling stall.
   - `NativeAudioDriver`: Pluggable sink for background audio on Mobile (e.g. `react-native-track-player`).
3. **InnerTube Client**:
   - Lightweight custom TypeScript client (zero Node polyfills, tiny bundle).
   - Typed payload contexts: `VISIONOS` (`clientName: 99`, `clientVersion: '1.0'`), `WEB_REMIX`, `WEB`, `MWEB`.
4. **Client-Walk & Verdict Cache**:
   - Priority: `VISIONOS → WEB_REMIX → WEB → MWEB` (max 3 per track).
   - If a client returns `playabilityStatus !== 'OK'` or unplayable stream data, it is benched for 10 minutes in memory and `localStorage`.
5. **StreamProvider**:
   - Direct-URL DASH path (VISIONOS) is primary.
   - Clean pluggable interface for SABR and PO-token generation stubbed for modular extension when needed.

---

## 3. The `dying` Design System (`@mp/dying`)

**dying** is our dedicated design system package living in `packages/dying`, tailored for luxury OLED dark music experiences.

```
┌────────────────────────────────────────────────────────────────────────┐
│  SPOTIFY UX (Skeleton & Density)  +  APPLE MUSIC (Skin & Materials)   │
│  ├─ 3-panel layout (Library/Feed/Queue)├─ Deep OLED black (#000000)   │
│  ├─ Compact dense track rows          ├─ Frosted glass (backdrop-blur) │
│  ├─ Bottom persistent player bar      ├─ Dynamic ambient artwork glow  │
│  └─ Instant muscle memory             └─ Fluid spring motion & lyrics  │
└────────────────────────────────────────────────────────────────────────┘
```

### Signature Primitives in `dying`
1. **Material Primitives**:
   - `<OledBase>`: Pure pitch-black canvas foundation (`#000000`).
   - `<GlassPanel>` / `<GlassCard>`: Frosted translucent acrylic (`bg-white/[0.03]`, `backdrop-blur-2xl`, `border-white/[0.08]`).
   - `<AmbientAura>`: Dynamic multi-layer blurred canvas backdrop (`blur-[120px]`) shifting colors extracted from current album art.
2. **Audio & Control Primitives**:
   - `<ScrubSlider>`: Accessible Radix-powered audio scrub bar and volume slider with fluid hover preview.
   - `<SpringButton>`: Tactile spring button with physical scale morph (`whileTap={{ scale: 0.94 }}`) and play/pause icon morph.
3. **Music Presentation Primitives**:
   - `<TrackRow>`: High-density scannable row with live animated soundwave indicator, title, artist, duration, and context menu.
   - `<SyncedLyricsView>`: Full-height lyrics view; active singing line expands with soft white-neon glow; inactive lines dim to 35%; instant click-to-seek.
4. **Layout**:
   - Spotify 3-Panel Layout: Left Library (260px), Center Workspace (scannable tracks/browse), Bottom Floating Glass Player Bar (88px), Right Expandable Drawer (Queue / Lyrics).
5. **Showcase / Playground**:
   - Web app includes a dedicated live playground at `/dying` (or `/design`) showcasing all components, elevations, glass filters, and aura presets in isolation.

---

## 4. Repository Layout

```
music-player/
├── packages/
│   ├── dying/                    # 💀 @mp/dying — Dedicated luxury dark design system
│   │   ├── src/
│   │   │   ├── tokens/           # OLED black, glass opacities, spring curves, typography
│   │   │   ├── primitives/       # GlassPanel, ScrubSlider, SpringButton
│   │   │   ├── effects/          # AmbientAura, soundwave visualizer
│   │   │   └── music/            # TrackRow, SyncedLyricsView, PlayerBar
│   │   └── theme.css             # Tailwind v4 @theme tokens & CSS custom properties
│   └── player-core/              # 🎵 @mp/player-core — Framework-free streaming engine
│       ├── src/
│       │   ├── innertube/        # Lightweight InnerTube client, parsers, contexts
│       │   ├── walk/             # Client-walk & verdict cache
│       │   ├── manifest/         # In-memory DASH MPD generator
│       │   ├── adapters/         # NetworkAdapter (ext bridge, dev proxy, native)
│       │   ├── drivers/          # AudioDriver (Shaka MSE driver)
│       │   └── engine/           # PlayerEngine event-emitter facade
│       └── tests/                # Vitest parser fixtures + byte-range checker
├── frontend/
│   ├── app/                      # Next.js 15 (@mp/web) — consumes @mp/dying & @mp/player-core
│   │   └── src/
│   │       ├── app/              # Routes (/ Player, /dying Showcase, /debug)
│   │       ├── stores/           # Zustand store (usePlayerStore)
│   │       └── bridge/           # Extension ↔ page communication bridge
│   └── extension/                # WXT MV3 extension (@mp/extension)
│       └── src/
│           ├── entrypoints/      # Background DNR rules, content script
│           └── signer/           # SAPISIDHASH signer
├── backend/
│   ├── api/                      # Fastify REST + Better Auth (@mp/api)
│   ├── worker/                   # BullMQ jobs — Spotify import (@mp/worker)
│   ├── db/                       # Drizzle schema + migrations (@mp/db)
│   └── shared/                   # Zod API contract schemas (@mp/api-contract)
├── HOSTING.md                    # $0 tier hosting & AWS cloud migration guide
├── start.sh                      # One-command local development runner
└── PLAN.md
```

---

## 5. Local Development & Production Environments

### Local Development (Host-native, Zero Docker)
- **Postgres**: Native host PostgreSQL running on `localhost:5432`, database `musicplayer`, user `postgres`.
- **Redis**: Native host Redis running on `localhost:6379`.
- **Startup**: Single command `./start.sh` starts DB migration + API (:4000) + Web (:3000) with clean Ctrl+C shutdown.

### Production Deployment ($0 MVP Tier)
- **Web**: Vercel Hobby (unlimited static/SSR, 100 GB bandwidth).
- **API**: Render Free / Fly.io shared VM (cron-job.org pings `/healthz` every 10 min to stop sleep).
- **Postgres**: Neon Free (0.5 GB serverless).
- **Redis**: Upstash Free (10k commands/day).
- **Extension**: GitHub Releases (unpacked zips) + Chrome Web Store submission.
- **AWS Migration**: Documented in `HOSTING.md` — swap env URLs to RDS/ElastiCache/ECS Fargate with zero code rewrites.

---

## 6. Delivery Plan

### Phase 0 — Foundations (DONE ✅)
- Monorepo scaffold (`pnpm-workspace.yaml`).
- Native host Postgres (`musicplayer`) + host Redis configured and verified.
- Drizzle migrations applied cleanly.
- Fastify API with Better Auth + BullMQ worker booting with local env.
- Next.js 15 app + WXT extension initialized and typechecking.

### Phase 1 — Playback Core & Streaming Engine (CURRENT ⏳)
- Scaffold `packages/player-core` (`@mp/player-core`).
- Custom lightweight InnerTube client (`/player` and `/search`).
- Client-walk (`VISIONOS → WEB_REMIX → WEB → MWEB`) + 10-minute verdict cache.
- In-memory DASH MPD generator + Shaka Player MSE `AudioDriver`.
- Pluggable `NetworkAdapter` (extension DNR bridge + Next.js dev proxy `/api/yt/*`).
- Dual-tier testing: Vitest unit tests against recorded fixtures + Node byte-range checker.
- Proof UI on `/`: search box, track list, play/pause, seek scrubber, volume, and real-time diagnostics inspector (active client, itag, buffer status).
- **Gate:** ≥ 95% of a 100-track test set plays smoothly past 60s without stalls.

### Phase 2 — `dying` Design System & App Shell (weeks 5–6)
- Scaffold `packages/dying` with tokens and signature primitives (`<OledBase>`, `<GlassPanel>`, `<AmbientAura>`, `<ScrubSlider>`, `<SpringButton>`, `<TrackRow>`, `<SyncedLyricsView>`).
- Implement live showcase route at `/dying` in Next.js to demo components in isolation.
- Assemble Spotify 3-panel layout in the web app.
- Full-screen now-playing view with Apple-grade animated synced lyrics.
- MediaSession API integration (OS media keys, lockscreen controls, album art).
- Browse sections: trending songs, top albums, artist discographies.
- **Gate:** Anonymous browsing and playback feels buttery smooth; Lighthouse score ≥ 90.

### Phase 3 — Extension & YouTube Sign-in (weeks 7–8)
- WXT extension: SAPISIDHASH signer, YouTube account cookie bridge, DNR rules.
- Direct Chromium port bridge + Firefox content script relay.
- Signed-in features: personal YouTube Music library (liked songs, playlists, history), like/unlike toggle, add-to-playlist.
- Transparent age-gated track fallback (anonymous fails → retry with signed-in session).
- **Gate:** User's real YouTube Music library appears in the web player; likes sync back to YouTube.

### Phase 4 — Better Auth & Spotify Playlist Import (weeks 9–10)
- Better Auth accounts: email/password + Google OAuth, session sync across devices.
- Cloud playlists & likes stored in PostgreSQL, offline-first sync queue in Zustand.
- Spotify OAuth (PKCE) + BullMQ worker import:
  - Fetches Spotify playlists/liked tracks.
  - Fuzzy-matches Spotify metadata to YouTube `videoId` (title, artist, duration scoring).
  - Real-time progress via SSE + detailed import report (matched / ambiguous / missing).
- **Gate:** 200-song Spotify playlist imports with ≥ 85% match accuracy and plays immediately.

### Phase 5 — Polish, Synced Lyrics & Launch (weeks 11–12)
- Line-by-line animated synced lyrics (LRCLIB provider via backend cache).
- PWA manifest + service worker for web installability.
- Legal disclaimers, privacy policy, and responsive takedown posture.
- Production deployment on Vercel + Fly/Render.
- **Gate:** Production launch: users search, listen ad-free without install, or connect YT/Spotify with zero friction.

### Phase 6+ — Cross-Platform Expansion (Post-MVP)
- **Electron Desktop App**: Wraps `@mp/player-core` + `@mp/dying` with native HTTP (no extension needed), OS global shortcuts, system tray, and discord presence.
- **Mobile Phone App**: Wraps `@mp/player-core` + `@mp/dying` with native background audio driver (`NativeAudioDriver`), lock screen controls, and offline caching.
- **Listen Together**: Low-latency WebSocket room playback synchronization.
