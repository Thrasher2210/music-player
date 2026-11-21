const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True for playlists saved in the user's library, as opposed to 'liked' or remote YouTube Music ids. */
export function isLibraryPlaylistId(id: string): boolean {
  return UUID_PATTERN.test(id);
}
