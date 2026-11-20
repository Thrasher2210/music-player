# Dying Component Reference & API Catalog

Every component in `@mp/dying` is built with TypeScript, strict token integration, and WCAG 2.2 AA accessibility.

---

## 1. Primitives

### `Box`
Polymorphic low-level container.
```tsx
import { Box } from '@mp/dying';

<Box as="section" className="p-6 bg-surface rounded-2xl">
  Content
</Box>
```
- **Props:** `as?: ElementType`, `className?: string`, `children?: ReactNode`.

### `Stack` & `Flex`
Layout primitives enforcing tokenized spacing.
```tsx
import { Stack, Flex } from '@mp/dying';

<Stack gap="4">
  <Item />
  <Item />
</Stack>

<Flex direction="row" justify="between" align="center" gap="3">
  <span>Left</span>
  <span>Right</span>
</Flex>
```
- **Props:**
  - `direction?: "row" | "row-reverse" | "col" | "col-reverse"`
  - `align?: "start" | "center" | "end" | "stretch" | "baseline"`
  - `justify?: "start" | "center" | "end" | "between" | "around" | "evenly"`
  - `gap?: "0" | "1" | "2" | "3" | "4" | "5" | "6" | "8" | "10" | "12"`

### `Text` & `Heading`
Semantic typographic primitives.
```tsx
import { Heading, Text } from '@mp/dying';

<Heading level={1} size="h1">Page Title</Heading>
<Text variant="secondary" size="sm">Subtitle</Text>
<Text variant="kicker" size="xs">CATEGORY</Text>
```
- **Heading Props:** `level?: 1..6`, `size?: "h1".."h6"`, `tracking?: "tight" | "normal" | "wide"`
- **Text Props:** `variant?: "primary" | "secondary" | "tertiary" | "kicker" | "muted" | "accent"`, `size?: "xs".."2xl"`, `weight?: "normal" | "medium" | "semibold" | "bold"`

### `Separator`
Accessible divider backed by Radix Separator.
```tsx
import { Separator } from '@mp/dying';

<Separator orientation="horizontal" className="my-4" />
```

---

## 2. Foundational Components

### `BrandLogo` / `GaneGanLogo`
Official brand vector mark and typography lockup for GaneGan, dynamically integrated with Dying design tokens and theme modes.
```tsx
import { BrandLogo } from '@mp/dying';

// Pure vector mark
<BrandLogo variant="mark" size="sm" />

// Styled typography wordmark with brand-accent highlighted 'G's
<BrandLogo variant="wordmark" size="md" subtitle="Streaming Engine" />

// Full lockup (Mark + Wordmark)
<BrandLogo variant="full" size="md" />

// Squircle App Icon tile with specular highlight
<BrandLogo variant="app-icon" size="md" />

// Graphite acrylic monochrome tile
<BrandLogo variant="monochrome-tile" size="md" />
```
- **Variants:** `mark`, `wordmark`, `full`, `app-icon`, `monochrome-tile`.
- **Sizes:** `xs` (16px), `sm` (20px), `md` (28px), `lg` (40px), `xl` (56px), or custom `number`.
- **Colors:** `brand` (default theme-reactive vermillion/coral), `monochrome`, `white`, `current`.
- **Props:** `showSubtitle?: boolean`, `subtitle?: string`, `badge?: ReactNode`.

### `Button`
Polymorphic action button with variants, sizes, loading states, and icon slots.
```tsx
import { Button } from '@mp/dying';

<Button variant="primary" size="md" leftIcon={<Play size={16} />}>
  Play All
</Button>

<Button variant="glass" isLoading={isSaving} loadingText="Saving...">
  Save
</Button>
```
- **Variants:** `primary`, `secondary`, `glass`, `ghost`, `outline`, `danger`, `pill`.
- **Sizes:** `xs`, `sm`, `md`, `lg`, `xl`.

### `IconButton` & `ButtonGroup`
Accessible icon action button requiring explicit `aria-label`.
```tsx
import { IconButton, ButtonGroup } from '@mp/dying';

<IconButton
  icon={<Heart size={16} />}
  aria-label="Add to favorites"
  variant="glass"
  shape="circle"
/>

<ButtonGroup attached>
  <Button size="sm">Day</Button>
  <Button size="sm">Week</Button>
</ButtonGroup>
```

### `Input`, `Textarea`, `Select`, `FormField`
Accessible form controls with integrated error handling.
```tsx
import { FormField, Input, Select, Textarea } from '@mp/dying';

<FormField label="Artist Name" required errorMessage={error}>
  <Input placeholder="e.g. Kendrick Lamar" leftIcon={<Search size={16} />} />
</FormField>
```

### `Checkbox` & `Switch`
Radix-backed selection controls with tactile spring animations.
```tsx
import { Checkbox, Switch } from '@mp/dying';

<Switch label="Lossless Streaming" checked={lossless} onCheckedChange={setLossless} />
<Checkbox label="Remember device" checked={remember} onCheckedChange={setRemember} />
```

