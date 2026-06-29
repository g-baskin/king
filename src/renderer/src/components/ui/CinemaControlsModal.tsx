import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from '@/components/icons';
import {
  APERTURES,
  CAMERAS,
  CINEMA_ASSET_URLS,
  FILTERS,
  FILM_STOCKS,
  FOCAL_LENGTHS,
  FOCUS_DISTANCES,
  ISOS,
  LENSES,
  ND_STRENGTHS,
  SHUTTERS,
  type CinemaSettings,
} from '@/lib/cinema-prompt';

export interface CinemaControlsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: CinemaSettings;
  onSettingsChange: (next: CinemaSettings) => void;
  onApply?: () => void;
}

type ColumnKey =
  | 'camera'
  | 'lens'
  | 'focal'
  | 'aperture'
  | 'shutter'
  | 'iso'
  | 'filmStock'
  | 'focusDistance'
  | 'filter'
  | 'ndStrength';

type PreviewStyle = 'ugc' | 'person' | 'photoshoot' | 'landscape';

const PREVIEW_STYLES: Array<{ id: PreviewStyle; label: string; imageUrl: string }> = [
  {
    id: 'ugc',
    label: 'UGC',
    imageUrl: '/assets/cinema/output-previews/filter-no-filter.jpg',
  },
  {
    id: 'person',
    label: 'Person',
    imageUrl: '/assets/cinema/output-previews/portrait.jpg',
  },
  {
    id: 'photoshoot',
    label: 'Photoshoot',
    imageUrl: '/assets/cinema/output-previews/filmStock-portra-warm-skin.jpg',
  },
  {
    id: 'landscape',
    label: 'Landscape',
    imageUrl: '/assets/cinema/output-previews/landscape.jpg',
  },
];

function getPreviewStyle(style: PreviewStyle) {
  return (
    PREVIEW_STYLES.find((entry) => entry.id === style) ?? {
      id: 'landscape',
      label: 'Landscape',
      imageUrl: '/assets/cinema/output-previews/landscape.jpg',
    }
  );
}

function getFocalPreviewLabel(focal: number): string {
  if (focal <= 14) return 'Ultra-wide field';
  if (focal <= 24) return 'Wide field';
  if (focal <= 40) return 'Natural field';
  if (focal <= 65) return 'Standard field';
  if (focal <= 100) return 'Portrait compression';
  return 'Telephoto compression';
}

function getAperturePreviewLabel(aperture: string): string {
  if (aperture === 'f/1.4') return 'Creamy shallow focus';
  if (aperture === 'f/2') return 'Soft subject separation';
  if (aperture === 'f/2.8') return 'Controlled shallow focus';
  if (aperture === 'f/4') return 'Balanced focus falloff';
  if (aperture === 'f/5.6') return 'Subject and setting clarity';
  if (aperture === 'f/8') return 'Crisp environmental depth';
  if (aperture === 'f/11') return 'Deep-focus clarity';
  return 'Maximum deep focus';
}

function getLensPreviewLabel(lens: string): string {
  if (lens.includes('Tilt')) return 'Selective focus plane and miniature edge blur';
  if (lens === 'Compact Anamorphic') return 'Wide squeeze, oval bokeh, compact flare';
  if (lens === 'Classic Anamorphic') return 'Widescreen compression, oval bokeh, blue streaks';
  if (lens.includes('Macro')) return 'Close-focus magnification with shallow falloff';
  if (lens.includes('Swirl')) return 'Curved field edges and circular background motion';
  if (lens.includes('Halation') || lens.includes('Diffusion'))
    return 'Glowing highlights and softened microcontrast';
  if (lens.includes('Clinical')) return 'Crisp microcontrast, clean edges, minimal aberration';
  if (lens.includes('70s')) return 'Lower contrast, warm vintage flare response';
  if (lens.includes('Vintage')) return 'Soft contrast and imperfect glass texture';
  if (lens.includes('Warm')) return 'Warm skin tones and gentle highlight bloom';
  return 'Clean contrast, controlled focus, polished rendering';
}

function getShutterPreviewLabel(shutter: string): string {
  if (shutter.includes('1000')) return 'Frozen action, crisp motion detail';
  if (shutter.includes('250')) return 'Crisp action, minimal blur';
  if (shutter.includes('125')) return 'Natural handheld motion';
  if (shutter.includes('48')) return 'Cinematic motion blur';
  if (shutter.includes('15')) return 'Expressive motion drag';
  return 'Luminous long-exposure trails';
}

