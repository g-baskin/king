import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from '@/components/icons';
import {
  APERTURES,
  CAMERAS,
  CINEMA_ASSET_URLS,
  FOCAL_LENGTHS,
  LENSES,
  type CinemaSettings,
} from '@/lib/cinema-prompt';

export interface CinemaControlsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: CinemaSettings;
  onSettingsChange: (next: CinemaSettings) => void;
  onApply?: () => void;
}

type ColumnKey = 'camera' | 'lens' | 'focal' | 'aperture';

function getFocalPreviewLabel(focal: number): string {
  if (focal <= 14) return 'Ultra-wide field';
  if (focal <= 24) return 'Wide field';
  if (focal <= 35) return 'Natural field';
  if (focal <= 50) return 'Standard field';
  return 'Portrait compression';
}

function getAperturePreviewLabel(aperture: string): string {
  if (aperture === 'f/1.4') return 'Creamy shallow focus';
  if (aperture === 'f/4') return 'Balanced focus falloff';
  return 'Deep-focus clarity';
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
};

function getCameraPreviewBadge(camera: string): string {
  if (camera.includes('70mm')) return '70mm';
  if (camera.includes('16mm')) return 'Film';
  if (camera.includes('S35')) return 'S35';
  if (camera.includes('8K')) return '8K';
  if (camera.includes('Full-Frame')) return 'FF';
  return 'LF';
}

function getOutputPreviewBadge(columnKey: ColumnKey, value: string | number): string {
  if (columnKey === 'camera') return getCameraPreviewBadge(String(value));
  if (columnKey === 'lens') return getLensPreviewBadge(String(value));
  if (columnKey === 'focal') return `${value}mm`;
  return String(value);
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

function OutputPhotoPreview({
  columnKey,
  value,
}: {
  columnKey: ColumnKey;
  value: string | number;
}) {
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
          event.currentTarget.src = OUTPUT_PREVIEW_FALLBACK_URLS[columnKey];
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_36%,rgba(42,24,17,0.5))]" />
      <span className="absolute right-1.5 bottom-1.5 rounded-full bg-[var(--base-color-brand--shell)]/90 px-1.5 py-0.5 text-[9px] font-bold text-[var(--base-color-brand--bean)] shadow-sm">
        {badge}
      </span>
    </div>
  );
}

function SelectionPreviewCard({
  title,
  value,
  columnKey,
}: {
  title: string;
  value: string | number;
  columnKey: ColumnKey;
}) {
  const detail =
    columnKey === 'focal'
      ? getFocalPreviewLabel(Number(value))
      : columnKey === 'aperture'
        ? getAperturePreviewLabel(String(value))
        : columnKey === 'lens'
          ? getLensPreviewLabel(String(value))
          : 'Camera body';

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_30%] items-center gap-3 rounded-2xl border border-[var(--base-color-brand--umber)]/25 bg-[var(--base-color-brand--champagne)]/70 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
      <div className="min-w-0">
        <div className="text-[9px] font-bold tracking-[0.18em] text-[var(--base-color-brand--umber)] uppercase">
          {title}
        </div>
        <div className="truncate text-sm font-semibold text-[var(--base-color-brand--bean)]">
          {value}
        </div>
        <div className="text-[11px] leading-snug font-medium text-[var(--base-color-brand--umber)]">
          {detail}
        </div>
      </div>
      <div className="h-16 min-w-0 overflow-hidden rounded-xl border border-[var(--base-color-brand--umber)]/25 bg-[var(--base-color-brand--shell)] shadow-inner">
        <OutputPhotoPreview columnKey={columnKey} value={value} />
      </div>
    </div>
  );
}

