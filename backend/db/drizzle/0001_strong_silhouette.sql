CREATE TABLE "lyrics" (
	"video_id" text PRIMARY KEY NOT NULL,
	"plain_lyrics" text,
	"synced_lyrics" jsonb,
	"source" text NOT NULL,
	"synced" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracks" (
	"video_id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"artist" text NOT NULL,
	"album" text,
	"album_art" text,
	"duration_sec" integer DEFAULT 0 NOT NULL,
	"preferred_itag" integer DEFAULT 251,
	"play_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_equalizer_presets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"bands" jsonb DEFAULT '[0,0,0,0,0,0,0,0,0,0]'::jsonb NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_player_state" (
	"user_id" text PRIMARY KEY NOT NULL,
	"current_video_id" text,
	"current_index" integer DEFAULT 0 NOT NULL,
	"current_time_sec" integer DEFAULT 0 NOT NULL,
	"queue" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"repeat_mode" text DEFAULT 'off' NOT NULL,
	"is_shuffle" boolean DEFAULT false NOT NULL,
	"volume" integer DEFAULT 85 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "playlists" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "playlists" ADD COLUMN "cover_art" text;--> statement-breakpoint
ALTER TABLE "playlists" ADD COLUMN "is_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "playlists" ADD COLUMN "is_pinned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_equalizer_presets" ADD CONSTRAINT "user_equalizer_presets_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_player_state" ADD CONSTRAINT "user_player_state_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tracks_artist_idx" ON "tracks" USING btree ("artist");--> statement-breakpoint
CREATE INDEX "tracks_play_count_idx" ON "tracks" USING btree ("play_count");--> statement-breakpoint
CREATE INDEX "user_eq_user_idx" ON "user_equalizer_presets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "playlists_pinned_idx" ON "playlists" USING btree ("user_id","is_pinned");