### `Badge`
Status and metadata indicator.
```tsx
import { Badge } from '@mp/dying';

<Badge variant="success" dot={true}>Synced</Badge>
<Badge variant="accent">LOSSLESS</Badge>
```
- **Variants:** `neutral`, `accent`, `glass`, `success`, `warning`, `error`, `info`.

### `Alert`
Status messages and notifications with appropriate role and styling.
```tsx
import { Alert } from '@mp/dying';

<Alert
  status="warning"
  title="Network Degradation"
  description="Switching to 256kbps Opus stream."
  closable
  onClose={() => handleDismiss()}
/>
```
- **Status:** `info`, `success`, `warning`, `error`.
- **Props:** `title?: string`, `description?: ReactNode`, `closable?: boolean`, `onClose?: () => void`.

### `EmptyState`
Standardized zero-data fallback surface.
```tsx
import { EmptyState, Button } from '@mp/dying';
import { Music } from 'lucide-react';

<EmptyState
  icon={<Music size={32} />}
  title="No tracks in queue"
  description="Search for tracks, albums, or artists to build your session."
  action={<Button size="sm">Explore Catalog</Button>}
/>
```

### `Spinner` & `Skeleton`
Loading indicators and skeleton placeholders.
```tsx
import { Spinner, Skeleton } from '@mp/dying';

<Spinner size="md" label="Loading playlist..." />

<Skeleton variant="rounded" width="100%" height="48px" />
```

### `Avatar`
User profile or artist avatar with fallback initials.
```tsx
import { Avatar } from '@mp/dying';

<Avatar src="/artist.jpg" alt="Kendrick Lamar" fallback="KL" size="md" />
```

### `Tooltip`
Accessible hover and keyboard-focus label popup backed by Radix UI.
```tsx
import { Tooltip, IconButton } from '@mp/dying';
import { Info } from 'lucide-react';

<Tooltip content="Streamed in 24-bit 96kHz FLAC">
  <IconButton icon={<Info size={16} />} aria-label="Audio format details" />
</Tooltip>
```

### `Dialog`
Modal dialog with Radix focus trapping, keyboard Escape handling, and backdrop blur.
```tsx
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button
} from '@mp/dying';

<Dialog>
  <DialogTrigger asChild>
    <Button>Open Settings</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Audio Preferences</DialogTitle>
      <DialogDescription>Configure playback buffers and streaming codecs.</DialogDescription>
    </DialogHeader>
    <p>Modal body content</p>
    <DialogFooter>
      <Button variant="primary">Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### `DropdownMenu`
Action menu built on Radix `DropdownMenu`: opens from a trigger, arrow-key and typeahead navigation, `Escape` and outside-click dismissal, focus returns to the trigger. Items highlight with the `surface-hover` token; `destructive` switches the text to `status-error`.
```tsx
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  Button,
} from '@mp/dying';

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="glass">Actions</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuLabel>Track</DropdownMenuLabel>
    <DropdownMenuItem icon={<ListPlus size={16} />} onSelect={addToPlaylist}>
      Add to playlist
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem destructive onSelect={remove}>Remove</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```
`DropdownMenuContent` renders in a portal (default `align="end"`, `sideOffset={6}`). `DropdownMenuItem` takes an optional `icon` and `destructive` flag on top of the Radix item props.

### `Card`
Compound surface card container.
```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@mp/dying';

<Card variant="glass">
  <CardHeader>
    <CardTitle>Card Header</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Body</CardContent>
  <CardFooter>Footer</CardFooter>
</Card>
```

---

## 3. Layout & Navigation Components

### `AppShell`
Enterprise responsive application scaffold featuring collapsible desktop sidebar, Radix-backed mobile slide-out drawer, top header slot, and fixed audio transport dock.
```tsx
import { AppShell, Sidebar, SidebarBrand, SidebarNav, SidebarNavItem } from '@mp/dying';

<AppShell
  sidebar={
    <Sidebar>
      <SidebarBrand title="MUSIC" />
      <SidebarNav>
        <SidebarNavItem icon={<Home size={18} />} label="Home" active />
        <SidebarNavItem icon={<Radio size={18} />} label="Radio" />
      </SidebarNav>
    </Sidebar>
  }
  bottomBar={<FloatingPlayerPill ... />}
>
  <main className="p-6">Content</main>
</AppShell>
```

---

## 4. Media & Experience Components

### `MediaCard` & `MediaShelf`
Accessible cards and responsive scroll carousels for albums, playlists, and artists.
```tsx
import { MediaCard, MediaShelf } from '@mp/dying';

<MediaShelf title="Heavy Rotation">
  {albums.map((album) => (
    <MediaCard
      key={album.id}
      title={album.title}
      subtitle={album.artist}
      imageUrl={album.cover}
      onPlay={() => handlePlay(album)}
    />
  ))}
</MediaShelf>
```

### `HeroBannerCard` & `HeroCarousel`
Featured release hero spotlight with responsive aspect ratios and ambient gradients.
```tsx
import { HeroBannerCard } from '@mp/dying';

<HeroBannerCard
  title="GNX"
  subtitle="Kendrick Lamar"
  tagline="FEATURED RELEASE"
  coverUrl="/covers/gnx.jpg"
  onPlay={() => handlePlayAlbum()}