function getIsoPreviewLabel(iso: string): string {
  if (iso.includes('100')) return 'Clean shadows, minimal grain';
  if (iso.includes('400')) return 'Subtle organic texture';
  if (iso.includes('800')) return 'Available-light sensitivity';
  if (iso.includes('1600')) return 'Visible cinematic grain';
  return 'Pronounced pushed night grain';
}

function getFilmStockPreviewLabel(filmStock: string): string {
  if (filmStock.includes('2383')) return 'Rich print contrast, warm highlights';
  if (filmStock.includes('Portra')) return 'Warm skin, soft pastel response';
  if (filmStock.includes('Ektachrome')) return 'Saturated slide-film color';
  if (filmStock.includes('Bleach')) return 'Desaturated silver contrast';
  if (filmStock.includes('Teal')) return 'Cool cyan shadows, restrained warmth';
  return 'Accurate neutral color science';
}

function getFocusPreviewLabel(focusDistance: string): string {
  if (focusDistance.includes('Macro')) return 'Magnified close-focus detail';
  if (focusDistance.includes('Subject')) return 'Isolated subject plane';
  if (focusDistance.includes('Zone')) return 'Layered midground sharpness';
  if (focusDistance.includes('Background')) return 'Readable subject and setting';
  return 'Distant landscape clarity';
}

function getFilterPreviewLabel(filter: string): string {
  if (filter === 'No Filter') return 'Clean unfiltered capture';
  if (filter.includes('Pro-Mist')) return 'Blooming highlights, softened contrast';
  if (filter.includes('Glimmer')) return 'Pearlescent glow and smooth skin';
  if (filter.includes('ND')) return 'Controlled bright-light exposure';
  if (filter.includes('Polarizer')) return 'Reduced glare, deeper skies';
  return 'Radiant highlight spikes';
}

function getNdStrengthPreviewLabel(ndStrength: string): string {
  if (ndStrength.includes('10')) return 'Extreme daylight long-exposure control';
  if (ndStrength.includes('6')) return 'Strong bright-scene motion control';
  if (ndStrength.includes('4')) return 'Wide-open aperture in harsh sun';
  if (ndStrength.includes('3')) return 'Rich sky detail with natural motion';
  if (ndStrength.includes('2')) return 'Balanced exposure trim';
  return 'Gentle one-stop highlight control';
}

function getLensPreviewBadge(lens: string): string {
  if (lens.includes('Tilt')) return 'Tilt';
  if (lens.includes('Anamorphic')) return 'Flare';
  if (lens.includes('Macro')) return 'Macro';
  if (lens.includes('Swirl')) return 'Swirl';
  if (lens.includes('Halation') || lens.includes('Diffusion')) return 'Glow';
  if (lens.includes('Clinical')) return 'Sharp';
  if (lens.includes('Vintage') || lens.includes('70s') || lens.includes('Warm')) return 'Warm';
  return 'Prime';
}

const OUTPUT_PREVIEW_FALLBACK_URLS: Record<ColumnKey, string> = {
  camera: '/assets/cinema/output-previews/camera.jpg',
  lens: '/assets/cinema/output-previews/lens.jpg',
  focal: '/assets/cinema/output-previews/focal.jpg',
  aperture: '/assets/cinema/output-previews/aperture.jpg',
  shutter: '/assets/cinema/output-previews/shutter.jpg',
  iso: '/assets/cinema/output-previews/iso.jpg',
  filmStock: '/assets/cinema/output-previews/filmStock.jpg',
  focusDistance: '/assets/cinema/output-previews/focusDistance.jpg',
  filter: '/assets/cinema/output-previews/filter.jpg',
  ndStrength: '/assets/cinema/output-previews/ndStrength.jpg',
};

function getCameraPreviewBadge(camera: string): string {
  if (camera.includes('IMAX')) return 'IMAX';
  if (camera.includes('Speed')) return 'HFR';
  if (camera.includes('CCD')) return 'CCD';
  if (camera.includes('70mm')) return '70mm';
  if (camera.includes('16mm')) return 'Film';
  if (camera.includes('S35')) return 'S35';
  if (camera.includes('8K')) return '8K';
  if (camera.includes('Full-Frame')) return 'FF';
  return 'LF';
}

