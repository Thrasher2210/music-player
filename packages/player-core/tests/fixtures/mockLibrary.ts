export const mockLikedVideosResponse = {
  contents: {
    singleColumnBrowseResultsRenderer: {
      tabs: [
        {
          tabRenderer: {
            content: {
              sectionListRenderer: {
                contents: [
                  {
                    musicPlaylistShelfRenderer: {
                      playlistId: 'LM',
                      contents: [
                        {
                          musicResponsiveListItemRenderer: {
                            playlistItemData: {
                              videoId: 'liked123',
                            },
                            flexColumns: [
                              {
                                musicResponsiveListItemFlexColumnRenderer: {
                                  text: {
                                    runs: [{ text: 'Starboy' }],
                                  },
                                },
                              },
                              {
                                musicResponsiveListItemFlexColumnRenderer: {
                                  text: {
                                    runs: [
                                      {
                                        text: 'The Weeknd',
                                        navigationEndpoint: {
                                          browseEndpoint: { browseId: 'UCtheweeknd' },
                                        },
                                      },
                                      { text: ' • ' },
                                      {
                                        text: 'Starboy Album',
                                        navigationEndpoint: {
                                          browseEndpoint: { browseId: 'MPREb_starboy' },
                                        },
                                      },
                                      { text: ' • ' },
                                      { text: '3:50' },
                                    ],
                                  },
                                },
                              },
                            ],
                            thumbnail: {
                              musicThumbnailRenderer: {
                                thumbnail: {
                                  thumbnails: [
                                    { url: 'https://example.com/thumb_small.jpg' },
                                    { url: 'https://example.com/thumb_starboy.jpg' },
                                  ],
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
};

export const mockLibraryLandingResponse = {
  contents: {
    singleColumnBrowseResultsRenderer: {
      tabs: [
        {
          tabRenderer: {
            content: {
              sectionListRenderer: {
                contents: [
                  {
                    gridRenderer: {
                      items: [
                        {
                          musicTwoRowItemRenderer: {
                            title: {
                              runs: [{ text: 'Midnight Chill' }],
                            },
                            subtitle: {
                              runs: [
                                { text: 'Playlist' },
                                { text: ' • ' },
                                { text: 'Alex Curator' },
                                { text: ' • ' },
                                { text: '24 songs' },
                              ],
                            },
                            navigationEndpoint: {
                              browseEndpoint: {
                                browseId: 'VLPLmidnight123',
                              },
                            },
                            thumbnailRenderer: {
                              musicThumbnailRenderer: {
                                thumbnail: {
                                  thumbnails: [
                                    { url: 'https://example.com/cover_midnight.jpg' },
                                  ],
                                },
                              },
                            },
                          },
                        },
                        {
                          musicResponsiveListItemRenderer: {
                            flexColumns: [
                              {
                                musicResponsiveListItemFlexColumnRenderer: {
                                  text: {
                                    runs: [
                                      {
                                        text: 'Coding Beats',
                                        navigationEndpoint: {
                                          browseEndpoint: { browseId: 'PLcoding456' },
                                        },
                                      },
                                    ],
                                  },
                                },
                              },
                              {
                                musicResponsiveListItemFlexColumnRenderer: {
                                  text: {
                                    runs: [
                                      { text: 'Playlist' },
                                      { text: ' • ' },
                                      { text: 'Dev Beats' },
                                      { text: ' • ' },
                                      { text: '60 tracks' },
                                    ],
                                  },
                                },
                              },
                            ],
                            thumbnail: {
                              musicThumbnailRenderer: {
                                thumbnail: {
                                  thumbnails: [
                                    { url: 'https://example.com/cover_coding.jpg' },
                                  ],
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
};