/>
```

### `AmbientAura` & `SoundWave`
Canvas-free, GPU-composited dynamic ambient backlight and audio waveform animations.
```tsx
import { AmbientAura, SoundWave } from '@mp/dying';

<AmbientAura active color="rgba(255, 255, 255, 0.08)" />
<SoundWave playing={isPlaying} barCount={4} />
```

---

## 5. Streaming Domain Components

### `TrackTable` & `TrackRow`
Responsive audio song table with live waveform indicator, duration formatting, and hover actions. The like and "..." buttons appear on row hover or keyboard focus, and are always visible on touch screens (`pointer: coarse`). A track with no `duration` (or `0`) shows an empty duration cell instead of `0:00`; pass `showAlbum={false}` when no track has an album.
```tsx
import { TrackTable, type TrackData } from '@mp/dying';

<TrackTable
  tracks={tracks}
  currentTrackId={activeId}
  isPlaying={isPlaying}
  onTrackSelect={(track) => play(track)}
  onTrackPlay={(track) => play(track)}
  onTrackPause={() => pause()}
/>
```

Row actions menu: pass `renderActions` to `TrackTable` (or `actions` to a single `TrackRow`) with `DropdownMenuItem`s and the row's "..." button becomes a menu trigger. Clicks and key presses inside the menu do not select the row. `actions` takes precedence over `onActionClick`.
```tsx
<TrackTable
  tracks={tracks}
  renderActions={(track) => (
    <>
      <DropdownMenuItem onSelect={() => addToQueue(track)}>Add to queue</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => openPlaylistPicker(track)}>Add to playlist</DropdownMenuItem>
    </>
  )}
/>
```

### `FloatingPlayerPill`
Docked glass transport player with embedded Radix ScrubSlider.
```tsx
import { FloatingPlayerPill } from '@mp/dying';

<FloatingPlayerPill
  title="Song Title"
  artist="Artist Name"
  isPlaying={isPlaying}
  currentTime={45}
  duration={210}
  buffered={80}
  volume={0.8}
  onPlayPause={togglePlay}
  onSeek={seek}
  onVolumeChange={setVolume}
/>
```
Optional `onAddToPlaylist` shows an "Add to playlist" button next to the playback options button.

### `FullImmersionLyrics`
Accessible Radix Dialog modal for time-synced fullscreen lyrics.
```tsx
import { FullImmersionLyrics } from '@mp/dying';

<FullImmersionLyrics
  track={currentTrack}
  lyrics={syncedLyrics}
  currentTime={currentTime}
  isPlaying={isPlaying}
  onPlayPause={togglePlay}
  onClose={() => setOpen(false)}
  onSeek={seek}
/>
```

### `MoodChip` & `MoodChipBar`
Horizontal scrollable pill strip with obsidian glass buttons for mood and genre filtering.
```tsx
import { MoodChipBar, MoodChip, type MoodChipData } from '@mp/dying';

<MoodChipBar
  chips={chips}
  activeId={selectedId}
  onSelectChip={(chip) => setSelectedId(chip.id)}
/>
```
- **Active state:** Crisp high-contrast white `#ffffff` with black text.
- **Inactive state:** Sleek obsidian glass button in `#1e1e22` with specular border `rgba(255,255,255,0.08)`.

### `QuickPicksGrid` & `QuickPickRow`
4-item vertical stacked song row with 44px thumbnail, title, artist, hover play button, and queue / more options.
```tsx
import { QuickPicksGrid, QuickPickRow, type TrackData } from '@mp/dying';

<QuickPicksGrid columns={4}>
  {tracks.map((track) => (
    <QuickPickRow
      key={track.id}
      track={track}
      isPlaying={track.id === currentTrackId && isPlaying}
      onPlay={() => playTrack(track)}
      onQueue={() => addToQueue(track)}
    />
  ))}
</QuickPicksGrid>
```
The "more options" button only renders when `actions` (menu items, same as `TrackRow`) or `onActionClick` is passed.
The queue and "more options" buttons take no width until the row is hovered, keyboard focused or has an open menu, so titles use the full row. On touch screens they are always shown.

### `FullPlayerView`
YouTube Music desktop full-screen player view with large album artwork, soft 10% dynamic ambient aura glow, scrub slider, and 3-tab right panel (`UP NEXT`, `LYRICS`, `RELATED`).
```tsx
import { FullPlayerView, type FullPlayerTab, type TrackData } from '@mp/dying';

<FullPlayerView
  track={currentTrack}
  isPlaying={isPlaying}
  currentTime={currentTime}
  duration={duration}
  onPlayPause={togglePlay}
  onSeek={seek}
  onClose={() => setFullPlayerOpen(false)}
  activeTab={activeTab}
  onTabChange={(tab) => setActiveTab(tab)}
  queue={queue}
  lyrics={syncedLyrics}
  related={relatedItems}
  onSelectTrack={(track) => playTrack(track)}
  infiniteRadio={true}
  onToggleInfiniteRadio={setInfiniteRadio}
/>
```
