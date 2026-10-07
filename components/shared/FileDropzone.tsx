'use client';

import * as React from 'react';
import { CloudUpload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AttachmentList } from '@/components/shared/AttachmentList';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ZIP sengaja tidak diterima. Ia sempat ada di daftar ini padahal backend
// (aturan `mimes:`) tidak pernah mengizinkannya sama sekali - jadi user bisa
// memilih berkas zip lalu ditolak API dengan pesan validasi.
//
// Video hanya mp4/webm (sama seperti lampiran chat): mov ditolak backend
// maupun di sini supaya konsisten — file mov iPhone perlu dikonversi dulu.
const ACCEPTED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'pdf', 'mp4', 'webm'];
// Harus sama dengan `max:` backend (10 MB). Lebih besar dari itu berarti
// user lolos FE lalu ditolak API dengan 422 — false-accept.
const MAX_SIZE_MB = 10;

const ACCEPT_ATTR = '.png,.jpg,.jpeg,.pdf,.mp4,.webm';

interface FileDropzoneProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  /** Label header dropzone. */
  title?: string;
  /** Label tombol browsingan. */
  browseLabel?: string;
  id?: string;
  className?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extensionOf(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? '';
}

/**
 * Area drag & drop berkas.
 *
 * Area drop seluruhnya bisa diklik untuk membuka dialog berkas (bukan hanya
 * tombolnya) — perilaku yang diuraikan di sub-teks "or click to browse from
 * your computer". Input `<input type="file">` disembunyikan dan dipicu lewat
 * `label htmlFor`, jadi tetap punya kontrol native keyboard.
 */
export function FileDropzone({
  files,
  onFilesChange,
  title = 'Upload file',
  browseLabel = 'Browse files',
  id = 'file-upload',
  className,
}: FileDropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  // `dragCounter` mencegah onDragLeave ikut aktif saat anak elemen di-hover,
  // sehingga border tidak berkedip saat mouse bergerak di dalam area.
  const dragCounter = React.useRef(0);
  const [isDragging, setIsDragging] = React.useState(false);

  const addFiles = React.useCallback(
    (incoming: FileList | File[] | null) => {
      if (!incoming) return;
      const list = Array.from(incoming);
      if (list.length === 0) return;

      const rejected: string[] = [];
      const accepted: File[] = [];

      for (const file of list) {
        if (!ACCEPTED_EXTENSIONS.includes(extensionOf(file.name))) {
          rejected.push(`${file.name} (format tidak didukung)`);
          continue;
        }
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
          rejected.push(`${file.name} (lebih dari ${MAX_SIZE_MB} MB)`);
          continue;
        }
        accepted.push(file);
      }

      if (rejected.length > 0) {
        toast.error(`${rejected.length} file ditolak: ${rejected.join(', ')}`);
      }
      if (accepted.length > 0) {
        onFilesChange([...files, ...accepted]);
        toast.success(`${accepted.length} file berhasil ditambahkan`);
      }
    },
    [files, onFilesChange],
  );

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  };

  return (
    <div
      onDragEnter={(event) => {
        event.preventDefault();
        dragCounter.current += 1;
        setIsDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        event.preventDefault();
        dragCounter.current -= 1;
        if (dragCounter.current <= 0) {
          dragCounter.current = 0;
          setIsDragging(false);
        }
      }}
      onDrop={handleDrop}
      className={cn(
        'overflow-hidden rounded-lg border transition-colors',
        isDragging && 'border-primary',
        className,
      )}
    >
      {/* Header */}
      <div className="border-b px-4 py-3 text-sm font-medium">{title}</div>

      {/* Area drop */}
      <div className="p-4">
        <label
          htmlFor={id}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors',
            'focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/30',
          )}
        >
          <CloudUpload className="mb-2 size-10 text-muted-foreground" />
          <span className="text-sm font-medium">Drag and drop your file</span>
          <span className="text-sm text-muted-foreground">
            or click to browse from your computer
          </span>
        </label>

        <input
          ref={inputRef}
          id={id}
          type="file"
          multiple
          accept={ACCEPT_ATTR}
          className="sr-only"
          onChange={(event) => {
            addFiles(event.target.files);
            // Reset agar memilih file yang sama dua kali tetap memicu onChange.
            event.target.value = '';
          }}
        />

        <div className="flex justify-center pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
          >
            {browseLabel}
          </Button>
        </div>

        {files.length > 0 && (
          <AttachmentList
            items={files}
            onRemove={removeFile}
            removeLabel={(name) => `Hapus lampiran ${name}`}
            layout="stack"
            className="mt-4"
          />
        )}
      </div>

      {/* Footer */}
      <div className="border-t px-4 py-3 text-sm text-muted-foreground">
        Maximum file size: {MAX_SIZE_MB} MB. Supported formats: PNG, JPG, PDF, MP4, WEBM.
      </div>
    </div>
  );
}

export { formatFileSize };