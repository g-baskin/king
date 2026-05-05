import { useEffect, useState, useCallback } from 'react';
import ImageDetailPanel from '../ImageDetailPanel';
import type { GeneratedImage } from './types';

interface ImageDetailOverlayProps {
  image: GeneratedImage;
  images?: GeneratedImage[];
  onClose: () => void;
  onDelete: (id: string) => void;
  onDownload: (url: string, prompt: string) => void;
  onRecreate: (prompt: string) => void;
}

export default function ImageDetailOverlay({
  image,
  images,
  onClose,
  onDelete,
  onDownload,
  onRecreate,
}: ImageDetailOverlayProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeImage, setActiveImage] = useState(image);

  useEffect(() => {
    setActiveImage(image);
  }, [image]);

  const imageList = images ?? [activeImage];
  const currentIndex = Math.max(
    0,
    imageList.findIndex((img) => img.id === activeImage.id),
  );
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < imageList.length - 1;

  const goPrev = useCallback(() => {
    if (!hasPrev) return;
    const prev = imageList[currentIndex - 1];
    if (prev) setActiveImage(prev);
  }, [currentIndex, hasPrev, imageList]);

  const goNext = useCallback(() => {
    if (!hasNext) return;
    const next = imageList[currentIndex + 1];
    if (next) setActiveImage(next);
  }, [currentIndex, hasNext, imageList]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  const handleBackgroundClick = useCallback(() => {
    if (isExpanded) {
      setIsExpanded(false);
    } else {
      handleClose();
    }
  }, [isExpanded, handleClose]);

  const handleImageClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isExpanded) {
        setIsExpanded(false);
      } else {
        setIsExpanded(true);
      }
    },
    [isExpanded],
  );

  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true);
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isExpanded) {
          setIsExpanded(false);
        } else {
          handleClose();
        }
      }
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev, handleClose, isExpanded]);

  return (
    <div
      className={`fixed inset-0 z-50 grid bg-[var(--base-color-brand--bean)]/80 backdrop-blur-sm transition-all duration-200 ease-out ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        gridTemplateColumns: isExpanded ? '1fr 0px' : '1fr 380px',
        willChange: 'opacity',
      }}
    >
      {/* Image Preview */}
      <div
        className="flex h-full items-center justify-center p-8 select-none"
        onClick={handleBackgroundClick}
      >
        <div
          className={`relative h-full w-full transition-all duration-200 ease-out ${
            isExpanded ? 'max-w-6xl' : 'max-w-3xl'
          } ${isVisible ? 'opacity-100' : 'opacity-0'}`}
          onClick={handleImageClick}
          style={{
            pointerEvents: 'auto',
            cursor: isExpanded ? 'zoom-out' : 'zoom-in',
          }}
        >
          <img
            src={activeImage.url}
            alt={activeImage.prompt}
            loading="eager"
            className="pointer-events-none absolute inset-0 size-full rounded-xl object-contain"
          />
        </div>
      </div>

      {/* Detail Panel */}
      <div
        className={`h-full overflow-hidden transition-opacity duration-200 ease-out ${
          isVisible && !isExpanded ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ pointerEvents: isExpanded ? 'none' : 'auto' }}
      >
        <ImageDetailPanel
          image={activeImage}
          onClose={handleClose}
          onDelete={onDelete}
          onDownload={onDownload}
          onRecreate={onRecreate}
        />
      </div>

      {(hasPrev || hasNext) && (
        <>
          <button
            type="button"
            onClick={goPrev}
            disabled={!hasPrev}
            className="absolute top-1/2 left-4 z-[60] -translate-y-1/2 rounded-full bg-black/45 px-3 py-2 text-white disabled:opacity-30"
            aria-label="Previous image"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!hasNext}
            className="absolute top-1/2 right-[396px] z-[60] -translate-y-1/2 rounded-full bg-black/45 px-3 py-2 text-white disabled:opacity-30"
            aria-label="Next image"
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}
