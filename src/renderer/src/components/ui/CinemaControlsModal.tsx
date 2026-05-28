import { useCallback, useEffect, useRef } from 'react';
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
}

type ColumnKey = 'camera' | 'lens' | 'focal' | 'aperture';

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
    return () => clearTimeout(timer);
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
    return () => clearTimeout(timer);
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
    const list = listRef.current;
    if (!list) return;
    const target = Array.from(list.children).find(
      (c) => (c as HTMLElement).dataset.value === String(item),
    );
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="group relative flex w-[130px] shrink-0 snap-center flex-col items-center md:w-[150px]">
      <div
        className="mb-2 text-center text-[9px] font-bold tracking-[0.18em] text-[var(--base-color-brand--umber)] uppercase"
        style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
      >
        {title}
      </div>
      <div className="relative h-[min(40vh,280px)] w-full overflow-hidden rounded-2xl border border-[var(--base-color-brand--umber)]/25 bg-[var(--base-color-brand--shell)] shadow-lg md:h-[300px]">
        <div className="pointer-events-none absolute top-0 right-0 left-0 z-20 h-24 bg-gradient-to-b from-[var(--base-color-brand--champagne)] via-[var(--base-color-brand--champagne)]/50 to-transparent" />
        <div className="pointer-events-none absolute right-0 bottom-0 left-0 z-20 h-24 bg-gradient-to-t from-[var(--base-color-brand--champagne)] via-[var(--base-color-brand--champagne)]/50 to-transparent" />
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
          <div style={{ height: 'calc(50% - 50px)' }} />
          {items.map((item) => {
            const imageUrl = CINEMA_ASSET_URLS[String(item)];
            return (
              <div
                key={String(item)}
                data-value={item}
                role="option"
                className="flex h-[100px] scale-90 cursor-pointer snap-center flex-col items-center justify-center gap-2 p-2 text-[var(--base-color-brand--bean)] opacity-35 blur-[0.5px] transition-all duration-300 ease-out select-none"
                onClick={() => onItemClick(item)}
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
                  className="max-w-full truncate px-1 text-center text-[9px] leading-tight font-bold tracking-wider uppercase md:text-[10px]"
                >
                  {item}
                </span>
              </div>
            );
          })}
          <div style={{ height: 'calc(50% - 50px)' }} />
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
}: CinemaControlsModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  const update = (key: keyof CinemaSettings) => (val: string | number) => {
    onSettingsChange({
      ...settings,
      [key]: key === 'focal' ? Number(val) : val,
    } as CinemaSettings);
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  return (
    <div
      ref={backdropRef}
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-200 ${
        isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
      style={{ willChange: 'opacity' }}
      onClick={handleBackdropClick}
    >
      <div
        className={`absolute inset-0 bg-[var(--base-color-brand--bean)]/55 backdrop-blur-md transition-opacity duration-200 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        className={`relative z-10 mx-4 flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-[var(--base-color-brand--umber)]/40 bg-[var(--base-color-brand--shell)] p-5 shadow-2xl transition-all duration-200 md:p-8 ${
          isOpen
            ? 'translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none translate-y-2 scale-95 opacity-0'
        }`}
        style={{ willChange: 'transform, opacity' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
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

        <div className="hide-scrollbar flex min-h-0 w-full snap-x justify-start gap-3 overflow-x-auto py-4 md:justify-center md:gap-6 md:py-6">
          <ScrollColumn
            title="Camera"
            items={CAMERAS}
            columnKey="camera"
            value={settings.camera}
            onChange={update('camera')}
          />
          <ScrollColumn
            title="Lens"
            items={LENSES}
            columnKey="lens"
            value={settings.lens}
            onChange={update('lens')}
          />
          <ScrollColumn
            title="Focal length"
            items={FOCAL_LENGTHS}
            columnKey="focal"
            value={settings.focal}
            onChange={update('focal')}
          />
          <ScrollColumn
            title="Aperture"
            items={APERTURES}
            columnKey="aperture"
            value={settings.aperture}
            onChange={update('aperture')}
          />
        </div>

        <div className="mt-4 flex justify-end border-t border-[var(--base-color-brand--umber)]/20 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border-none bg-[var(--base-color-brand--cinamon)] px-6 py-2 text-sm font-semibold text-[var(--base-color-brand--shell)] shadow-[0_3px_0_0_var(--base-color-brand--dark-red)] transition hover:bg-[var(--base-color-brand--red)] active:translate-y-0.5"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
