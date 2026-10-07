'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  deleteTicketInteraction,
  getTicketInteractions,
  sendTicketInteraction,
  type ChatSurface,
} from '@/lib/api/ticket-interactions';
import { useAuth } from '@/lib/auth/auth-context';
import type { TicketChatMessage } from '@/lib/types/ticket';
import { MessageSquare, Send, Paperclip, Lock, Trash2 } from 'lucide-react';
import { AttachmentList, LocalAttachmentList } from '@/components/shared/AttachmentList';
import { toast } from 'sonner';

/**
 * Batas lampiran chat.
 *
 * WAJIB sama dengan validasi `TicketInteractionController::store`
 * (`attachments: max:5`, `attachments.*: ...|max:5120`). Kalau berbeda, user
 * baru tahu setelah menekan Kirim.
 */
const MAX_FILES = 5;
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

/** Cerminan daftar putih `mimes:` di backend. ZIP sengaja tidak ada. */
const ACCEPT_ATTR = 'image/*,video/mp4,video/webm,application/pdf,.doc,.docx,.txt';

interface TicketChatDrawerProps {
  ticketId: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Mode pemilihan visibilitas pesan:
 *
 * - 'public'          — pesan terlihat semua pihak termasuk pelapor
 * - 'internal'        — reviewer/handler bebas pilih; hanya tim internal & approver
 * - 'forced-internal' — unit/admin/approver: pesan wajib internal
 * - 'forced-public'   — pelapor (sesi portal pelapor): pesan wajib publik
 *
 * Pemeriksaannya berurutan: reviewer/handler lebih dulu, baru unit/admin/
 * approver. Urutan ini harus mengikuti `resolveInternalFlag` di backend.
 */
type VisibilityMode = 'public' | 'internal' | 'forced-internal' | 'forced-public';

export function TicketChatDrawer({
  ticketId,
  trigger,
  open,
  onOpenChange,
}: TicketChatDrawerProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<TicketChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [visibility, setVisibility] = useState<VisibilityMode>('public');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  // Handle both auth systems: AuthContext (staff) and localStorage (reporter)
  const myUserId = user?.uuid || (() => {
    if (typeof window === 'undefined') return null;
    try {
      const profileRaw = localStorage.getItem('user_profile');
      if (profileRaw) {
        const profile = JSON.parse(profileRaw);
        return profile.uuid || profile.id;
      }
    } catch {
      // Ignore parsing errors
    }
    return null;
  })();

  /**
   * Permukaan tempat drawer ini dibuka.
   *
   * `reporter` bila sesi portal pelapor: tidak ada AuthContext user, tapi ada
   * profil pelapor. Sesi staf selalu menang, karena `brthub_user` menandai
   * seseorang yang masuk lewat portal staf.
   */
  const isReporterSurface =
    !user &&
    (() => {
      if (typeof window === 'undefined') return false;
      return localStorage.getItem('user_profile') !== null;
    })();

  const surface: ChatSurface = isReporterSurface ? 'reporter' : 'staff';

  /**
   * Mode visibilitas. Urutannya WAJIB sama dengan `resolveInternalFlag` di
   * backend (`TicketInteractionController`), kalau tidak UI akan menawarkan
   * pilihan yang backend diam-diam abaikan.
   *
   * 1. reviewer / handler        → bebas pilih (toggle tampil)
   * 2. unit / admin / approver   → wajib internal (toggle disembunyikan)
   * 3. lainnya                   → wajib publik
   *
   * Poin penting: `reviewer`/`handler` diperiksa lebih dulu. Urutan terbalik
   * membuat pegawai yang memegang `unit` sekaligus `reviewer` terkunci ke
   * internal, padahal haknya tetap memilih.
   *
   * Yang dibaca adalah `user.roles` (role nyata dari `/me`), bukan `activeRole`:
   * `activeRole` hanya role yang sedang dibuka, sedangkan backend memakai
   * `hasRole()` yang benar bila role itu ADA di daftar — jadi memakai
   * `activeRole` membuat pilihan di halaman reviewer diam-diam jadi internal.
   * `hasRole()` dari auth-context juga tidak bisa dipakai di sini karena
   * `availableRoles`-nya menambahkan 'approver' sintetik untuk semua pegawai.
   *
   * Sesi portal reporter tetap didahulukan: itu tampilan pelanggan, bukan role,
   * dan di sana seluruh pesan diperlakukan sebagai publik.
   */
  const visibilityMode: VisibilityMode = (() => {
    if (isReporterSurface) {
      return 'forced-public';
    }

    const roles = user?.roles ?? [];
    if (roles.some((role) => role === 'reviewer' || role === 'handler')) {
      return visibility === 'internal' ? 'internal' : 'public';
    }
    if (roles.some((role) => role === 'admin' || role === 'unit' || role === 'approver')) {
      return 'forced-internal';
    }
    return 'forced-public';
  })();

  const canChooseVisibility = visibilityMode === 'internal' || visibilityMode === 'public';
  const isInternalSend = visibilityMode === 'internal' || visibilityMode === 'forced-internal';

  const loadMessages = useCallback(async () => {
    if (!ticketId) return;
    setIsLoading(true);
    try {
      const data = await getTicketInteractions(ticketId, surface);
      setMessages(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal memuat percakapan.');
    } finally {
      setIsLoading(false);
    }
  }, [ticketId, surface]);

  useEffect(() => {
    if (open) loadMessages();
  }, [open, loadMessages]);

  // Scroll ke bawah saat drawer dibuka / ada pesan baru
  useEffect(() => {
    if (open && feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [open, messages]);

  /**
   * Validasi jumlah & ukuran sebelum file masuk ke state.
   *
   * Disaring di sini (bukan dipotong diam-diam seperti di form progres handler)
   * supaya user tahu kenapa berkasnya tidak terpakai — memotong diam-diam
   * membuat pengirim mengira lampirannya sudah terkirim.
   */
  const handlePickFiles = (picked: File[]) => {
    if (picked.length === 0) return;

    const tooBig = picked.filter((file) => file.size > MAX_SIZE_BYTES);
    const withinLimit = picked.filter((file) => file.size <= MAX_SIZE_BYTES);

    if (tooBig.length > 0) {
      toast.error(
        `Ukuran maksimal 5MB per file. ${
          tooBig.length > 1 ? `${tooBig.length} file terlalu besar` : `"${tooBig[0].name}" terlalu besar`
        }.`,
      );
    }

    const next = [...pendingFiles, ...withinLimit];
    if (next.length > MAX_FILES) {
      toast.error(`Maksimal ${MAX_FILES} lampiran per pesan.`);
    }
    setPendingFiles(next.slice(0, MAX_FILES));
  };

  const handleRemoveFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputMessage.trim();
    // Backend mengizinkan pesan tanpa teks selama ada lampiran
    // (`content: required_without:attachments`).
    if ((!text && pendingFiles.length === 0) || isSending) return;

    setIsSending(true);
    try {
      const saved = await sendTicketInteraction(ticketId, text, isInternalSend, pendingFiles, surface);
      setMessages((prev) => [...prev, saved]);
      setInputMessage('');
      setPendingFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal mengirim pesan.');
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (message: TicketChatMessage) => {
    try {
      await deleteTicketInteraction(ticketId, message.id);
      setMessages((prev) => prev.filter((m) => m.id !== message.id));
      toast.success('Pesan dihapus.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus pesan.');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {trigger ? (
        <SheetTrigger asChild>
          {trigger}
        </SheetTrigger>
      ) : (
        <SheetTrigger asChild>
          <Button variant="outline" size="sm">
            <MessageSquare data-icon="inline-start" className="text-primary" />
            Diskusi Tiket ({messages.length})
          </Button>
        </SheetTrigger>
      )}
      <SheetContent side="right" className="sm:max-w-md flex flex-col p-0" style={{ width: '100%' }}>
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2 text-base font-semibold">
            <MessageSquare className="h-4 w-4 text-primary" />
            Diskusi Tiket #{ticketId}
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            {visibilityMode === 'forced-internal'
              ? 'Pesan pada percakapan ini bersifat internal dan tidak ditampilkan kepada pelapor.'
              : visibilityMode === 'internal'
                ? 'Pesan internal hanya terlihat oleh tim internal dan approver.'
                : 'Komunikasi langsung dengan tim internal BRTHub.'}
          </p>
        </SheetHeader>

        {/* Message Feed */}
        <div ref={feedRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading && messages.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-8">Memuat percakapan…</p>
          )}
          {!isLoading && messages.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-8">
              Belum ada percakapan. Silakan ajukan pertanyaan terkait tiket ini.
            </p>
          )}
          {messages.map((msg) => {
            const isMe = msg.senderUserId === myUserId;
            const isInternal = Boolean(msg.isInternalOnly);

            return (
              <div
                key={msg.id}
                className={`group flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs font-semibold text-foreground">
                    {msg.senderName}
                  </span>
                  <Badge variant="secondary" className="px-1.5 text-[10px]">
                    {msg.senderRole}
                  </Badge>
                  {/*
                   * Role dan hubungan sebagai pelapor ditampilkan BERBARUAN,
                   * bukan saling menimpa: untuk pegawai multi-role keduanya
                   * sama-sama benar, dan menimpa satu akan menyembunyikan fakta
                   * yang hanya bisa dilihat dari satu portal saja.
                   */}
                  {msg.isTicketReporter && (
                    <Badge
                      variant="outline"
                      className="px-1.5 text-[10px] text-muted-foreground"
                      title="Pengirim pesan ini adalah pelapor tiket ini"
                    >
                      Pelapor
                    </Badge>
                  )}
                  {isInternal && (
                    <Badge
                      variant="outline"
                      className="text-[10px] h-5 px-1.5 gap-1 text-amber-600 border-amber-300 dark:border-amber-700"
                    >
                      <Lock className="size-2.5" />
                    </Badge>
                  )}
                  {msg.canDelete && (
                    <button
                      type="button"
                      aria-label="Hapus pesan"
                      title="Hapus pesan"
                      onClick={() => handleDeleteMessage(msg)}
                      className="text-muted-foreground/0 group-hover:text-muted-foreground hover:text-destructive transition-colors p-0.5"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  )}
                  <span className="text-[10px] text-muted-foreground ml-1">
                    {msg.timestamp}
                  </span>
                </div>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                    isMe
                      ? isInternal
                        ? 'bg-amber-600 text-white rounded-tr-none'
                        : 'bg-primary text-primary-foreground rounded-tr-none'
                      : isInternal
                        ? 'bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100 rounded-tl-none'
                        : 'bg-muted text-foreground rounded-tl-none'
                  }`}
                >
                  {msg.message}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <AttachmentList
                      items={msg.attachments}
                      size="xs"
                      variant="bubble"
                      className="mt-2"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Chat Input */}
        <form onSubmit={handleSendMessage} className="border-t bg-background">
          {/* Toggle visibilitas pesan — hanya reviewer & handler */}
          {canChooseVisibility && (
            <div className="flex items-center gap-1.5 px-3 pt-2.5">
              <span className="text-[10px] text-muted-foreground shrink-0">Terlihat:</span>
              <div className="flex rounded-md border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setVisibility('public')}
                  className={`px-2.5 py-1 text-[10px] font-medium transition-colors ${
                    visibility === 'public'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility('internal')}
                  className={`px-2.5 py-1 text-[10px] font-medium transition-colors flex items-center gap-1 ${
                    visibility === 'internal'
                      ? 'bg-amber-600 text-white'
                      : 'bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Lock className="size-2.5" />
                  Internal
                </button>
              </div>
            </div>
          )}

          {/* Lampiran terpilih — masih lokal, belum terkirim */}
          {pendingFiles.length > 0 && (
            <div className="px-3 pt-2.5">
              <LocalAttachmentList
                files={pendingFiles}
                onRemove={handleRemoveFile}
                size="xs"
                variant="card"
              />
            </div>
          )}

          <div className="flex items-end gap-2 p-3">
            {/* Satu tombol untuk semua jenis lampiran (gambar, video, dokumen). */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPT_ATTR}
              className="hidden"
              onChange={(e) => {
                handlePickFiles(Array.from(e.target.files ?? []));
                // Reset supaya berkas yang sama bisa dipilih ulang setelah dihapus.
                e.target.value = '';
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              className="shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Lampirkan berkas"
              title={`Lampirkan berkas (maks. ${MAX_FILES} file @5MB)`}
              disabled={isSending || pendingFiles.length >= MAX_FILES}
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip />
            </Button>
            <Textarea
              rows={1}
              placeholder={
                visibilityMode === 'forced-internal'
                  ? 'Tulis pesan internal…'
                  : 'Tulis pesan atau pertanyaan...'
              }
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                // Enter kirim, Shift+Enter baris baru — perilaku standar chat.
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
              className="max-h-32 min-h-9 resize-none bg-transparent py-2 text-xs"
            />
            <Button
              type="submit"
              size="icon-lg"
              aria-label="Kirim pesan"
              disabled={(!inputMessage.trim() && pendingFiles.length === 0) || isSending}
            >
              <Send />
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