function ScrollColumn({
  title,
  items,
  columnKey,
  value,
  onChange,
}: {
  title: string;
  items: Array<string | number>;
  columnKey: ColumnKey;
  value: string | number;
  onChange: (val: string | number) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const scrollTopStart = useRef(0);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const timer = setTimeout(() => {
      const target = Array.from(list.children).find(
        (c) => (c as HTMLElement).dataset.value === String(value),
      );
      target?.scrollIntoView({ block: 'center' });
      list.dispatchEvent(new Event('scroll'));
    }, 100);
    return () => {
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial snap only; value sync handled below
  }, []);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const timer = setTimeout(() => {
      const target = Array.from(list.children).find(
        (c) => (c as HTMLElement).dataset.value === String(value),
      );
      target?.scrollIntoView({ block: 'center' });
      list.dispatchEvent(new Event('scroll'));
    }, 60);
    return () => {
      clearTimeout(timer);
    };
  }, [value]);

  const handleScroll = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const centerY = list.scrollTop + list.clientHeight / 2;
    let closest: HTMLElement | null = null;
    let minDist = Infinity;

    const children = Array.from(list.children).filter(
      (c): c is HTMLElement => !!(c as HTMLElement).dataset.value,
    );
    children.forEach((child) => {
      const childCenter = child.offsetTop + child.offsetHeight / 2;
      const dist = Math.abs(centerY - childCenter);
      if (dist < minDist) {
        minDist = dist;
        closest = child;
      }
    });

    children.forEach((child) => {
      const imgBox = child.querySelector('[data-imgbox]');
      const label = child.querySelector('[data-label]');
      const focalSpan = imgBox?.querySelector('[data-focal-text]');
      const isClosest = child === closest;

      if (isClosest) {
        child.classList.remove('opacity-35', 'scale-90', 'blur-[0.5px]');
        child.classList.add('opacity-100', 'scale-100', 'blur-0', 'z-30');
        imgBox?.classList.add(
          'border-[var(--base-color-brand--cinamon)]/50',
          'shadow-[0_0_12px_-2px_var(--base-color-brand--cinamon)]',
          'scale-105',
        );
        imgBox?.classList.remove(
          'border-[var(--base-color-brand--umber)]/30',
          'bg-[var(--base-color-brand--shell)]',
        );
        focalSpan?.classList.add('text-[var(--base-color-brand--cinamon)]');
        focalSpan?.classList.remove('text-[var(--base-color-brand--umber)]');
        label?.classList.add('text-[var(--base-color-brand--cinamon)]');
        label?.classList.remove('text-[var(--base-color-brand--bean)]');
      } else {
        child.classList.add('opacity-35', 'scale-90', 'blur-[0.5px]');
        child.classList.remove('opacity-100', 'scale-100', 'blur-0', 'z-30');
        imgBox?.classList.remove(
          'border-[var(--base-color-brand--cinamon)]/50',
          'shadow-[0_0_12px_-2px_var(--base-color-brand--cinamon)]',
          'scale-105',
        );
        imgBox?.classList.add(
          'border-[var(--base-color-brand--umber)]/30',
          'bg-[var(--base-color-brand--shell)]',
        );
        focalSpan?.classList.remove('text-[var(--base-color-brand--cinamon)]');
        focalSpan?.classList.add('text-[var(--base-color-brand--umber)]');
        label?.classList.remove('text-[var(--base-color-brand--cinamon)]');
        label?.classList.add('text-[var(--base-color-brand--bean)]');
      }
    });

    if (closest) {
      const el = closest as HTMLElement;
      const newVal =
        columnKey === 'focal' ? parseInt(el.dataset.value ?? '35', 10) : el.dataset.value;
      if (String(newVal) !== String(value)) {
        onChange(columnKey === 'focal' ? Number(newVal) : String(newVal));
      }
    }
  }, [columnKey, value, onChange]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.addEventListener('scroll', handleScroll);
    const timer = setTimeout(handleScroll, 150);
    return () => {
      list.removeEventListener('scroll', handleScroll);
      clearTimeout(timer);
    };
  }, [handleScroll]);

  const onMouseDown = (e: React.MouseEvent) => {
    const list = listRef.current;
    if (!list) return;
    isDragging.current = true;
    list.classList.add('cursor-grabbing');
    list.classList.remove('snap-y');
    startY.current = e.pageY - list.offsetTop;
    scrollTopStart.current = list.scrollTop;
    e.preventDefault();
  };

  const onMouseLeave = () => {
    const list = listRef.current;
    if (!list) return;
    isDragging.current = false;
    list.classList.remove('cursor-grabbing');
    list.classList.add('snap-y');
  };

  const onMouseUp = () => {
    const list = listRef.current;
    if (!list) return;
    isDragging.current = false;
    list.classList.remove('cursor-grabbing');
    list.classList.add('snap-y');
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const list = listRef.current;
    if (!isDragging.current || !list) return;
    e.preventDefault();
    const y = e.pageY - list.offsetTop;
    const walk = (y - startY.current) * 1.5;
    list.scrollTop = scrollTopStart.current - walk;
  };

  const onItemClick = (item: string | number) => {
    onChange(item);
    const list = listRef.current;
    if (!list) return;
    const target = Array.from(list.children).find(
      (c) => (c as HTMLElement).dataset.value === String(item),
    );
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="group relative flex w-[160px] shrink-0 snap-center flex-col items-center md:w-[180px]">
      <div
        className="mb-2 text-center text-[9px] font-bold tracking-[0.18em] text-[var(--base-color-brand--umber)] uppercase"
        style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
      >
        {title}
      </div>
      <div className="relative h-[min(44vh,320px)] w-full overflow-hidden rounded-2xl border border-[var(--base-color-brand--umber)]/25 bg-[var(--base-color-brand--shell)] shadow-lg md:h-[320px]">
        <div className="pointer-events-none absolute top-0 right-0 left-0 z-20 h-20 bg-gradient-to-b from-[var(--base-color-brand--champagne)] via-[var(--base-color-brand--champagne)]/50 to-transparent" />
        <div className="pointer-events-none absolute right-0 bottom-0 left-0 z-20 h-20 bg-gradient-to-t from-[var(--base-color-brand--champagne)] via-[var(--base-color-brand--champagne)]/50 to-transparent" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 z-0 h-[72px] w-[85%] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--base-color-brand--cinamon)]/10 bg-[var(--base-color-brand--cinamon)]/[0.04]" />

        <div
          ref={listRef}
          role="listbox"
          className="hide-scrollbar relative z-10 h-full snap-y snap-mandatory overflow-y-auto"
          onMouseDown={onMouseDown}
          onMouseLeave={onMouseLeave}
          onMouseUp={onMouseUp}
          onMouseMove={onMouseMove}
        >
          <div style={{ height: 'calc(50% - 56px)' }} />
          {items.map((item) => {
            const imageUrl = CINEMA_ASSET_URLS[String(item)];
            return (
              <div
                key={String(item)}
                data-value={item}
                role="option"
                aria-selected={String(item) === String(value)}
                tabIndex={0}
                title={String(item)}
                className="flex h-28 scale-90 cursor-pointer snap-center flex-col items-center justify-center gap-2 p-2 text-[var(--base-color-brand--bean)] opacity-35 blur-[0.5px] transition-all duration-300 ease-out select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--base-color-brand--cinamon)]"
                onClick={() => {
                  onItemClick(item);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onItemClick(item);
                  }
                }}
              >
                <div
                  data-imgbox="true"
                  className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-[var(--base-color-brand--umber)]/30 bg-[var(--base-color-brand--shell)] shadow-inner transition-all duration-300"
                >
                  {imageUrl ? (
                    <img src={imageUrl} alt="" className="size-full object-cover opacity-90" />
                  ) : columnKey === 'focal' ? (
                    <span
                      data-focal-text="true"
                      className="text-lg font-bold text-[var(--base-color-brand--umber)]"
                    >
                      {item}
                    </span>
                  ) : (
                    <div className="size-3 rounded-full bg-[var(--base-color-brand--umber)]/30" />
                  )}
                </div>
                <span
                  data-label="true"
                  className="max-w-[8.5rem] px-1 text-center text-[9px] leading-[1.15] font-bold tracking-wide break-words whitespace-normal uppercase md:max-w-[9.75rem] md:text-[10px]"
                >
                  {item}
                </span>
              </div>
            );
          })}
          <div style={{ height: 'calc(50% - 56px)' }} />
        </div>
      </div>
    </div>
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
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4 pt-6"
      style={{ willChange: 'opacity' }}
      onClick={handleBackdropClick}
    >
      <div className="fixed inset-0 bg-[var(--base-color-brand--bean)]/55 backdrop-blur-md" />
      <div
        className="relative z-10 flex max-h-[calc(100vh-3rem)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-[var(--base-color-brand--umber)]/40 bg-[var(--base-color-brand--shell)] p-5 shadow-2xl md:p-6"
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
              Hardware and optics
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

        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <SelectionPreviewCard title="Camera" value={draftSettings.camera} columnKey="camera" />
          <SelectionPreviewCard title="Lens" value={draftSettings.lens} columnKey="lens" />
          <SelectionPreviewCard
            title="Focal length"
            value={draftSettings.focal}
            columnKey="focal"
          />
          <SelectionPreviewCard
            title="Aperture"
            value={draftSettings.aperture}
            columnKey="aperture"
          />
        </div>

        <div className="hide-scrollbar flex min-h-0 w-full flex-1 snap-x justify-start gap-3 overflow-x-auto overflow-y-hidden py-2 md:justify-center md:gap-5 md:py-3">
          <ScrollColumn
            title="Camera"
            items={CAMERAS}
            columnKey="camera"
            value={draftSettings.camera}
            onChange={update('camera')}
          />
          <ScrollColumn
            title="Lens"
            items={LENSES}
            columnKey="lens"
            value={draftSettings.lens}
            onChange={update('lens')}
          />
          <ScrollColumn
            title="Focal length"
            items={FOCAL_LENGTHS}
            columnKey="focal"
            value={draftSettings.focal}
            onChange={update('focal')}
          />
          <ScrollColumn
            title="Aperture"
            items={APERTURES}
            columnKey="aperture"
            value={draftSettings.aperture}
            onChange={update('aperture')}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--base-color-brand--umber)]/20 pt-4">
          <div className="min-w-0 text-xs text-[var(--base-color-brand--umber)]">
            <span className="font-semibold text-[var(--base-color-brand--bean)]">
              Current input:
            </span>{' '}
            {draftSettings.camera} · {draftSettings.lens} · {draftSettings.focal}mm ·{' '}
            {draftSettings.aperture}
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
