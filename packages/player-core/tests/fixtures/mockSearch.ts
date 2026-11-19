export const mockYtmSearchResponse = {
  contents: {
    tabbedSearchResultsRenderer: {
      tabs: [
        {
          tabRenderer: {
            content: {
              sectionListRenderer: {
                contents: [
                  {
                    musicShelfRenderer: {
                      contents: [
                        {
                          musicResponsiveListItemRenderer: {
                            playlistItemData: { videoId: 'abc123xyz' },
                            flexColumns: [
                              {
                                musicResponsiveListItemFlexColumnRenderer: {
                                  text: {
                                    runs: [{ text: 'Midnight City' }],
                                  },
                                },
                              },
                              {
                                musicResponsiveListItemFlexColumnRenderer: {
                                  text: {
                                    runs: [
                                      { text: 'M83' },
                                      { text: ' • ' },
                                      { text: "Hurry Up, We're Dreaming" },
                                      { text: ' • ' },
                                      { text: '4:03' },
                                    ],
                                  },
                                },
                              },
                            ],
                            thumbnail: {
                              musicThumbnailRenderer: {
                                thumbnail: {
                                  thumbnails: [
                                    { url: 'https://example.com/thumb_small.jpg', width: 60, height: 60 },
                                    { url: 'https://example.com/thumb_large.jpg', width: 540, height: 540 },
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
