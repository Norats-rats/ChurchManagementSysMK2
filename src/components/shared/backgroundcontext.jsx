import { createContext, useEffect, useMemo, useState } from 'react';
import api from '../../api';
import { getPhDateParts, usePhClock } from '../../utils/philippinesTime';
import {
  BG_MODES,
  CYCLE_IMAGES,
  LOGO_IMAGE,
  DEFAULT_BACKGROUND_PREFERENCE,
  pickCycleImage
} from '../../utils/backgroundPresets';

const STORAGE_KEY = 'churchBgPref';
const THEME_STORAGE_KEY = 'theme';

const BackgroundContext = createContext(null);

export { BackgroundContext };

const safeMerge = (base, incoming) => ({
  mode: incoming?.mode || base?.mode || DEFAULT_BACKGROUND_PREFERENCE.mode,
  customImage: incoming?.customImage ?? base?.customImage ?? DEFAULT_BACKGROUND_PREFERENCE.customImage,
  customUrl: incoming?.customUrl ?? base?.customUrl ?? DEFAULT_BACKGROUND_PREFERENCE.customUrl,
  solidColor: incoming?.solidColor ?? base?.solidColor ?? DEFAULT_BACKGROUND_PREFERENCE.solidColor,
  dim: incoming?.dim ?? base?.dim ?? DEFAULT_BACKGROUND_PREFERENCE.dim
});

const loadFromStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const resolveTheme = () => {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'dark' || (document.documentElement.classList.contains('theme-dark'))) return 'dark';
  return stored === 'light' ? 'light' : 'light';
};

const getOverlay = (theme, dim) => {
  if (!dim) return null;
  if (theme === 'dark') return 'rgba(0,0,0,0.38)';
  return 'rgba(255,255,255,0.28)';
};

const resolveImage = (pref, phHour) => {
  const mode = pref?.mode || BG_MODES.cycle;
  if (mode === BG_MODES.cycle) return pickCycleImage(phHour);
  if (mode === BG_MODES.logo) return LOGO_IMAGE;
  if (mode === BG_MODES.custom) return pref.customImage || pref.customUrl || null;
  return null;
};

const resolveColor = (pref) => {
  if ((pref?.mode || '') === BG_MODES.solid && pref?.solidColor) return pref.solidColor;
  return null;
};

const computeBackground = (pref, phHour, theme) => {
  const image = resolveImage(pref, phHour);
  const color = resolveColor(pref);
  const dim = pref?.dim !== false;
  const overlay = dim ? getOverlay(theme, true) : null;

  const backgroundStyle = {};
  if (color) {
    backgroundStyle.backgroundColor = color;
  } else if (image) {
    backgroundStyle.backgroundImage = `url(${image})`;
    backgroundStyle.backgroundSize = 'cover';
    backgroundStyle.backgroundPosition = 'center';
    backgroundStyle.backgroundRepeat = 'no-repeat';
    backgroundStyle.backgroundAttachment = 'scroll';
  } else {
    backgroundStyle.backgroundColor = theme === 'dark' ? '#0f172a' : '#f8fafc';
  }

  return { image, color, dim, overlay, theme, backgroundStyle };
};

export const BackgroundProvider = ({ userId, role, userName, children }) => {
  const [preference, setPreference] = useState(() => {
    const stored = loadFromStorage();
    return safeMerge(DEFAULT_BACKGROUND_PREFERENCE, stored);
  });
  const [loadedFromBackend, setLoadedFromBackend] = useState(false);
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const { now } = usePhClock(60000);
  const phHour = useMemo(() => {
    try {
      return getPhDateParts(now).hour;
    } catch {
      return new Date().getHours();
    }
  }, [now]);

  const [theme, setTheme] = useState(resolveTheme());

  useEffect(() => {
    const handler = () => setTheme(resolveTheme());
    handler();
    window.addEventListener('theme:change', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('theme:change', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      setLoadedFromBackend(true);
      return;
    }
    let cancelled = false;
    api
      .getBackgroundPreference(userId)
      .then((res) => {
        if (cancelled) return;
        const serverPref = res?.data;
        const merged = safeMerge(DEFAULT_BACKGROUND_PREFERENCE, serverPref);
        setPreference(merged);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        setLoadedFromBackend(true);
      })
      .catch((err) => {
        console.warn('Failed to load background preference, using default:', err?.message || err);
        setLoadedFromBackend(true);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const persist = (next) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const saveToServer = async (next, onSuccess) => {
    if (!userId) {
      persist(next);
      setPreference(next);
      onSuccess?.(next);
      return;
    }
    setSaving(true);
    try {
      await api.updateBackgroundPreference(userId, next, role, userName);
      persist(next);
      setPreference(next);
      onSuccess?.(next);
      window.dispatchEvent(new Event('church:background:updated'));
    } catch (err) {
      console.error('Background preference save failed:', err?.message || err);
      persist(next);
      setPreference(next);
      onSuccess?.(next);
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (patch) => {
    const next = safeMerge(preference, patch);
    saveToServer(next);
  };

  const resetPreference = () => {
    const next = { ...DEFAULT_BACKGROUND_PREFERENCE };
    saveToServer(next);
  };

  const active = useMemo(() => computeBackground(preference, phHour, theme), [preference, phHour, theme]);

  const value = {
    preference,
    active,
    theme,
    isSaving: saving,
    loadedFromBackend,
    updatePreference,
    resetPreference,
    customizerOpen,
    setCustomizerOpen
  };

  return (
    <BackgroundContext.Provider value={value}>
      <BackgroundRenderer active={active} />
      {children}
    </BackgroundContext.Provider>
  );
};

const BackgroundRenderer = ({ active }) => {
  const dimClass = active.dim ? '' : 'church-bg-dim-disabled';
  const themeClass = active.theme === 'dark' ? 'church-bg-dark' : 'church-bg-light';
  const style = active.backgroundStyle;
  return (
    <>
      <div className={`church-bg-layer ${themeClass}`} style={style} aria-hidden="true" />
      <div className={`church-bg-overlay ${dimClass} ${themeClass}`} aria-hidden="true" />
    </>
  );
};
