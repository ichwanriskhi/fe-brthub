'use client';

import * as React from 'react';
import { Download, XIcon } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/** Satu media yang bisa ditampilkan di dalam lightbox. */
export interface LightboxItem {
  /** URL absolut yang dipakai `<img src>` / `<video src>`. */
  src: string;
  name: string;
  kind: 'image' | 'video';
}

interface MediaLightboxState {
  items: LightboxItem[];
  index: number;
  open: (items: LightboxItem[], index: number) => void;
  close: () => void;
}

const MediaLightboxContext = React.createContext<MediaLightboxState | null>(null);

/**
 * Akses lightbox dari mana pun di dalam subtree.
 *
 * `open()` diberi SELURUH daftar media satu section, bukan hanya yang diklik —
 * itu yang membuat panah kiri/kanan bisa menavigasi seluruh lampiran dalam
 * satu grup (perilaku seperti WhatsApp).
 */
export function useMediaLightbox(): MediaLightboxState {
  const context = React.useContext(MediaLightboxContext);
  if (!context) {
    throw new Error('useMediaLightbox harus dipakai di dalam <MediaLightboxProvider>');
  }
  return context;
}

const MIME_IMAGE = /^image\/(png|jpe?g|webp|gif|bmp|avif)$/i;
const MIME_VIDEO = /^video\/(mp4|webm|ogg|quicktime|x-matroska)$/i;

/**
 * Batas ukuran media di dalam lightbox.
 *
 * Sengaja berbasis viewport (`svh`), bukan `max-h-full`. Rantai tinggi
 * persentagetanya putus: `CarouselContent` merender wrapper `overflow-hidden`
 * tanpa class, sehingga `h-full` pada turunannya resolve ke `height: auto`.
 * Akibatnya `max-h-full` tidak membatasi apa pun, gambar keluar pada ukuran
 * naturalnya lalu terpotong `overflow-hidden` — user harus zoom out browser
 * untuk melihat seluruh foto. Dengan batas viewport, gambar selalu pas di
 * layar berapa pun proporsinya.
 *
 * `svh` (small viewport height) dipakai agar chrome browser mobile yang
 * muncul saat scroll tidak ikut terpotong. `9rem` disisakan untuk header,
 * footer, dan padding lightbox.
 */
const MEDIA_CLASS =
  'max-h-[calc(100svh-9rem)] max-w-[92vw] rounded-lg object-contain';

/**
 * Apakah lampiran bisa ditampilkan di lightbox?
 *
 * PDF / DOC / TXT sengaja TIDAK termasuk: browser tidak punya renderer
 * yang andal untuk format itu secara inline, jadi mereka harus tetap jatuh ke
 * behavior bawaan (tab baru / unduh).
 */
export function isPreviewable(mime: string): boolean {
  return MIME_IMAGE.test(mime) || MIME_VIDEO.test(mime);
}

/**
 * Lightbox media berbasis Dialog + Carousel (shadcn/Base UI).
 *
 * Dipakai sebagai provider di root layout. Tiap `AttachmentList` mengirim
 * daftar media milik section-nya sendiri, sehingga tiap section menjadi satu
 * gallery terpisah dengan navigasi panah + swipe (embla) + keyboard.
 *
 * Belum ada zoom gesture (pinch-to-zoom) — sengaja, supaya tidak perlu
 * dependency tambahan dan tetap konsisten dengan design system.
 */
export function MediaLightboxProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<LightboxItem[]>([]);
  const [index, setIndex] = React.useState(0);
  const [api, setApi] = React.useState<import('@/components/ui/carousel').CarouselApi | null>(
    null,
  );

  const open = React.useCallback((nextItems: LightboxItem[], nextIndex: number) => {
    if (nextItems.length === 0) return;
    setItems(nextItems);
    setIndex(Math.min(Math.max(0, nextIndex), nextItems.length - 1));
  }, []);

  const close = React.useCallback(() => setItems([]), []);

  // Geser carousel ketika `index` berubah dari luar (mis. user membuka
  // gallery di slide ke-2). Dicek dulu supaya tidak berbalik dengan event
  // `select` di bawah.
  React.useEffect(() => {
    if (!api || items.length === 0) return;
    if (api.selectedScrollSnap() !== index) {
      api.scrollTo(index, true);
    }
  }, [api, index, items.length]);

  // Arah sebaliknya: carousel yang digeser user (swipe / panah / keyboard)
  // harus memperbarui `index`, kalau tidak footer "n / total" akan macet.
  React.useEffect(() => {
    if (!api) return;
    const handleSelect = () => setIndex(api.selectedScrollSnap());
    handleSelect();
    api.on('select', handleSelect);
    api.on('reInit', handleSelect);
    return () => {
      api.off('select', handleSelect);
      api.off('reInit', handleSelect);
    };
  }, [api]);

  const current = items[index];
  const showArrows = items.length > 1;

  return (
    <MediaLightboxContext.Provider value={{ items, index, open, close }}>
      {children}
      <Dialog open={items.length > 0} onOpenChange={(next) => !next && close()}>
        <DialogContent
          showCloseButton={false}
          className="z-[60] flex max-h-svh w-full max-w-5xl flex-col gap-3 overflow-hidden border-0 bg-transparent p-3 shadow-none ring-0 sm:max-w-5xl"
        >
          <DialogTitle className="sr-only">{current?.name ?? 'Pratinjau media'}</DialogTitle>

          {/* Header: nama file + aksi unduh */}
          <div className="flex shrink-0 items-center justify-between gap-3 rounded-lg bg-background/90 px-3 py-2 text-sm backdrop-blur">
            <span className="min-w-0 truncate font-medium">{current?.name}</span>
            <div className="flex shrink-0 items-center gap-1">
              {current && (
                <Button variant="ghost" size="icon-sm" asChild>
                  <a
                    href={current.src}
                    download={current.name}
                    aria-label={`Unduh ${current.name}`}
                  >
                    <Download />
                  </a>
                </Button>
              )}
              <Button variant="ghost" size="icon-sm" onClick={close} aria-label="Tutup pratinjau">
                <XIcon />
              </Button>
            </div>
          </div>

          {/* Slideshow */}
          <Carousel
            opts={{ loop: false, align: 'center' }}
            setApi={setApi}
            className="min-h-0 flex-1"
          >
            <CarouselContent className="items-center">
              {items.map((item, itemIndex) => (
                <CarouselItem key={`${item.src}-${itemIndex}`}>
                  <div className="flex w-full items-center justify-center">
                    {item.kind === 'video' ? (
                      <video
                        src={item.src}
                        controls
                        playsInline
                        preload="metadata"
                        className={MEDIA_CLASS}
                      />
                    ) : (
                      <img
                        src={item.src}
                        alt={item.name}
                        className={MEDIA_CLASS}
                      />
                    )}
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>

            {showArrows && (
              <>
                <CarouselPrevious
                  variant="secondary"
                  size="icon-lg"
                  className="inset-y-0 left-1 my-auto"
                />
                <CarouselNext
                  variant="secondary"
                  size="icon-lg"
                  className="inset-y-0 right-1 my-auto"
                />
              </>
            )}
          </Carousel>

          {/* Footer: posisi + nama file aktif */}
          {showArrows && (
            <div className="shrink-0 rounded-lg bg-background/90 px-3 py-2 text-center text-xs text-muted-foreground backdrop-blur">
              {index + 1} / {items.length} · {current?.name}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MediaLightboxContext.Provider>
  );
}