'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  deleteTicketInteraction,
  getTicketInteractions,
  sendTicketInteraction,
} from '@/lib/api/ticket-interactions';
import { useAuth } from '@/lib/auth/auth-context';
import type { TicketChatMessage } from '@/lib/types/ticket';
import { MessageSquare, Send, Paperclip, ImageIcon, FileText, Lock, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface TicketChatDrawerProps {
  ticketId: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Mode hanya-baca (tidak bisa menulis pesan) */
  readOnly?: boolean;
}

/**
 * Mode pemilihan visibilitas pesan:
 *
 * - 'public'          — pesan terlihat semua pihak termasuk reporter
 * - 'internal'        — reviewer/handler memilih: hanya tim internal & approver
 * - 'forced-internal' — approver/unit/admin: pesan wajib internal
 * - 'forced-public'   — reporter: pesan wajib publik
 */
type VisibilityMode = 'public' | 'internal' | 'forced-internal' | 'forced-public';

export function TicketChatDrawer({
  ticketId,
  trigger,
  open,
  onOpenChange,
  readOnly = false,
}: TicketChatDrawerProps) {
  const { user, activeRole } = useAuth();
  const [messages, setMessages] = useState<TicketChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [visibility, setVisibility] = useState<VisibilityMode>('public');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
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
   * Mode visibilitas sesuai peran aktif. Ini hanya sinyal untuk UI —
   * backend tetap memvalidasi dan memaksa aturannya, jadi manipulasi
   * flag di sisi klien tidak membuka celak.
   */
  const visibilityMode: VisibilityMode = (() => {
    // Check if user is reporter (no AuthContext user, but has user_profile)
    const isReporter = !user && (() => {
      if (typeof window === 'undefined') return false;
      return localStorage.getItem('user_profile') !== null;
    })();

    if (isReporter) {
      return 'forced-public';
    }

    if (activeRole === 'admin' || activeRole === 'unit' || activeRole === 'approver') {
      return 'forced-internal';
    }
    if (activeRole === 'reviewer' || activeRole === 'handler') {
      return visibility === 'internal' ? 'internal' : 'public';
    }
    return 'forced-public';
  })();

  const canChooseVisibility = visibilityMode === 'internal' || visibilityMode === 'public';
  const isInternalSend = visibilityMode === 'internal' || visibilityMode === 'forced-internal';

  const loadMessages = useCallback(async () => {
    if (!ticketId) return;
    setIsLoading(true);
    try {
      const data = await getTicketInteractions(ticketId);
      setMessages(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal memuat percakapan.');
    } finally {
      setIsLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    if (open) loadMessages();
  }, [open, loadMessages]);

  // Scroll ke bawah saat drawer dibuka / ada pesan baru
  useEffect(() => {
    if (open && feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [open, messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputMessage.trim();
    if (!text || isSending) return;

    setIsSending(true);
    try {
      const saved = await sendTicketInteraction(ticketId, text, isInternalSend);
      setMessages((prev) => [...prev, saved]);
      setInputMessage('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (imageInputRef.current) imageInputRef.current.value = '';
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
          <Button variant="outline" size="sm" className="gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <span>Diskusi Tiket ({messages.length})</span>
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
                  <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                    {msg.senderRole}
                  </span>
                  {isInternal && (
                    <Badge
                      variant="outline"
                      className="text-[10px] h-5 px-1.5 gap-1 text-amber-600 border-amber-300 dark:border-amber-700"
                    >
                      <Lock className="size-2.5" />
                      Internal
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
                    <div className="mt-2 space-y-1.5">
                      {msg.attachments.map((att) => (
                        <div key={att.id} className="flex items-center gap-2">
                          <span className="flex size-8 items-center justify-center rounded-md bg-black/10">
                            <FileText className="size-4" />
                          </span>
                          <span className="flex flex-col min-w-0">
                            <span className="truncate font-medium">{att.name}</span>
                            <span className="text-[10px] opacity-75">{att.size}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Chat Input */}
        {!readOnly && (
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

          <div className="flex gap-2 p-3">
            {/* Lampiran — dinonaktifkan sampai endpoint upload tersedia di backend */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => { e.target.value = ''; }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Lampirkan file"
              title="Lampiran belum tersedia"
              disabled
            >
              <Paperclip className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Lampirkan gambar"
              title="Lampiran belum tersedia"
              onClick={() => imageInputRef.current?.click()}
              disabled
            >
              <ImageIcon className="size-4" />
            </Button>
            <Input
              placeholder={
                visibilityMode === 'forced-internal'
                  ? 'Tulis pesan internal…'
                  : 'Tulis pesan atau pertanyaan...'
              }
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="text-xs h-9"
            />
            <Button
              type="submit"
              size="sm"
              className="h-9 px-3 gap-1.5"
              disabled={!inputMessage.trim() || isSending}
            >
              <Send className="size-3.5" />
            </Button>
          </div>
        </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
