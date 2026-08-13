export interface ImageProfile {
  maxWidth: number;
  maxHeight: number;
  thumbWidth: number;
  thumbHeight: number;
  thumbFit: 'inside' | 'cover';
  quality: number;
}

/** Flat colour + text — compression artifacts are very visible, so quality stays high. */
export const LOGO_PROFILE: ImageProfile = {
  maxWidth: 512,
  maxHeight: 512,
  thumbWidth: 128,
  thumbHeight: 128,
  thumbFit: 'inside',
  quality: 90,
};

/** Thumb uses 'cover' so gallery grid tiles are uniform squares regardless of source aspect
 * ratio. */
export const GALLERY_PROFILE: ImageProfile = {
  maxWidth: 1600,
  maxHeight: 1600,
  thumbWidth: 480,
  thumbHeight: 480,
  thumbFit: 'cover',
  quality: 80,
};
