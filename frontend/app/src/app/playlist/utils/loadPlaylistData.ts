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
  // Ensure library is always populated
  await fetchLibrary();

  // 1. Liked Music auto playlist
  if (playlistId === 'liked' || playlistId.startsWith('LM')) {
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

  // 3. YouTube Music direct browse ID (starts with VL, PL, or RD)
  if (playlistId.startsWith('VL') || playlistId.startsWith('PL') || playlistId.startsWith('RD')) {
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
  const syncedMeta = useYouTubeAuthStore.getState().syncedPlaylists.find(
    (p) => p.id === playlistId || p.ytPlaylistId === playlistId || (Boolean(meta?.name) && p.title === meta?.name)
  );

  // Find valid YouTube playlist ID (excluding UUIDs that contain hyphens)
  const candidateId = meta?.ytPlaylistId || syncedMeta?.ytPlaylistId || syncedMeta?.id;
  const ytId = candidateId && !candidateId.includes('-') ? candidateId : null;

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