function getOutputPreviewBadge(columnKey: ColumnKey, value: string | number): string {
  const valueText = String(value);
  if (columnKey === 'camera') return getCameraPreviewBadge(valueText);
  if (columnKey === 'lens') return getLensPreviewBadge(valueText);
  if (columnKey === 'focal') return `${String(value)}mm`;
  if (columnKey === 'shutter') return valueText.split(' ')[0] ?? valueText;
  if (columnKey === 'iso') return valueText.replace('ISO ', '').split(' ')[0] ?? valueText;
  if (columnKey === 'filmStock') return valueText.includes('Neutral') ? 'Clean' : 'Grade';
  if (columnKey === 'focusDistance') return 'Focus';
  if (columnKey === 'filter') return valueText === 'No Filter' ? 'Clean' : 'Filter';
  if (columnKey === 'ndStrength') return valueText.split('/')[0]?.trim() ?? 'ND';
  return valueText;
}

function getOutputPreviewSlug(value: string | number): string {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function getRealOutputPhotoUrl(columnKey: ColumnKey, value: string | number): string {
  return `/assets/cinema/output-previews/${columnKey}-${getOutputPreviewSlug(value)}.jpg`;
}

function getFocalPreviewScale(focal: number): number {
  if (focal <= 8) return 1;
  if (focal <= 14) return 1.08;
  if (focal <= 18) return 1.16;
  if (focal <= 24) return 1.28;
  if (focal <= 28) return 1.38;
  if (focal <= 35) return 1.52;
  if (focal <= 40) return 1.65;
  if (focal <= 50) return 1.85;
  if (focal <= 65) return 2.1;
  if (focal <= 85) return 2.45;
  if (focal <= 100) return 2.75;
  return 3.15;
}

function getFocalPreviewOrigin(style: PreviewStyle): string {
  if (style === 'ugc') return '50% 42%';
  if (style === 'person' || style === 'photoshoot') return '48% 35%';
  return '50% 50%';
}

function FocalPhotoPreview({ focal, previewStyle }: { focal: number; previewStyle: PreviewStyle }) {
  const selectedStyle = getPreviewStyle(previewStyle);
  const scale = getFocalPreviewScale(focal);
  const origin = getFocalPreviewOrigin(previewStyle);

  return (
    <div className="relative size-full overflow-hidden bg-[var(--base-color-brand--bean)]">
      <img
        key={`${previewStyle}-${String(focal)}`}
        src={selectedStyle.imageUrl}
        alt={`${String(focal)}mm ${selectedStyle.label.toLowerCase()} focal length preview`}
        className="size-full object-cover"
        loading="lazy"
        style={{ transform: `scale(${String(scale)})`, transformOrigin: origin }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_36%,rgba(42,24,17,0.5))]" />
      <span className="absolute right-1.5 bottom-1.5 rounded-full bg-[var(--base-color-brand--shell)]/90 px-1.5 py-0.5 text-[9px] font-bold text-[var(--base-color-brand--bean)] shadow-sm">
        {String(focal)}mm
      </span>
    </div>
  );
}

function OutputPhotoPreview({
  columnKey,
  value,
  previewStyle,
}: {
  columnKey: ColumnKey;
  value: string | number;
  previewStyle: PreviewStyle;
}) {
  if (columnKey === 'focal') {
    return <FocalPhotoPreview focal={Number(value)} previewStyle={previewStyle} />;
  }

  const valueText = String(value);
  const badge = getOutputPreviewBadge(columnKey, value);
  const photoUrl = getRealOutputPhotoUrl(columnKey, value);

  return (
    <div className="relative size-full overflow-hidden bg-[var(--base-color-brand--bean)]">
      <img
        key={`${columnKey}-${valueText}`}
        src={photoUrl}
        alt={`${valueText} example output`}
        className="size-full object-cover"
        loading="lazy"
        onError={(event) => {
          const fallbackUrl = OUTPUT_PREVIEW_FALLBACK_URLS[columnKey];
          if (!event.currentTarget.src.endsWith(fallbackUrl)) {
            event.currentTarget.src = fallbackUrl;
          }
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_36%,rgba(42,24,17,0.5))]" />
      <span className="absolute right-1.5 bottom-1.5 rounded-full bg-[var(--base-color-brand--shell)]/90 px-1.5 py-0.5 text-[9px] font-bold text-[var(--base-color-brand--bean)] shadow-sm">
        {badge}
      </span>
    </div>
  );
}

