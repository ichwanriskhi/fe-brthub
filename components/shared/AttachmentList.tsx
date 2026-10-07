'use client';

import * as React from 'react';
import { FileText, ImageIcon, XIcon } from 'lucide-react';
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from '@/components/ui/attachment';
import { cn } from '@/lib/utils';
import {
  isPreviewable,
  useMediaLightbox,
  type LightboxItem,
} from '@/components/shared/MediaLightbox';

/** Sumber data: lampiran dari server, atau `File` lokal sebelum diunggah. */
export type AttachmentItem =
  | { id: string; name: string; size: string; type: string; url?: string }
  | File;

function isFile(item: AttachmentItem): item is File {
  return item instanceof File;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * `TicketAttachment.size` diisi `String(file_size)` dari API, jadi isinya byte
 * mentah (`"482112"`), bukan string berformat. Kalau backend suatu saat sudah
 * mengirim string berformat ("1.2 MB"), angka di dalamnya tidak akan bisa
 * di-parse dan string itu dipakai apa adanya.
 */
function normalizeSize(raw: string): string {
  const bytes = Number(raw);
  return Number.isFinite(bytes) && raw.trim() !== '' ? formatBytes(bytes) : raw;
}

/**
 * Label tipe untuk `AttachmentDescription`, mis. `PDF · 2.4 MB`.
 * Ekstensi diambil dari nama file karena `type` dari server bisa berupa MIME
 * lengkap (`image/png`) maupun sudah disederhanakan (`png`).
 */
function typeLabel(name: string, mime: string, size: string): string {
  const ext = name.includes('.') ? name.split('.').pop()!.toUpperCase() : '';
  const fallback = mime.includes('/') ? mime.split('/').pop()!.toUpperCase() : mime.toUpperCase();
  const label = ext || fallback || 'FILE';
  return size ? `${label} · ${size}` : label;
}

function isImage(item: AttachmentItem): boolean {
  if (isFile(item)) return item.type.startsWith('image/');
  return item.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|avif)$/i.test(item.name);
}

interface AttachmentListProps {
  items: AttachmentItem[];
  /** `xs` untuk lampiran inline di dalam timeline/progres, `sm` untuk daftar utama. */
  size?: 'xs' | 'sm' | 'default';
  /**
   * `card` (default) untuk daftar di atas permukaan. `bubble` menimpa warna
   * agar menyatu dengan gelembung chat yang warnanya dibalik, sehingga teks
   * ikut `currentColor` dan bukan `card-foreground`.
   */
  variant?: 'card' | 'bubble';
  /** Aksi hapus — biasanya hanya di form sebelum submit. */
  onRemove?: (index: number) => void;
  /** Label untuk tombol hapus, mis. `Hapus lampiran fotoku.png`. */
  removeLabel?: (name: string) => string;
  /** Grid untuk daftar utama; rapat untuk lampiran inline. */
  layout?: 'grid' | 'stack';
  className?: string;
}

/**
 * Daftar lampiran seragam untuk seluruh aplikasi.
 *
 * Semua halaman (laporan, unit, handler, reviewer, approver, admin, chat)
 * memakai komponen ini supaya tampilan, ikon, format meta, dan aksi hapus
 * tidak lagi berbeda-beda per halaman.
 */
export function AttachmentList({
  items,
  size = 'sm',
  variant = 'card',
  onRemove,
  removeLabel,
  layout = 'stack',
  className,
}: AttachmentListProps) {
  const isBubble = variant === 'bubble';
  const { open } = useMediaLightbox();

  // Semua media dalam SATU AttachmentList = satu gallery. Klik slide ke-N
  // membuka gallery itu di posisi N, sehingga panah/swipe menavigasi seluruh
  // lampiran section yang sama — bukan pindah ke tab baru.
  const gallery = React.useMemo<LightboxItem[]>(
    () =>
      items.flatMap((item) => {
        if (isFile(item)) return [];
        const url = item.url;
        if (!url || !isPreviewable(item.type)) return [];
        return [
          {
            src: url,
            name: item.name,
            kind: item.type.startsWith('video/') ? ('video' as const) : ('image' as const),
          },
        ];
      }),
    [items],
  );

  // Setelah semua hook, baru boleh keluar lebih awal.
  if (items.length === 0) return null;

  return (
    <div
      className={cn(
        layout === 'grid' ? 'grid gap-2 sm:grid-cols-2' : 'flex flex-wrap gap-1.5',
        className,
      )}
    >
      {items.map((item, index) => {
        const name = item.name;
        const sizeLabel = isFile(item) ? formatBytes(item.size) : normalizeSize(item.size);
        const mime = isFile(item) ? item.type : item.type;
        const url = isFile(item) ? undefined : item.url;
        const removeAria = removeLabel?.(name) ?? `Hapus ${name}`;

        // Indeks item ini di dalam gallery (atau -1 kalau tidak previewable).
        let galleryIndex = -1;
        if (url && isPreviewable(mime)) {
          const seen = items
            .slice(0, index)
            .filter((prev) => !isFile(prev) && prev.url && isPreviewable(prev.type)).length;
          if (gallery.length > seen) galleryIndex = seen;
        }

        const media = isImage(item) && url ? (
          <AttachmentMedia
            variant="image"
            className={isBubble ? 'bg-black/20' : undefined}
          >
            <img src={url} alt={name} />
          </AttachmentMedia>
        ) : (
          <AttachmentMedia className={isBubble ? 'bg-black/20 text-current' : undefined}>
            {isImage(item) ? <ImageIcon /> : <FileText />}
          </AttachmentMedia>
        );

        return (
          <Attachment
            key={isFile(item) ? `${name}-${index}` : item.id}
            size={size}
            className={cn(
              'min-w-0',
              isBubble && 'border-white/20 bg-black/10 text-current',
            )}
          >
            {media}
            <AttachmentContent>
              <AttachmentTitle className={isBubble ? 'text-current' : undefined}>
                {name}
              </AttachmentTitle>
              <AttachmentDescription
                className={isBubble ? 'text-current opacity-75' : undefined}
              >
                {typeLabel(name, mime, sizeLabel)}
              </AttachmentDescription>
            </AttachmentContent>
            {onRemove && (
              <AttachmentActions>
                <AttachmentAction
                  aria-label={removeAria}
                  onClick={() => onRemove(index)}
                >
                  <XIcon />
                </AttachmentAction>
              </AttachmentActions>
            )}
            {url &&
              (galleryIndex >= 0 ? (
                <AttachmentTrigger
                  onClick={() => open(gallery, galleryIndex)}
                  aria-label={`Pratinjau ${name}`}
                />
              ) : (
                // PDF / DOC / TXT tidak bisa di-preview inline.
                <AttachmentTrigger
                  render={
                    <a href={url} target="_blank" rel="noreferrer" aria-label={`Buka ${name}`} />
                  }
                />
              ))}
          </Attachment>
        );
      })}
    </div>
  );
}

/**
 * Lampiran milik `File` lokal di dalam form — selalu bisa dihapus dan tidak
 * punya URL sampai diunggah.
 */
export function LocalAttachmentList({
  files,
  onRemove,
  ...rest
}: Omit<AttachmentListProps, 'items' | 'onRemove'> & {
  files: File[];
  onRemove: (index: number) => void;
}) {
  return (
    <AttachmentList
      items={files}
      onRemove={onRemove}
      removeLabel={(name) => `Hapus lampiran ${name}`}
      layout="stack"
      {...rest}
    />
  );
}