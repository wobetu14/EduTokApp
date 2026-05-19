import { useWindowDimensions } from 'react-native';

export const BP = { tablet: 600, desktop: 960 };

export const useResponsive = () => {
  const { width: W, height: H } = useWindowDimensions();

  const isTablet = W >= BP.tablet;
  const isDesktop = W >= BP.desktop;
  const isLandscape = W > H;

  // Horizontal edge padding — grows on wide screens to center content
  const hPad = isDesktop ? Math.max(24, Math.floor((W - 960) / 2)) : isTablet ? 24 : 16;

  // Max-width and padding for centered forms / auth cards
  const formMaxW = isDesktop ? 500 : isTablet ? 460 : W;
  const formPad = Math.max(24, (W - formMaxW) / 2);

  // Hero image height — shorter in landscape to leave room for content
  const heroH = Math.round(
    Math.min(W * (isLandscape ? 0.32 : 0.55), isTablet ? 360 : 280)
  );

  // Explore horizontal card width
  const hCardW = isDesktop ? 220 : isTablet ? 200 : Math.round(Math.max(160, W * 0.44));

  // Lesson / course grid columns
  const gridCols = isDesktop ? 4 : isTablet ? 3 : 2;

  // Lesson card pixel width for grid (hPad each side, 8px gap between cols)
  const lessonCardW = Math.floor((W - hPad * 2 - 8 * (gridCols - 1)) / gridCols);

  // Comments bottom sheet height — taller in landscape so content is visible
  const commentsH = Math.round(H * (isLandscape ? 0.85 : 0.65));

  // Category chip width for 2-col interest grid in Onboarding
  const catChipW = Math.floor((W - hPad * 2 - 12) / 2);

  return {
    W, H, isTablet, isDesktop, isLandscape,
    hPad, formMaxW, formPad,
    heroH, hCardW,
    gridCols, lessonCardW,
    commentsH, catChipW,
  };
};
