import { pgTable, text, timestamp, integer, jsonb, uuid, boolean, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ---- Better Auth managed tables (schema from better-auth/adapters/drizzle) ----
// Generated to match Better Auth v1.3 core requirements.

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---- Our tables ----

export const tracks = pgTable(
  "tracks",
  {
    videoId: text("video_id").primaryKey(),
    title: text("title").notNull(),
    artist: text("artist").notNull(),
    album: text("album"),
    albumArt: text("album_art"),
    durationSec: integer("duration_sec").notNull().default(0),
    preferredItag: integer("preferred_itag").default(251),
    playCount: integer("play_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("tracks_artist_idx").on(t.artist),
    index("tracks_play_count_idx").on(t.playCount),
  ],
);

export const lyrics = pgTable(
  "lyrics",
  {
    videoId: text("video_id").primaryKey(),
    plainLyrics: text("plain_lyrics"),
    syncedLyrics: jsonb("synced_lyrics"), // [{ time: number, text: string }]
    source: text("source").notNull(), // 'lrclib' | 'innertube'
    synced: boolean("synced").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const spotifyTokens = pgTable(
  "spotify_tokens",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    accessTokenEnc: text("access_token_enc").notNull(),
    refreshTokenEnc: text("refresh_token_enc").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    scope: text("scope"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const playlists = pgTable(
  "playlists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    coverArt: text("cover_art"),
    isPublic: boolean("is_public").notNull().default(false),
    isPinned: boolean("is_pinned").notNull().default(false),
    source: text("source", { enum: ["local", "spotify", "youtube"] })
      .notNull()
      .default("local"),
    ytPlaylistId: text("yt_playlist_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("playlists_user_idx").on(t.userId),
    index("playlists_pinned_idx").on(t.userId, t.isPinned),
  ],
);

export const playlistTracks = pgTable(
  "playlist_tracks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    playlistId: uuid("playlist_id")
      .notNull()
      .references(() => playlists.id, { onDelete: "cascade" }),
    videoId: text("video_id").notNull(),
    title: text("title").notNull(),
    artist: text("artist").notNull(),
    albumArt: text("album_art"),
    durationMs: integer("duration_ms").notNull().default(0),
    position: integer("position").notNull(),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("playlist_tracks_playlist_idx").on(t.playlistId, t.position),
    uniqueIndex("playlist_tracks_unique_pos").on(t.playlistId, t.videoId),
  ],
);

export const likes = pgTable(
  "likes",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    videoId: text("video_id").notNull(),
    title: text("title").notNull(),
    artist: text("artist").notNull(),
    albumArt: text("album_art"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("likes_unique").on(t.userId, t.videoId)],
);

export const playHistory = pgTable(
  "play_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    videoId: text("video_id").notNull(),
    playedAt: timestamp("played_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    msPlayed: integer("ms_played").notNull().default(0),
  },
  (t) => [index("play_history_user_idx").on(t.userId, t.playedAt)],
);

export const preferences = pgTable("preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  data: jsonb("data").notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const importJobs = pgTable("import_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["liked_songs", "playlists"] }).notNull(),
  status: text("status", { enum: ["queued", "running", "done", "failed"] })
    .notNull()
    .default("queued"),
  progress: integer("progress").notNull().default(0), // 0..100
  stats: jsonb("stats").notNull().default({}),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userPlayerState = pgTable("user_player_state", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  currentVideoId: text("current_video_id"),
  currentIndex: integer("current_index").notNull().default(0),
  currentTimeSec: integer("current_time_sec").notNull().default(0),
  queue: jsonb("queue").notNull().default([]),
  repeatMode: text("repeat_mode", { enum: ["off", "all", "one"] })
    .notNull()
    .default("off"),
  isShuffle: boolean("is_shuffle").notNull().default(false),
  volume: integer("volume").notNull().default(85), // 0 to 100 percentage
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userEqualizerPresets = pgTable(
  "user_equalizer_presets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    bands: jsonb("bands").notNull().default([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("user_eq_user_idx").on(t.userId)],
);
