/**
 * Stand-in for the asset picker until a media library backend exists. These are
 * static files already in `public/`, used so the post composer and the upload
 * dialog have something to choose from - they are not Google data.
 */
export const IMG = {
  river: "/campaigns/river-cleanup.jpg",
  water: "/campaigns/water-conservation.jpg",
  tree: "/campaigns/tree-planting.jpg",
  clean: "/campaigns/clean-river.jpg",
  tourism: "/campaigns/ganga-tourism.jpg",
  wide: "/campaigns/save-rivers/wide.png",
  wide2: "/campaigns/save-rivers/wide-2.png",
  standard: "/campaigns/save-rivers/standard.png",
  banner: "/campaigns/save-rivers/banner.png",
  square: "/campaigns/save-rivers/square.png",
  logo: "/namogange.webp",
};

export const MEDIA_LIBRARY = [IMG.river, IMG.water, IMG.tree, IMG.clean, IMG.tourism, IMG.wide, IMG.wide2, IMG.standard];
