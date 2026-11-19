export const mockNextResponse = {
  contents: {
    singleColumnMusicWatchNextResultsRenderer: {
      tabbedRenderer: {
        watchNextTabbedResultsRenderer: {
          tabs: [
            {
              tabRenderer: {
                title: { runs: [{ text: 'Up next' }] },
                content: {
                  musicQueueRenderer: {
                    content: {
                      playlistPanelRenderer: {
                        contents: [
                          {
                            playlistPanelVideoRenderer: {
                              videoId: 'queue1',
                              title: { runs: [{ text: 'Get Lucky' }] },
                              shortBylineText: { runs: [{ text: 'Daft Punk' }] },
                              lengthText: { runs: [{ text: '4:08' }] },
                              thumbnail: {
                                thumbnails: [{ url: 'https://example.com/qlarge.jpg' }],
                              },
                            },
                          },
                          {
                            playlistPanelVideoRenderer: {
                              videoId: 'queue2',
                              title: { runs: [{ text: 'Instant Crush' }] },
                              shortBylineText: { runs: [{ text: 'Daft Punk ft. Julian Casablancas' }] },
                              lengthText: { runs: [{ text: '5:37' }] },
                              thumbnail: {
                                thumbnails: [{ url: 'https://example.com/q2.jpg' }],
                              },
                            },
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
            {
              tabRenderer: {
                title: { runs: [{ text: 'Lyrics' }] },
              },
            },
            {
              tabRenderer: {
                title: { runs: [{ text: 'Related' }] },
                content: {
                  sectionListRenderer: {
                    contents: [
                      {
                        musicCarouselShelfRenderer: {
                          header: {
                            musicCarouselShelfBasicHeaderRenderer: {
                              title: { runs: [{ text: 'Similar Artists' }] },
                            },
                          },
                          contents: [
                            {
                              musicTwoRowItemRenderer: {
                                title: { runs: [{ text: 'Justice' }] },
                                subtitle: { runs: [{ text: 'Artist • 2M subscribers' }] },
                                navigationEndpoint: {
                                  browseEndpoint: { browseId: 'UC_justice' },
                                },
                                thumbnailRenderer: {
                                  musicThumbnailRenderer: {
                                    thumbnail: {
                                      thumbnails: [{ url: 'https://example.com/justice.jpg' }],
                                    },
                                  },
                                },
                              },
                            },
                            {
                              musicTwoRowItemRenderer: {
                                title: { runs: [{ text: 'Discovery' }] },
                                subtitle: { runs: [{ text: 'Album • Daft Punk' }] },
                                navigationEndpoint: {
                                  browseEndpoint: { browseId: 'MPREb_discovery' },
                                },
                                thumbnailRenderer: {
                                  musicThumbnailRenderer: {
                                    thumbnail: {
                                      thumbnails: [{ url: 'https://example.com/discovery.jpg' }],
                                    },
                                  },
                                },
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              },
            },
          ],
        },
      },
    },
  },
};
