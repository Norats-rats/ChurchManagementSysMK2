import { useContext, useRef, useState } from 'react';
import { BackgroundContext } from './backgroundcontext';
import {
  BG_MODES,
  CYCLE_IMAGES,
  LOGO_IMAGE,
  DEFAULT_BACKGROUND_PREFERENCE,
  describeMode,
  ZOOM_MIN,
  ZOOM_MAX,
  DEFAULT_ZOOM
} from '../../utils/backgroundPresets';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const MAX_BYTES = 10 * 1024 * 1024;

const presetOptions = [
  { value: BG_MODES.cycle, label: 'Day / Noon / Night Cycle', icon: '🌓', preview: CYCLE_IMAGES.noon },
  { value: BG_MODES.logo, label: 'Church Logo', icon: '⛪', preview: LOGO_IMAGE },
  { value: BG_MODES.solid, label: 'Solid Color', icon: '🎨', preview: null }
];

const COLOR_SWATCHES = [
  '#0f172a', '#0369a1', '#115e59', '#7c3aed', '#991416',
  '#b91c1c', '#be123c', '#581c87', '#831843', '#374151'
];

const BackgroundCustomizer = () => {
  const bg = useContext(BackgroundContext);
  const {
    preference,
    updatePreference,
    resetPreference,
    isSaving,
    customizerOpen,
    setCustomizerOpen
  } = bg || {};
  const visible = !!customizerOpen;
  const onClose = () => setCustomizerOpen && setCustomizerOpen(false);
  const fileInputRef = useRef(null);

  const [localPref, setLocalPref] = useState(() => {
    const p = preference || DEFAULT_BACKGROUND_PREFERENCE;
    return {
      mode: p.mode || DEFAULT_BACKGROUND_PREFERENCE.mode,
      customImage: p.customImage || null,
      customUrl: p.customUrl || '',
      solidColor: p.solidColor || '#0f172a',
      dim: p.dim !== false,
      zoom: Number.isFinite(p.zoom) ? p.zoom : DEFAULT_ZOOM
    };
  });

  const handleFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (!ALLOWED_TYPES.includes(f.type)) {
      alert('Please choose a PNG or JPG image.');
      return;
    }
    if (f.size > MAX_BYTES) {
      alert('Image size must be 10MB or smaller.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setLocalPref((prev) => ({
        ...prev,
        mode: BG_MODES.custom,
        customImage: reader.result,
        customUrl: ''
      }));
    };
    reader.readAsDataURL(f);
    e.target.value = '';
  };

  const handleUrlChange = (value) => {
    setLocalPref((prev) => ({
      ...prev,
      mode: value ? BG_MODES.custom : BG_MODES.cycle,
      customUrl: value,
      customImage: ''
    }));
  };

  const previewImage = (() => {
    if (localPref.mode === BG_MODES.custom) {
      return localPref.customImage || localPref.customUrl || null;
    }
    if (localPref.mode === BG_MODES.cycle) return CYCLE_IMAGES.noon;
    if (localPref.mode === BG_MODES.logo) return LOGO_IMAGE;
    if (localPref.mode === BG_MODES.solid) return null;
    return CYCLE_IMAGES.noon;
  })();

  const handleSave = () => {
    const next = {
      mode: localPref.mode,
      customImage: localPref.customImage || null,
      customUrl: localPref.customUrl ? String(localPref.customUrl).trim() : null,
      solidColor: localPref.mode === BG_MODES.solid ? localPref.solidColor : null,
      dim: localPref.dim,
      zoom: Number.isFinite(localPref.zoom) ? localPref.zoom : DEFAULT_ZOOM
    };
    if (next.mode === BG_MODES.custom && !next.customImage && !next.customUrl) {
      alert('Please upload an image or enter a URL for the custom background.');
      return;
    }
    updatePreference(next);
    onClose();
  };

  const handleReset = () => {
    const next = { ...DEFAULT_BACKGROUND_PREFERENCE };
    setLocalPref({
      mode: next.mode,
      customImage: next.customImage,
      customUrl: next.customUrl,
      solidColor: '#0f172a',
      dim: next.dim,
      zoom: next.zoom
    });
    resetPreference();
    onClose();
  };

  if (!visible) return null;

  return (
    <div className="bg-customizer-overlay" role="presentation" onClick={onClose}>
      <div
        className="bg-customizer"
        role="dialog"
        aria-modal="true"
        aria-label="Customize Background"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-customizer-header">
          <h3 className="bg-customizer-title">Background Customizer</h3>
          <button
            type="button"
            className="bg-customizer-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <p className="bg-customizer-hint">
          Your preference is saved per account and syncs across devices.
        </p>

        <div className="bg-preview">
          <div
            className="bg-preview-image"
            style={{
              backgroundImage: previewImage ? `url(${previewImage})` : 'none',
              backgroundColor: !previewImage ? localPref.solidColor : 'transparent',
              backgroundSize: localPref.zoom === 100 ? 'cover' : `${localPref.zoom}%`,
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          />
          <div className="bg-preview-label">{describeMode(localPref)}</div>
        </div>

        <div className="bg-presets">
          {presetOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`bg-preset ${localPref.mode === opt.value ? 'bg-preset-active' : ''}`}
              onClick={() => setLocalPref((p) => ({
                ...p,
                mode: opt.value,
                ...(opt.value === BG_MODES.solid ? { solidColor: p.solidColor || '#0f172a' } : {})
              }))}
            >
              <span className="bg-preset-icon">{opt.icon}</span>
              <span className="bg-preset-label">{opt.label}</span>
            </button>
          ))}
        </div>

        {localPref.mode === BG_MODES.solid && (
          <div className="bg-solid-group">
            <label className="bg-solid-label">Solid color</label>
            <div className="bg-color-row">
              <input
                type="color"
                className="bg-color-swatch"
                value={localPref.solidColor || '#0f172a'}
                onChange={(e) => setLocalPref((p) => ({ ...p, solidColor: e.target.value }))}
              />
              <input
                type="text"
                className="bg-color-input"
                value={localPref.solidColor || '#0f172a'}
                onChange={(e) => setLocalPref((p) => ({ ...p, solidColor: e.target.value }))}
                placeholder="#000000"
              />
            </div>
            <div className="bg-swatch-grid">
              {COLOR_SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="bg-swatch"
                  style={{
                    background: c,
                    ...(localPref.solidColor === c
                      ? { boxShadow: '0 0 0 2px var(--color-primary)' }
                      : {})
                  }}
                  onClick={() => setLocalPref((p) => ({ ...p, solidColor: c }))}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
        )}

        <div className="bg-custom-row">
          <button
            type="button"
            className="bg-custom-upload"
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            disabled={isSaving}
          >
            Upload Image
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
            onChange={handleFile}
            style={{ display: 'none' }}
          />
          <input
            type="url"
            className="bg-custom-url"
            placeholder="https://example.com/image.jpg"
            value={localPref.customUrl || ''}
            onChange={(e) => handleUrlChange(e.target.value)}
            disabled={isSaving}
          />
        </div>

        <div className="bg-options-row">
          <label className="bg-option-switch">
            <input
              type="checkbox"
              checked={localPref.dim}
              onChange={(e) => setLocalPref((p) => ({ ...p, dim: e.target.checked }))}
              disabled={isSaving}
            />
            <span>Dim overlay for readability</span>
          </label>
        </div>

        <div className="bg-zoom-row">
          <label className="bg-zoom-label">Background zoom: {localPref.zoom}%</label>
          <input
            type="range"
            className="bg-zoom-slider"
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            step={5}
            value={localPref.zoom}
            onChange={(e) => setLocalPref((p) => ({ ...p, zoom: Number(e.target.value) }))}
            disabled={isSaving}
          />
          <div className="bg-zoom-ticks">
            <span>{ZOOM_MIN}%</span>
            <span>100%</span>
            <span>{ZOOM_MAX}%</span>
          </div>
          <small className="bg-zoom-hint">Lower zooms shrink the image (good for the logo); higher zooms enlarge it.</small>
        </div>

        <div className="bg-customizer-actions">
          <button
            type="button"
            className="bg-action bg-action-secondary"
            onClick={handleReset}
            disabled={isSaving}
          >
            Reset to Default
          </button>
          <button
            type="button"
            className="bg-action bg-action-primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving…' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BackgroundCustomizer;
