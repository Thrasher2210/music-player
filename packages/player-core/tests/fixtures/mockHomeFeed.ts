export const mockHomeFeedResponse = {
  header: {
    chipCloudRenderer: {
      chips: [
        {
          chipCloudChipRenderer: {
            text: { runs: [{ text: 'Energize' }] },
            navigationEndpoint: {
              browseEndpoint: { browseId: 'FEmusic_home', params: 'ggMDCNgB' },
            },
            isSelected: true,
            uniqueId: 'chip-energize',
          },
        },
        {
          chipCloudChipRenderer: {
            text: { runs: [{ text: 'Relax' }] },
            navigationEndpoint: {
              browseEndpoint: { browseId: 'FEmusic_home', params: 'ggMDCNgC' },
            },
            isSelected: false,
            uniqueId: 'chip-relax',
          },
        },
        {
          chipCloudChipRenderer: {
            text: { runs: [{ text: 'Workout' }] },
            navigationEndpoint: {
              browseEndpoint: { browseId: 'FEmusic_home', params: 'ggMDCNgD' },
            },
            isSelected: false,
          },
        },
      ],
    },
  },
  contents: {
    singleColumnBrowseResultsRenderer: {
      tabs: [
        {
          tabRenderer: {
            content: {
              sectionListRenderer: {
                contents: [
                  {
                    musicCarouselShelfRenderer: {
                      header: {
                        musicCarouselShelfBasicHeaderRenderer: {
                          title: { runs: [{ text: 'Quick picks' }] },
                          strapline: { runs: [{ text: 'START RADIO FROM A SONG' }] },
                        },
                      },
                      contents: [
                        {
                          musicResponsiveListItemRenderer: {
                            playlistItemData: { videoId: 'track1' },
                            flexColumns: [
                              {
                                musicResponsiveListItemFlexColumnRenderer: {
                                  text: { runs: [{ text: 'Midnight City' }] },
                                },
                              },
                              {
                                musicResponsiveListItemFlexColumnRenderer: {
                                  text: {
                                    runs: [{ text: 'M83' }, { text: ' • ' }, { text: '4:03' }],
                                  },
                                },
                              },
                            ],
                            thumbnail: {
                              musicThumbnailRenderer: {
                                thumbnail: {
                                  thumbnails: [
                                    { url: 'https://example.com/thumb1.jpg', width: 300, height: 300 },
                                  ],
                                },
                              },
                            },
                          },
                        },
                        {
                          musicResponsiveListItemRenderer: {
                            playlistItemData: { videoId: 'track2' },
                            flexColumns: [
                              {
                                musicResponsiveListItemFlexColumnRenderer: {
                                  text: { runs: [{ text: 'Starboy' }] },
                                },
                              },
                              {
                                musicResponsiveListItemFlexColumnRenderer: {
                                  text: {
                                    runs: [{ text: 'The Weeknd' }, { text: ' • ' }, { text: '3:50' }],
                                  },
                                },
                              },
                            ],
                            thumbnail: {
                              musicThumbnailRenderer: {
                                thumbnail: {
                                  thumbnails: [
                                    { url: 'https://example.com/thumb2.jpg', width: 300, height: 300 },
                                  ],
                                },
                              },
                            },
                          },
                        },
                      ],
                    },
                  },
                  {
                    musicCarouselShelfRenderer: {
                      header: {
                        musicCarouselShelfBasicHeaderRenderer: {
                          title: { runs: [{ text: 'Trending Albums & Artists' }] },
                        },
                      },
                      contents: [
                        {
                          musicTwoRowItemRenderer: {
                            title: { runs: [{ text: "Hurry Up, We're Dreaming" }] },
                            subtitle: { runs: [{ text: 'Album • M83' }] },
                            navigationEndpoint: {
                              browseEndpoint: { browseId: 'MPREb_123' },
                            },
                            thumbnailRenderer: {
                              musicThumbnailRenderer: {
                                thumbnail: {
                                  thumbnails: [{ url: 'https://example.com/album.jpg' }],
                                },
                              },
                            },
                          },
                        },
                        {
                          musicTwoRowItemRenderer: {
                            title: { runs: [{ text: "Today's Hits" }] },
                            subtitle: { runs: [{ text: 'Playlist • YouTube Music' }] },
                            navigationEndpoint: {
                              browseEndpoint: { browseId: 'VLPL123' },
                            },
                            thumbnailRenderer: {
                              musicThumbnailRenderer: {
                                thumbnail: {
                                  thumbnails: [{ url: 'https://example.com/playlist.jpg' }],
                                },
                              },
                            },
                          },
                        },
                        {
                          musicTwoRowItemRenderer: {
                            title: { runs: [{ text: 'Daft Punk' }] },
                            subtitle: { runs: [{ text: 'Artist • 10M subscribers' }] },
                            navigationEndpoint: {
                              browseEndpoint: { browseId: 'UC123' },
                            },
                            thumbnailRenderer: {
                              musicThumbnailRenderer: {
                                thumbnail: {
                                  thumbnails: [{ url: 'https://example.com/daft.jpg' }],
                                },
                              },
                            },
                          },
                        },
                        {
                          musicTwoRowItemRenderer: {
                            title: { runs: [{ text: 'One More Time' }] },
                            subtitle: { runs: [{ text: 'Song • Daft Punk' }] },
                            navigationEndpoint: {
                              watchEndpoint: { videoId: 'song123' },
                            },
                            thumbnailRenderer: {
                              musicThumbnailRenderer: {
                                thumbnail: {
                                  thumbnails: [{ url: 'https://example.com/song.jpg' }],
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
