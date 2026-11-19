import { Track } from '@mp/player-core';
import { useLibraryStore } from '@/stores/libraryStore';
import { useYouTubeAuthStore } from '@/stores/youtubeAuthStore';

export interface LoadedPlaylistData {
  title: string;
  description?: string;
  author?: string;
  coverUrl?: string;
  tracks: Track[];
}

export async function loadPlaylistData(
  playlistId: string,
  getPlaylist: (id: string) => Promise<any>,
  fetchLibrary: () => Promise<void>,
  fetchPlaylistTracks: (id: string) => Promise<Track[]>
): Promise<LoadedPlaylistData> {
  // 1. Liked Music auto playlist
  if (playlistId === 'liked' || playlistId.startsWith('LM')) {
    await fetchLibrary();
    const libState = useLibraryStore.getState();
    const ytState = useYouTubeAuthStore.getState();
    const combined = [
      ...libState.likedTracks,
      ...ytState.syncedLikedTracks.filter(
        (yt) => !libState.likedTracks.some((lt) => (lt.videoId || lt.id) === (yt.videoId || yt.id))
      ),
    ];
    return {
      title: 'Liked Music',
      description: 'Auto playlist of tracks you have liked',
      author: 'You',
      coverUrl: combined[0]?.thumbnail || undefined,
      tracks: combined,
    };
  }

  // 2. Direct memory match in syncedPlaylists with tracks
  const syncedMatch = useYouTubeAuthStore.getState().syncedPlaylists.find(
    (p) => p.id === playlistId || p.ytPlaylistId === playlistId
  );
  if (syncedMatch && syncedMatch.tracks && syncedMatch.tracks.length > 0) {
    return {
      title: syncedMatch.title,
      description: syncedMatch.description,
      author: syncedMatch.author || 'You',
      coverUrl: syncedMatch.coverUrl,
      tracks: syncedMatch.tracks,
    };
  }

  // 3. YouTube Music direct browse ID (starts with VL or PL)
  if (playlistId.startsWith('VL') || playlistId.startsWith('PL')) {
    const remote = await getPlaylist(playlistId);
    return {
      title: remote.title,
      description: remote.description,
      author: remote.author,
      coverUrl: remote.coverUrl,
      tracks: remote.tracks,
    };
  }

  // 4. Custom local or synced backend playlist
  let pTracks = await fetchPlaylistTracks(playlistId);
  const meta = useLibraryStore.getState().playlists.find((p) => p.id === playlistId);

  // If local tracks are empty and this is a YouTube synced playlist, fetch on-demand (JIT)
  const ytId = meta?.ytPlaylistId || (meta?.source === 'youtube' ? meta.id : null);
  if (pTracks.length === 0 && ytId) {
    try {
      const remote = await getPlaylist(ytId);
      if (remote && remote.tracks && remote.tracks.length > 0) {
        pTracks = remote.tracks;
        // Asynchronously persist tracks to DB for instant subsequent offline loads
        useLibraryStore.getState().addTracksToPlaylist(playlistId, remote.tracks).catch((err) => {
          console.warn('[loadPlaylistData] Failed to cache tracks in background:', err);
        });
        return {
          title: remote.title || meta?.name || 'Playlist',
          description: remote.description,
          author: remote.author || 'You',
          coverUrl: remote.coverUrl || meta?.coverArt,
          tracks: pTracks,
        };
      }
    } catch (fetchErr) {
      console.warn('[loadPlaylistData] Failed to fetch on-demand tracks for synced playlist:', fetchErr);
    }
  }

  return {
    title: meta?.name || 'Playlist',
    author: 'You',
    coverUrl: meta?.coverArt,
    tracks: pTracks,
  };
}