function getNdStopCount(ndStrength: string): number {
  if (ndStrength.includes('Variable')) return 3.5;
  const match = /(\d+)\s+Stops?/i.exec(ndStrength);
  return match ? Number(match[1]) : 0;
}

function getCombinedPreviewFilter(settings: CinemaSettings): string {
  const ndStops = settings.filter === 'ND Filter' ? getNdStopCount(settings.ndStrength) : 0;
  const ndBrightness = Math.max(0.62, 1 - ndStops * 0.035);
  const isoBrightness = settings.iso.includes('3200')
    ? 1.08
    : settings.iso.includes('1600')
      ? 1.04
      : 1;
  const filmSaturation = settings.filmStock.includes('Ektachrome')
    ? 1.22
    : settings.filmStock.includes('Bleach')
      ? 0.68
      : settings.filmStock.includes('Teal')
        ? 0.88
        : 1.04;
  const filmContrast = settings.filmStock.includes('2383')
    ? 1.14
    : settings.filmStock.includes('Bleach')
      ? 1.22
      : 1.04;
  const focalContrast = settings.focal >= 85 ? 1.04 : settings.focal <= 18 ? 0.98 : 1;
  const cameraClarity =
    settings.camera.includes('IMAX') || settings.camera.includes('70mm')
      ? 1.06
      : settings.camera.includes('CCD') || settings.camera.includes('16mm')
        ? 0.94
        : 1;
  const diffusionSoftness =
    settings.filter.includes('Pro-Mist') ||
    settings.filter.includes('Glimmer') ||
    settings.lens.includes('Diffusion')
      ? 0.96
      : 1;
  const hue = settings.filmStock.includes('Teal') ? 'hue-rotate(-7deg)' : '';
  const brightness = (ndBrightness * isoBrightness * diffusionSoftness).toFixed(2);
  const contrast = (filmContrast * focalContrast * cameraClarity).toFixed(2);

  return `brightness(${brightness}) contrast(${contrast}) saturate(${filmSaturation}) ${hue}`.trim();
}

function getCombinedPreviewScale(settings: CinemaSettings): number {
  if (settings.focal <= 14) return 1;
  if (settings.focal <= 24) return 1.03;
  if (settings.focal <= 40) return 1.06;
  if (settings.focal <= 65) return 1.1;
  if (settings.focal <= 100) return 1.16;
  return 1.22;
}

function getCombinedPreviewMotionClass(shutter: string): string {
  if (shutter.includes('Long')) return 'opacity-45 blur-[18px]';
  if (shutter.includes('15')) return 'opacity-35 blur-[14px]';
  if (shutter.includes('48')) return 'opacity-20 blur-[8px]';
  return 'opacity-0 blur-none';
}

function getCombinedPreviewGrainOpacity(settings: CinemaSettings): number {
  const isoOpacity = settings.iso.includes('3200')
    ? 0.34
    : settings.iso.includes('1600')
      ? 0.24
      : settings.iso.includes('800')
        ? 0.16
        : settings.iso.includes('400')
          ? 0.1
          : 0.04;
  const cameraTexture =
    settings.camera.includes('16mm') || settings.camera.includes('CCD') ? 0.08 : 0;
  return Math.min(0.42, isoOpacity + cameraTexture);
}

function getCombinedPreviewFocusBlur(settings: CinemaSettings): number {
  const apertureBlur =
    settings.aperture === 'f/1.4'
      ? 4
      : settings.aperture === 'f/2'
        ? 3
        : settings.aperture === 'f/2.8'
          ? 2
          : settings.aperture === 'f/4'
            ? 1
            : 0;
  const focusBlur = settings.focusDistance.includes('Macro')
    ? 2
    : settings.focusDistance.includes('Subject')
      ? 1
      : settings.focusDistance.includes('Deep') || settings.focusDistance.includes('Infinity')
        ? -1
        : 0;
  return Math.max(0, apertureBlur + focusBlur);
}

function getCombinedPreviewFocusMask(focusDistance: string): string {
  if (focusDistance.includes('Macro')) {
    return 'radial-gradient(circle at 42% 52%, transparent 0 24%, black 46%)';
  }
  if (focusDistance.includes('Subject')) {
    return 'radial-gradient(circle at 45% 50%, transparent 0 36%, black 62%)';
  }
  if (focusDistance.includes('Zone')) {
    return 'linear-gradient(90deg, black 0 16%, transparent 34% 68%, black 84% 100%)';
  }
  return 'linear-gradient(180deg, transparent 0%, black 100%)';
}

