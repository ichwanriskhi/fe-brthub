'use client';

import { useRef, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Send, ShieldCheck, Paperclip, ImageIcon, FileText, X } from 'lucide-react';
import { MOCK_CHAT } from '@/lib/mock/data';
import { TicketChatMessage, TicketChatAttachment } from '@/lib/types/ticket';

interface TicketChatDrawerProps {
  ticketId: string;
  currentUserRole?: 'Pelapor' | 'Reviewer' | 'Handler';
  currentUserName?: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  readOnly?: boolean;
}

export function TicketChatDrawer({
  ticketId,
  currentUserRole = 'Pelapor',
  currentUserName = 'Saya',
  trigger,
  open,
  onOpenChange,
  readOnly = false,
}: TicketChatDrawerProps) {
  const [messages, setMessages] = useState<TicketChatMessage[]>(
    MOCK_CHAT[ticketId] || [
      {
        id: 'init-msg',
        ticketId,
        senderName: 'Sistem BRTHub',
        senderRole: 'Sistem',
        message: 'Percakapan tiket dimulai. Silakan ajukan pertanyaan atau koordinasi terkait tiket ini.',
        timestamp: 'Hari ini',
      },
    ]
  );
  const [inputMessage, setInputMessage] = useState('');
  const [pendingFiles, setPendingFiles] = useState<TicketChatAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const collectFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const newFiles: TicketChatAttachment[] = Array.from(fileList).map((f, i) => ({
      id: `att-${Date.now()}-${i}`,
      name: f.name,
      size: formatFileSize(f.size),
      type: f.type.startsWith('image/') ? 'image' : 'file',
      // preview local (URL.createObjectURL) hanya di runtime, tidak disimpan di state serializable
      previewUrl: f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined,
    }));
    setPendingFiles((prev) => [...prev, ...newFiles]);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const removePendingFile = (id: string) => {
    setPendingFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() && pendingFiles.length === 0) return;

    const newMsg: TicketChatMessage = {
      id: `msg-${Date.now()}`,
      ticketId,
      senderName: currentUserName,
      senderRole: currentUserRole,
      message: inputMessage.trim() || '(lampiran)',
      timestamp: 'Baru saja',
      attachments: pendingFiles.length > 0 ? pendingFiles : undefined,
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputMessage('');
    setPendingFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (imageInputRef.current) imageInputRef.current.value = '';
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
            Komunikasi langsung antara Pelapor, Reviewer, dan Unit Handler.
          </p>
        </SheetHeader>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg) => {
            const isMe = msg.senderRole === currentUserRole || msg.senderName === currentUserName;
            const isSystem = msg.senderRole === 'Sistem';

            if (isSystem) {
              return (
                <div key={msg.id} className="text-center my-2">
                  <span className="text-[11px] bg-muted px-2.5 py-1 rounded-full text-muted-foreground">
                    {msg.message}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs font-semibold text-foreground">
                    {msg.senderName}
                  </span>
                  <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                    {msg.senderRole}
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-1">
                    {msg.timestamp}
                  </span>
                </div>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                    isMe
                      ? 'bg-primary text-primary-foreground rounded-tr-none'
                      : 'bg-muted text-foreground rounded-tl-none'
                  }`}
                >
                  {msg.message}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className={`mt-2 space-y-1.5 ${isMe ? 'text-primary-foreground' : ''}`}>
                      {msg.attachments.map((att) => (
                        <div key={att.id} className="flex items-center gap-2">
                          {att.type === 'image' && att.previewUrl ? (
                            <img
                              src={att.previewUrl}
                              alt={att.name}
                              className="size-12 rounded-md object-cover border border-border"
                            />
                          ) : (
                            <span
                              className={`flex size-8 items-center justify-center rounded-md ${isMe ? 'bg-primary-foreground/15' : 'bg-background border'}`}
                            >
                              <FileText className="size-4" />
                            </span>
                          )}
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
          {/* Pending attachments preview */}
          {pendingFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 px-3 pt-3">
              {pendingFiles.map((f) => (
                <div
                  key={f.id}
                  className="group relative flex items-center gap-2 rounded-md border bg-card px-2 py-1.5 pr-7"
                >
                  {f.type === 'image' && f.previewUrl ? (
                    <img src={f.previewUrl} alt={f.name} className="size-8 rounded object-cover" />
                  ) : (
                    <FileText className="size-4 text-muted-foreground shrink-0" />
                  )}
                  <span className="flex flex-col min-w-0 max-w-32">
                    <span className="truncate text-[11px] font-medium">{f.name}</span>
                    <span className="text-[10px] text-muted-foreground">{f.size}</span>
                  </span>
                  <button
                    type="button"
                    aria-label={`Hapus ${f.name}`}
                    onClick={() => removePendingFile(f.id)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 p-3">
            {/* Attach file */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => { collectFiles(e.target.files); e.target.value = ''; }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Lampirkan file"
              title="Lampirkan file"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="size-4" />
            </Button>
            {/* Attach image */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => { collectFiles(e.target.files); e.target.value = ''; }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Lampirkan gambar"
              title="Lampirkan gambar"
              onClick={() => imageInputRef.current?.click()}
            >
              <ImageIcon className="size-4" />
            </Button>
            <Input
              placeholder="Tulis pesan atau pertanyaan..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="text-xs h-9"
            />
            <Button
              type="submit"
              size="sm"
              className="h-9 px-3 gap-1.5"
              disabled={!inputMessage.trim() && pendingFiles.length === 0}
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
