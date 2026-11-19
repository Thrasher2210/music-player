'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ListMusic, Plus, Youtube } from 'lucide-react';
import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
  Card,
  Badge,
  EmptyState,
} from '@mp/dying';
import { type Playlist } from '@/stores/libraryStore';

export type PlaylistTab = 'all' | 'local' | 'youtube';

export interface LibraryPlaylistsSectionProps {
  playlists: Playlist[];
  syncedPlaylists: any[];
  isYouTubeAuthenticated: boolean;
  onCreatePlaylist: () => void;
}

export const LibraryPlaylistsSection: React.FC<LibraryPlaylistsSectionProps> = ({
  playlists,
  syncedPlaylists,
  isYouTubeAuthenticated,
  onCreatePlaylist,
}) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<PlaylistTab>('all');

  const displayedLocalPlaylists =
    activeTab === 'youtube' ? [] : playlists;
  const displayedYouTubePlaylists =
    activeTab === 'local' ? [] : syncedPlaylists;

  const totalCount = playlists.length + syncedPlaylists.length;

  return (
    <Box className="mb-12">
      <Flex align="center" justify="between" className="mb-4">
        <Heading level={2} className="text-xl sm:text-2xl font-bold text-text-primary">
          Playlists
        </Heading>

        {isYouTubeAuthenticated && (
          <Flex align="center" gap="1" className="p-1 rounded-xl bg-surface-active/40 border border-border-subtle">
            <Button
              variant={activeTab === 'all' ? 'secondary' : 'ghost'}
              size="xs"
              className="rounded-lg"
              onClick={() => setActiveTab('all')}
            >
              All ({totalCount})
            </Button>
            <Button
              variant={activeTab === 'local' ? 'secondary' : 'ghost'}
              size="xs"
              className="rounded-lg"
              onClick={() => setActiveTab('local')}
            >
              Local ({playlists.length})
            </Button>
            <Button
              variant={activeTab === 'youtube' ? 'secondary' : 'ghost'}
              size="xs"
              className="rounded-lg"
              onClick={() => setActiveTab('youtube')}
            >
              YouTube ({syncedPlaylists.length})
            </Button>
          </Flex>
        )}
      </Flex>

      {displayedLocalPlaylists.length === 0 && displayedYouTubePlaylists.length === 0 ? (
        <EmptyState
          icon={<ListMusic size={32} />}
          title="No Playlists Found"
          description="Create custom playlists or sync your YouTube Music library."
          actionSlot={
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Plus size={16} />}
              onClick={onCreatePlaylist}
            >
              Create Playlist
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {displayedLocalPlaylists.map((playlist) => (
            <Card
              key={playlist.id}
              className="group p-4 rounded-2xl border border-border-subtle bg-surface hover:bg-surface-hover/80 transition-all cursor-pointer shadow-md"
              onClick={() => router.push(`/playlist/${playlist.id}`)}
            >
              <Box className="aspect-square w-full rounded-xl bg-surface-active/60 border border-border-subtle flex items-center justify-center mb-3">
                <ListMusic size={32} className="text-text-tertiary" />
              </Box>
              <Heading level={4} className="text-sm font-semibold text-text-primary truncate">
                {playlist.name}
              </Heading>
              <Text size="xs" className="text-text-secondary mt-0.5">
                Local {playlist.trackCount ? `• ${playlist.trackCount} songs` : ''}
              </Text>
            </Card>
          ))}

          {displayedYouTubePlaylists.map((playlist: any) => (
            <Card
              key={playlist.id || playlist.browseId}
              className="group p-4 rounded-2xl border border-border-subtle bg-surface hover:bg-surface-hover/80 transition-all cursor-pointer shadow-md"
              onClick={() => {
                if (playlist.id) {
                  router.push(`/playlist/${playlist.id}`);
                }
              }}
            >
              <Box className="aspect-square w-full rounded-xl bg-red-950/20 border border-border-subtle flex items-center justify-center mb-3 relative overflow-hidden">
                <Youtube size={32} className="text-red-400" />
                <Badge variant="accent" size="xs" className="absolute top-2 right-2">YT</Badge>
              </Box>
              <Heading level={4} className="text-sm font-semibold text-text-primary truncate">
                {playlist.title || playlist.name}
              </Heading>
              <Text size="xs" className="text-text-secondary mt-0.5 truncate">
                YouTube {playlist.trackCount ? `• ${playlist.trackCount} songs` : ''}
              </Text>
            </Card>
          ))}
        </div>
      )}
    </Box>
  );
};