function getCombinedPreviewFlareOpacity(settings: CinemaSettings): number {
  if (settings.filter === 'Star Filter') return 0.55;
  if (settings.lens.includes('Anamorphic')) return 0.42;
  if (
    settings.filter.includes('Pro-Mist') ||
    settings.filter.includes('Glimmer') ||
    settings.lens.includes('Diffusion')
  ) {
    return 0.3;
  }
  return 0;
}

function getCombinedPreviewVignetteOpacity(aperture: string): number {
  if (aperture === 'f/1.4' || aperture === 'f/2') return 0.28;
  if (aperture === 'f/2.8' || aperture === 'f/4') return 0.18;
  return 0.08;
}

function getCombinedPreviewChips(
  settings: CinemaSettings,
): Array<{ label: string; value: string }> {
  return [
    { label: 'Camera', value: settings.camera },
    { label: 'Lens', value: settings.lens },
    { label: 'Focal', value: `${String(settings.focal)}mm` },
    { label: 'Aperture', value: settings.aperture },
    { label: 'Shutter', value: settings.shutter },
    { label: 'ISO', value: settings.iso },
    { label: 'Film', value: settings.filmStock },
    { label: 'Focus', value: settings.focusDistance },
    {
      label: 'Filter',
      value:
        settings.filter === 'ND Filter'
          ? `${settings.filter} · ${settings.ndStrength}`
          : settings.filter,
    },
  ];
}

