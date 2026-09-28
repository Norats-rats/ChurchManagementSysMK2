import churchMorn from '../assets/bgpics/churchmorn.jpg';
import churchNoon from '../assets/bgpics/churchnoon.jpg';
import churchNight from '../assets/bgpics/churchnight.jpg';
import churchLogo from '../assets/churchlogo.jpg';

export const CYCLE_IMAGES = {
  morning: churchMorn,
  noon: churchNoon,
  afternoon: churchNoon,
  evening: churchNight,
  night: churchNight
};

export const LOGO_IMAGE = churchLogo;

export const BG_MODES = {
  cycle: 'daynoonnight',
  logo: 'logo',
  solid: 'solid',
  custom: 'custom'
};

export const DEFAULT_BACKGROUND_PREFERENCE = {
  mode: BG_MODES.cycle,
  customImage: null,
  customUrl: null,
  solidColor: null,
  dim: true
};

export const pickCycleImage = (hour) => {
  if (hour < 12) return CYCLE_IMAGES.morning;
  if (hour < 18) return CYCLE_IMAGES.noon;
  return CYCLE_IMAGES.evening;
};

export const describeMode = (pref) => {
  switch (pref?.mode) {
    case BG_MODES.logo: return 'Church Logo';
    case BG_MODES.solid: return `Solid ${pref?.solidColor || '#000000'}`;
    case BG_MODES.custom: return pref?.customImage ? 'Custom Upload' : pref?.customUrl ? 'Custom URL' : 'Custom Image';
    default: return 'Day / Noon / Night Cycle';
  }
};
