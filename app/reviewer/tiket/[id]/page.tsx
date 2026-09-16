'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MOCK_TICKETS } from '@/lib/mock/data';
import type { TicketType, TicketPriority } from '@/lib/types/ticket';
import {
  CATEGORIES,
  SUBCATEGORY_MAP,
  HANDLER_ACTIONS,
  ROUTING_UNITS,
  HANDLERS,
  PRIORITY_INFO,
  isDistributionClaim,
} from '@/lib/constants/reviewer';
import { StatusBadge, TypeBadge } from '@/components/shared/StatusBadge';
import { TicketChatDrawer } from '@/components/shared/TicketChatDrawer';
import { ClaimItemsTable } from '@/components/shared/ClaimItemsTable';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ArrowLeft,
  Paperclip,
  CheckCircle2,
  XCircle,
  MessageSquare,
  ShieldCheck,
  Truck,
  Info,
  Sparkles,
} from 'lucide-react';

export default function ReviewerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const ticket = MOCK_TICKETS.find((t) => t.id === id) || MOCK_TICKETS[0];

  // Working copy — data hasil edit reviewer
  const [subject, setSubject] = useState(ticket.subject);
  const [category, setCategory] = useState(ticket.category);
  const [subcategory, setSubcategory] = useState(ticket.subcategory);
  const [description, setDescription] = useState(ticket.description);
  const [priority, setPriority] = useState(ticket.priority);
  const [tipeTiket, setTipeTiket] = useState<TicketType>(ticket.ticketType);
  const [routingUnit, setRoutingUnit] = useState<string>(ROUTING_UNITS[0]);
  const [handler, setHandler] = useState<string>(HANDLERS[0].name);
  const [handlerAction, setHandlerAction] = useState<string>('');
  const [chatOpen, setChatOpen] = useState(false);
    const [actionDone, setActionDone] = useState<string | null>(null);

  const isClaim = isDistributionClaim(category);
  const isPriorityC = priority === 'C';

  const recommendedAction = HANDLER_ACTIONS.find((a) => (a.recommendedFor as readonly string[]).includes(subcategory));
  const availableActions = HANDLER_ACTIONS;
  const selectedHandlerObj = HANDLERS.find((h) => h.name === handler);

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    setSubcategory(SUBCATEGORY_MAP[value][0]);
  };

  const handleSubmit = () => {
    const target = isPriorityC ? `handler ${handler}` : `unit ${routingUnit}`;
    setActionDone(`Tinjauan awal disimpan — tiket diteruskan ke ${target}.`);
    setTimeout(() => router.push('/reviewer/tinjauan-awal'), 1500);
  };

  const handleReject = () => {
    setActionDone('Laporan ditolak.');
    setTimeout(() => router.push('/reviewer/tinjauan-awal'), 1500);
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild className="gap-2 text-muted-foreground hover:text-foreground">
          <Link href="/reviewer/tinjauan-awal">
            <ArrowLeft className="size-4" />
            <span>Kembali ke Antrean</span>
          </Link>
        </Button>

        <TicketChatDrawer ticketId={ticket.id} open={chatOpen} onOpenChange={setChatOpen} />
      </div>

      {actionDone && (
        <div className="bg-emerald-500/10 border-emerald-600/40 text-emerald-700 dark:text-emerald-400 flex items-center gap-2 rounded-lg border p-4 text-xs font-semibold">
          <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
          <span>{actionDone}</span>
        </div>
      )}

      {/* Ticket Brief Header */}
      <Card>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                <span>{ticket.id}</span>
                <span>•</span>
                <span>{new Date(ticket.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground mt-1">{subject}</h1>
            </div>
            <div className="flex items-center gap-2">
              <TypeBadge ticketType={ticket.ticketType} />
              <StatusBadge status={ticket.status} />
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground pt-2 border-t">
            <span>Pelapor: {ticket.reporterName} ({ticket.reporterPhone})</span>
            {ticket.soNumber && <span>SO: {ticket.soNumber}</span>}
            {ticket.salesName && <span>Sales: {ticket.salesName}</span>}
            {ticket.customerData?.name && <span>Customer: {ticket.customerData.name}</span>}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-w-0">
        {/* Kolom kiri: working copy + data tiket */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          {/* Data yang bisa diedit reviewer */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-base font-semibold">Data Laporan (Salinan Kerja)</CardTitle>
              <CardDescription className="text-xs">
                Reviewer dapat mengoreksi data laporan sebelum diteruskan. Data asli pelapor tersimpan di riwayat.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Subjek</label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Tipe Tiket</label>
                  <Select value={tipeTiket} onValueChange={(v) => setTipeTiket(v ?? 'COMPLAINT')} items={[
                  { value: 'REQUEST', label: 'Request' },
                  { value: 'INCIDENT', label: 'Incident' },
                  { value: 'COMPLAINT', label: 'Complaint' },
                  { value: 'INQUIRY', label: 'Inquiry' },
                ]}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="REQUEST">Request</SelectItem>
                      <SelectItem value="INCIDENT">Incident</SelectItem>
                      <SelectItem value="COMPLAINT">Complaint</SelectItem>
                      <SelectItem value="INQUIRY">Inquiry</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Kategori</label>
                  <Select
                    value={category}
                    onValueChange={(v) => handleCategoryChange(v ?? CATEGORIES[0])}
                    items={CATEGORIES.map((c) => ({ value: c, label: c }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Sub Kategori</label>
                  <Select
                    value={subcategory}
                    onValueChange={(v) => setSubcategory(v ?? SUBCATEGORY_MAP[category][0])}
                    items={SUBCATEGORY_MAP[category].map((sc) => ({ value: sc, label: sc }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBCATEGORY_MAP[category].map((sc) => (
                        <SelectItem key={sc} value={sc}>{sc}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Deskripsi / Ruang Lingkup</label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-24" />
              </div>

              {isClaim && ticket.claimedItems && ticket.claimedItems.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Truck className="size-4 text-primary" />
                      <span className="text-xs font-semibold text-foreground">Informasi Barang Claim</span>
                    </div>
                    <ClaimItemsTable items={ticket.claimedItems} />
                  </div>
                </>
              )}

              {ticket.attachments.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <span className="text-xs font-semibold text-foreground block mb-2">Lampiran Pelapor</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {ticket.attachments.map((att) => (
                        <a key={att.id} href={att.url} target="_blank" rel="noreferrer"
                          className="flex items-center gap-2 p-2.5 rounded-lg border bg-card hover:bg-accent transition-colors">
                          <Paperclip className="size-4 text-primary shrink-0" />
                          <span className="font-medium truncate flex-1 text-sm">{att.name}</span>
                          <span className="text-[10px] text-muted-foreground">{att.size}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Kolom kanan: keputusan & routing */}
        <div className="space-y-6 min-w-0">
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                <span>Triage & Routing</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Tentukan prioritas dan tujuan penerusan tiket.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Prioritas */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Tingkat Prioritas</label>
                <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)} items={[
                  { value: 'A', label: 'Prioritas A (Critical)' },
                  { value: 'B', label: 'Prioritas B (High)' },
                  { value: 'C', label: 'Prioritas C (Normal)' },
                ]}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">Prioritas A (Critical)</SelectItem>
                    <SelectItem value="B">Prioritas B (High)</SelectItem>
                    <SelectItem value="C">Prioritas C (Normal)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                  <Info className="size-3.5 shrink-0" />
                  {priority ? PRIORITY_INFO[priority] : 'Prioritas belum ditentukan — pilih tingkat urgensi untuk melanjutkan tiket.'}
                </p>
              </div>

              {/* Aksi handler khusus klaim distribusi */}
              {isClaim && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-foreground">Aksi untuk Handler</label>
                  <RadioGroup value={handlerAction} onValueChange={setHandlerAction} className="gap-2">
                    {availableActions.map((action) => {
                      const selected = handlerAction === action.id;
                      const isRecommended = recommendedAction?.id === action.id;
                      return (
                        <label
                          key={action.id}
                          data-checked={selected || undefined}
                          className="flex w-full cursor-pointer flex-col rounded-lg border border-border p-3 transition-colors hover:bg-accent data-checked:border-primary data-checked:bg-primary/10 dark:border-input"
                        >
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value={action.id} />
                            <span className="text-sm font-semibold">{action.label}</span>
                            {isRecommended && (
                              <Badge variant="secondary" className="gap-1">
                                <Sparkles className="size-3" />
                                Direkomendasikan
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1 ml-6 text-xs text-muted-foreground">{action.description}</p>
                        </label>
                      );
                    })}
                  </RadioGroup>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Sparkles className="size-3.5 shrink-0" />
                    Rekomendasi sistem berdasarkan sub kategori klaim.
                  </p>
                </div>
              )}

              {/* Routing: unit (A/B) atau handler (C) */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  {isPriorityC ? 'Assign Handler' : 'Unit / Departemen Tujuan'}
                </label>
                {isPriorityC ? (
                  <Select value={handler} onValueChange={(v) => setHandler(v ?? HANDLERS[0].name)} items={HANDLERS.map((h) => ({ value: h.name, label: `${h.name} — ${h.unit}` }))}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HANDLERS.map((h) => (
                        <SelectItem key={h.id} value={h.name}>{h.name} — {h.unit}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select value={routingUnit} onValueChange={(v) => setRoutingUnit(v ?? ROUTING_UNITS[0])} items={ROUTING_UNITS.map((u) => ({ value: u, label: u }))}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROUTING_UNITS.map((u) => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Ringkasan keputusan */}
              <div className="rounded-lg border bg-muted/40 p-3 space-y-2 text-xs">
                <div className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
                  Ringkasan Keputusan
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="block text-muted-foreground">Prioritas</span>
                    <span className="font-semibold">{priority ?? "Belum ditentukan"}</span>
                  </div>
                  {isClaim && (
                    <div>
                      <span className="block text-muted-foreground">Aksi Handler</span>
                      <span className="font-semibold">
                        {HANDLER_ACTIONS.find((a) => a.id === handlerAction)?.label ?? '-'}
                      </span>
                    </div>
                  )}
                  <div className="col-span-2">
                    <span className="block text-muted-foreground">{isPriorityC ? 'Handler' : 'Tujuan'}</span>
                    <span className="font-semibold">
                      {isPriorityC ? `${handler} (${selectedHandlerObj?.unit})` : routingUnit}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button onClick={handleSubmit} className="flex-1 text-xs font-semibold gap-2">
                  <span>{isPriorityC ? 'Assign Handler' : 'Teruskan Tiket'}</span>
                </Button>
                <Button onClick={handleReject} variant="destructive" className="text-xs font-semibold gap-2">
                  <XCircle className="size-4" />
                  <span>Tolak</span>
                </Button>
              </div>

              {/* <Separator />

              <Button
                onClick={() => setChatOpen(true)}
                variant="ghost"
                className="w-full text-xs text-muted-foreground hover:text-foreground justify-center gap-2"
              >
                <MessageSquare className="size-4 text-primary" />
                <span>Buka Diskusi dengan Reporter</span>
              </Button> */}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal Detail Laporan */}
    </div>
  );
}