function CombinedLookPreview({
  settings,
  previewStyle,
}: {
  settings: CinemaSettings;
  previewStyle: PreviewStyle;
}) {
  const selectedStyle = getPreviewStyle(previewStyle);
  const filterStyle = getCombinedPreviewFilter(settings);
  const imageScale = getCombinedPreviewScale(settings);
  const grainOpacity = getCombinedPreviewGrainOpacity(settings);
  const focusBlur = getCombinedPreviewFocusBlur(settings);
  const focusMask = getCombinedPreviewFocusMask(settings.focusDistance);
  const flareOpacity = getCombinedPreviewFlareOpacity(settings);
  const vignetteOpacity = getCombinedPreviewVignetteOpacity(settings.aperture);
  const chips = getCombinedPreviewChips(settings);

  return (
    <div className="mb-4 overflow-hidden rounded-3xl border border-[var(--base-color-brand--umber)]/25 bg-[var(--base-color-brand--champagne)]/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
      <div className="grid min-h-40 grid-cols-1 lg:grid-cols-[minmax(260px,0.9fr)_minmax(0,1.1fr)]">
        <div className="relative min-h-40 overflow-hidden bg-[var(--base-color-brand--bean)]">
          <img
            src={selectedStyle.imageUrl}
            alt={`${selectedStyle.label} combined cinema settings preview`}
            className="absolute inset-0 size-full object-cover"
            style={{ filter: filterStyle, transform: `scale(${String(imageScale)})` }}
          />
          <div
            className={`absolute inset-0 bg-cover bg-center ${getCombinedPreviewMotionClass(settings.shutter)}`}
            style={{
              backgroundImage: `url(${selectedStyle.imageUrl})`,
              filter: filterStyle,
              transform: `translateX(18px) scale(${String(imageScale + 0.02)})`,
            }}
          />
          {focusBlur > 0 && (
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backdropFilter: `blur(${String(focusBlur)}px)`,
                WebkitBackdropFilter: `blur(${String(focusBlur)}px)`,
                maskImage: focusMask,
                WebkitMaskImage: focusMask,
              }}
            />
          )}
          <div
            className="pointer-events-none absolute top-1/2 -left-1/4 h-8 w-[150%] -translate-y-1/2 rotate-[-8deg] bg-[linear-gradient(90deg,transparent,rgba(255,238,203,0.82),transparent)] blur-xl"
            style={{ opacity: flareOpacity }}
          />
          <div
            className="pointer-events-none absolute inset-0 mix-blend-overlay"
            style={{
              opacity: grainOpacity,
              backgroundImage:
                'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.75) 0 1px, transparent 1px), radial-gradient(circle at 70% 60%, rgba(0,0,0,0.5) 0 1px, transparent 1px)',
              backgroundSize: '7px 7px, 11px 11px',
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_45%_44%,transparent_0,rgba(42,24,17,0.72)_100%)]"
            style={{ opacity: vignetteOpacity }}
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_38%,rgba(42,24,17,0.62))]" />
          <span className="absolute bottom-3 left-3 rounded-full bg-[var(--base-color-brand--shell)]/92 px-3 py-1 text-[10px] font-bold tracking-[0.14em] text-[var(--base-color-brand--bean)] uppercase shadow-sm">
            Combined look
          </span>
        </div>
        <div className="min-w-0 p-3 sm:p-4">
          <div className="text-[9px] font-bold tracking-[0.2em] text-[var(--base-color-brand--umber)] uppercase">
            Live estimated output
          </div>
          <div className="mt-1 text-base font-semibold text-[var(--base-color-brand--bean)]">
            This preview reacts to every current selection.
          </div>
          <p className="mt-1 text-xs leading-snug font-medium text-[var(--base-color-brand--umber)]">
            It uses one real sample image plus dynamic framing, depth, exposure, grade, grain,
            motion, and filter rules so we do not need a static photo for every possible
            combination.
          </p>
          <div className="mt-3 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto pr-1 text-[10px] font-semibold text-[var(--base-color-brand--bean)]">
            {chips.map((chip) => (
              <span
                key={chip.label}
                className="rounded-full bg-[var(--base-color-brand--shell)] px-2 py-1"
              >
                <span className="text-[var(--base-color-brand--umber)]">{chip.label}:</span>{' '}
                {chip.value}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewStylePicker({
  value,
  onChange,
}: {
  value: PreviewStyle;
  onChange: (next: PreviewStyle) => void;
}) {
  return (
    <div className="mb-4 rounded-3xl border border-[var(--base-color-brand--umber)]/20 bg-[var(--base-color-brand--champagne)]/45 p-2">
      <div className="mb-2 px-1 text-[9px] font-bold tracking-[0.18em] text-[var(--base-color-brand--umber)] uppercase">
        Preview image style
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4">
        {PREVIEW_STYLES.map((style) => {
          const isSelected = style.id === value;
          return (
            <button
              key={style.id}
              type="button"
              onClick={() => {
                onChange(style.id);
              }}
              className={`flex min-w-0 items-center gap-2 rounded-2xl border p-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--base-color-brand--cinamon)] ${
                isSelected
                  ? 'border-[var(--base-color-brand--cinamon)]/55 bg-[var(--base-color-brand--shell)] text-[var(--base-color-brand--cinamon)] shadow-[0_0_18px_-8px_var(--base-color-brand--cinamon)]'
                  : 'border-[var(--base-color-brand--umber)]/20 bg-[var(--base-color-brand--shell)]/60 text-[var(--base-color-brand--bean)] hover:border-[var(--base-color-brand--cinamon)]/35'
              }`}
            >
              <span className="size-9 shrink-0 overflow-hidden rounded-xl bg-[var(--base-color-brand--bean)]">
                <img src={style.imageUrl} alt="" className="size-full object-cover" />
              </span>
              <span className="truncate text-[10px] font-bold tracking-wide uppercase">
                {style.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function getSelectionDetail(columnKey: ColumnKey, value: string | number): string {
  if (columnKey === 'focal') return getFocalPreviewLabel(Number(value));
  if (columnKey === 'aperture') return getAperturePreviewLabel(String(value));
  if (columnKey === 'lens') return getLensPreviewLabel(String(value));
  if (columnKey === 'shutter') return getShutterPreviewLabel(String(value));
  if (columnKey === 'iso') return getIsoPreviewLabel(String(value));
  if (columnKey === 'filmStock') return getFilmStockPreviewLabel(String(value));
  if (columnKey === 'focusDistance') return getFocusPreviewLabel(String(value));
  if (columnKey === 'filter') return getFilterPreviewLabel(String(value));
  if (columnKey === 'ndStrength') return getNdStrengthPreviewLabel(String(value));
  return 'Camera body';
}

function DashboardControlCard({
  title,
  items,
  columnKey,
  value,
  previewStyle,
  onChange,
}: {
  title: string;
  items: Array<string | number>;
  columnKey: ColumnKey;
  value: string | number;
  previewStyle: PreviewStyle;
  onChange: (val: string | number) => void;
}) {
  const currentValue = String(value);
  const currentDetail = getSelectionDetail(columnKey, value);

  return (
    <section className="flex min-h-[21rem] min-w-0 flex-col overflow-hidden rounded-3xl border border-[var(--base-color-brand--umber)]/25 bg-[var(--base-color-brand--champagne)]/65 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_5rem] items-center gap-3 border-b border-[var(--base-color-brand--umber)]/15 p-3">
        <div className="min-w-0">
          <div
            className="text-[9px] font-bold tracking-[0.18em] text-[var(--base-color-brand--umber)] uppercase"
            style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
          >
            {title}
          </div>
          <div className="mt-1 truncate text-sm font-semibold text-[var(--base-color-brand--bean)]">
            {currentValue}
          </div>
          <div className="line-clamp-2 text-[11px] leading-snug font-medium text-[var(--base-color-brand--umber)]">
            {currentDetail}
          </div>
        </div>
        <div className="h-20 min-w-0 overflow-hidden rounded-2xl border border-[var(--base-color-brand--umber)]/25 bg-[var(--base-color-brand--shell)] shadow-inner">
          <OutputPhotoPreview columnKey={columnKey} value={value} previewStyle={previewStyle} />
        </div>
      </div>

      <div
        role="listbox"
        aria-label={title}
        className="grid max-h-72 min-h-0 flex-1 auto-rows-min gap-2 overflow-y-auto p-3"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(8.5rem, 1fr))' }}
      >
        {items.map((item) => {
          const itemText = String(item);
          const imageUrl = CINEMA_ASSET_URLS[itemText];
          const isSelected = itemText === currentValue;

          return (
            <button
              key={itemText}
              type="button"
              role="option"
              aria-selected={isSelected}
              title={itemText}
              onClick={() => {
                onChange(columnKey === 'focal' ? Number(item) : itemText);
              }}
              className={`min-w-0 rounded-2xl border p-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--base-color-brand--cinamon)] ${
                isSelected
                  ? 'border-[var(--base-color-brand--cinamon)]/55 bg-[var(--base-color-brand--shell)] text-[var(--base-color-brand--cinamon)] shadow-[0_0_18px_-8px_var(--base-color-brand--cinamon)]'
                  : 'border-[var(--base-color-brand--umber)]/20 bg-[var(--base-color-brand--shell)]/60 text-[var(--base-color-brand--bean)] hover:border-[var(--base-color-brand--cinamon)]/35 hover:bg-[var(--base-color-brand--shell)]'
              }`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--base-color-brand--umber)]/25 bg-[var(--base-color-brand--shell)] shadow-inner">
                  {columnKey === 'focal' ? (
                    <OutputPhotoPreview
                      columnKey="focal"
                      value={item}
                      previewStyle={previewStyle}
                    />
                  ) : imageUrl ? (
                    <img src={imageUrl} alt="" className="size-full object-cover opacity-90" />
                  ) : (
                    <span className="size-3 rounded-full bg-[var(--base-color-brand--umber)]/30" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="line-clamp-2 text-[10px] leading-[1.15] font-bold tracking-wide break-words uppercase">
                    {itemText}
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function CinemaControlsModal({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
  onApply,
}: CinemaControlsModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const [draftSettings, setDraftSettings] = useState(settings);
  const [previewStyle, setPreviewStyle] = useState<PreviewStyle>('landscape');

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  const update = (key: keyof CinemaSettings) => (val: string | number) => {
    setDraftSettings((current) => ({
      ...current,
      [key]: key === 'focal' ? Number(val) : val,
    }));
  };

  useEffect(() => {
    if (!isOpen) return;
    setDraftSettings(settings);
  }, [isOpen, settings]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden p-3 sm:p-4"
      style={{ willChange: 'opacity' }}
      onClick={handleBackdropClick}
    >
      <div className="fixed inset-0 bg-[var(--base-color-brand--bean)]/55 backdrop-blur-md" />
      <div
        className="relative z-10 flex max-h-[calc(100vh-1.5rem)] w-full max-w-7xl flex-col overflow-hidden rounded-3xl border border-[var(--base-color-brand--umber)]/40 bg-[var(--base-color-brand--shell)] p-4 shadow-2xl sm:max-h-[calc(100vh-2rem)] md:p-6"
        style={{ willChange: 'transform, opacity' }}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2
              className="text-lg font-semibold text-[var(--base-color-brand--bean)] md:text-xl"
              style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
            >
              Camera configuration
            </h2>
            <p className="mt-1 text-[11px] font-medium tracking-[0.2em] text-[var(--base-color-brand--umber)] uppercase">
              Hardware, optics, and exposure
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full border border-[var(--base-color-brand--umber)]/40 bg-[var(--base-color-brand--champagne)] p-2 text-[var(--base-color-brand--bean)] transition-colors hover:bg-[var(--base-color-brand--bean)] hover:text-[var(--base-color-brand--shell)]"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-[minmax(20rem,0.85fr)_minmax(0,1.45fr)] xl:items-start">
            <div className="sticky top-0 z-10 min-w-0 bg-[var(--base-color-brand--shell)] pb-1">
              <PreviewStylePicker value={previewStyle} onChange={setPreviewStyle} />
              <CombinedLookPreview settings={draftSettings} previewStyle={previewStyle} />
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
              <DashboardControlCard
                title="Camera"
                items={CAMERAS}
                columnKey="camera"
                value={draftSettings.camera}
                previewStyle={previewStyle}
                onChange={update('camera')}
              />
              <DashboardControlCard
                title="Lens"
                items={LENSES}
                columnKey="lens"
                value={draftSettings.lens}
                previewStyle={previewStyle}
                onChange={update('lens')}
              />
              <DashboardControlCard
                title="Focal length"
                items={FOCAL_LENGTHS}
                columnKey="focal"
                value={draftSettings.focal}
                previewStyle={previewStyle}
                onChange={update('focal')}
              />
              <DashboardControlCard
                title="Aperture"
                items={APERTURES}
                columnKey="aperture"
                value={draftSettings.aperture}
                previewStyle={previewStyle}
                onChange={update('aperture')}
              />
              <DashboardControlCard
                title="Shutter"
                items={SHUTTERS}
                columnKey="shutter"
                value={draftSettings.shutter}
                previewStyle={previewStyle}
                onChange={update('shutter')}
              />
              <DashboardControlCard
                title="ISO"
                items={ISOS}
                columnKey="iso"
                value={draftSettings.iso}
                previewStyle={previewStyle}
                onChange={update('iso')}
              />
              <DashboardControlCard
                title="Film stock"
                items={FILM_STOCKS}
                columnKey="filmStock"
                value={draftSettings.filmStock}
                previewStyle={previewStyle}
                onChange={update('filmStock')}
              />
              <DashboardControlCard
                title="Focus"
                items={FOCUS_DISTANCES}
                columnKey="focusDistance"
                value={draftSettings.focusDistance}
                previewStyle={previewStyle}
                onChange={update('focusDistance')}
              />
              <DashboardControlCard
                title="Filter"
                items={FILTERS}
                columnKey="filter"
                value={draftSettings.filter}
                previewStyle={previewStyle}
                onChange={update('filter')}
              />
              {draftSettings.filter === 'ND Filter' && (
                <DashboardControlCard
                  title="ND strength"
                  items={ND_STRENGTHS}
                  columnKey="ndStrength"
                  value={draftSettings.ndStrength}
                  previewStyle={previewStyle}
                  onChange={update('ndStrength')}
                />
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[var(--base-color-brand--umber)]/20 pt-4">
          <div className="min-w-0 flex-1 text-xs break-words text-[var(--base-color-brand--umber)]">
            <span className="font-semibold text-[var(--base-color-brand--bean)]">
              Current input:
            </span>{' '}
            {draftSettings.camera} · {draftSettings.lens} · {draftSettings.focal}mm ·{' '}
            {draftSettings.aperture} · {draftSettings.shutter} · {draftSettings.iso} ·{' '}
            {draftSettings.filmStock} · {draftSettings.focusDistance} · {draftSettings.filter}
            {draftSettings.filter === 'ND Filter' ? ` · ${draftSettings.ndStrength}` : ''}
          </div>
          <button
            type="button"
            onClick={() => {
              onSettingsChange(draftSettings);
              onApply?.();
              onClose();
            }}
            className="rounded-full border-none bg-[var(--base-color-brand--cinamon)] px-6 py-2 text-sm font-semibold text-[var(--base-color-brand--shell)] shadow-[0_3px_0_0_var(--base-color-brand--dark-red)] transition hover:bg-[var(--base-color-brand--red)] active:translate-y-0.5"
          >
            Apply to image input
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
