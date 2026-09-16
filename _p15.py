# Tiket baru belum punya prioritas (reviewer yang menentukan); badge prioritas huruf + warna;
# tipe tiket (request/incident/complaint/inquiry) tampil sebagai badge+icon di semua queue & detail.

import re

# ---------- 1. Types: priority nullable ----------
p = 'lib/types/ticket.ts'
s = open(p, encoding='utf-8').read()
s = s.replace("  priority: TicketPriority;", "  /** Null = belum ditentukan reviewer (tiket baru) */\n  priority: TicketPriority | null;")
open(p, 'w', encoding='utf-8').write(s)
print('types ok')

# ---------- 2. StatusBadge.tsx: PriorityBadge warna per huruf + TypeBadge baru ----------
p = 'components/shared/StatusBadge.tsx'
s = open(p, encoding='utf-8').read()
old = """export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return <Badge variant="outline">Prioritas {priority}</Badge>;
}"""
new = """const PRIORITY_STYLE: Record<TicketPriority, { label: string; cls: string }> = {
  A: { label: 'A', cls: 'border-destructive/50 bg-destructive/10 text-destructive' },
  B: { label: 'B', cls: 'border-amber-600/50 bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  C: { label: 'C', cls: 'border-sky-600/50 bg-sky-500/10 text-sky-700 dark:text-sky-400' },
};

export function PriorityBadge({ priority }: { priority: TicketPriority | null }) {
  if (!priority) return null;
  const v = PRIORITY_STYLE[priority];
  return <Badge variant="outline" className={v.cls}>{v.label}</Badge>;
}

const TYPE_MAP: Record<TicketType, { label: string; icon: typeof CircleDot; iconClass: string }> = {
  REQUEST: { label: 'Request', icon: MessageSquarePlus, iconClass: 'text-sky-600 dark:text-sky-400' },
  INCIDENT: { label: 'Incident', icon: TriangleAlert, iconClass: 'text-orange-600 dark:text-orange-400' },
  COMPLAINT: { label: 'Complaint', icon: MessageSquareWarning, iconClass: 'text-violet-600 dark:text-violet-400' },
  INQUIRY: { label: 'Inquiry', icon: HelpCircle, iconClass: 'text-emerald-600 dark:text-emerald-400' },
};

export function TypeBadge({ ticketType }: { ticketType: TicketType }) {
  const v = TYPE_MAP[ticketType];
  const Icon = v.icon;
  return (
    <Badge variant="outline">
      <Icon data-icon="inline-start" className={v.iconClass} />
      {v.label}
    </Badge>
  );
}"""
assert old in s
s = s.replace(old, new)
s = s.replace(
  "import { CircleCheck, CircleDashed, LoaderCircle, CircleAlert, CircleX, CircleDot } from 'lucide-react';",
  "import { CircleCheck, CircleDashed, LoaderCircle, CircleAlert, CircleX, CircleDot, MessageSquarePlus, TriangleAlert, MessageSquareWarning, HelpCircle } from 'lucide-react';")
s = s.replace("import type { TicketStatus, TicketPriority } from '@/lib/types/ticket';",
              "import type { TicketStatus, TicketPriority, TicketType } from '@/lib/types/ticket';")
open(p, 'w', encoding='utf-8').write(s)
print('badges ok')

# ---------- 3. Mock data: OPEN tickets priority -> null ----------
p = 'lib/mock/data.ts'
s = open(p, 'utf-8').read()
lines = s.split('\n')
out = []
i = 0
while i < len(lines):
    line = lines[i]
    out.append(line)
    if line.strip().startswith("status: 'OPEN',"):
        # cari baris priority di blok yang sama (naik mundur)
        for j in range(len(out) - 1, max(len(out) - 12, -1), -1):
            if out[j].strip().startswith('priority:'):
                out[j] = out[j].replace("'A'", 'null').replace("'B'", 'null').replace("'C'", 'null')
                break
    i += 1
s = '\n'.join(out)
open(p, 'w', encoding='utf-8').write(s)
print('mock ok')

# ---------- 4. tinjauan-awal queue: kolom Prioritas -> Tipe ----------
p = 'app/reviewer/tinjauan-awal/page.tsx'
s = open(p, encoding='utf-8').read()
s = s.replace("import { StatusBadge, PriorityBadge } from '@/components/shared/StatusBadge';",
              "import { StatusBadge, TypeBadge } from '@/components/shared/StatusBadge';")
s = s.replace('<TableHead className="bg-muted/50 px-6 py-3">Prioritas</TableHead>',
              '<TableHead className="bg-muted/50 px-6 py-3">Tipe</TableHead>')
s = s.replace("""                  <TableCell className="px-6 py-3">
                    <PriorityBadge priority={ticket.priority} />
                  </TableCell>""",
              """                  <TableCell className="px-6 py-3">
                    <TypeBadge ticketType={ticket.ticketType} />
                  </TableCell>""")
open(p, 'w', encoding='utf-8').write(s)
print('tinjauan-awal ok')

# ---------- 5. TicketCardList: PriorityBadge -> TypeBadge ----------
p = 'components/shared/TicketCardList.tsx'
s = open(p, encoding='utf-8').read()
s = s.replace("import { StatusBadge, PriorityBadge } from '@/components/shared/StatusBadge';",
              "import { StatusBadge, TypeBadge } from '@/components/shared/StatusBadge';")
s = s.replace("""                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <PriorityBadge priority={ticket.priority} />
                  <StatusBadge status={ticket.status} />
                </div>""",
              """                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <TypeBadge ticketType={ticket.ticketType} />
                  <StatusBadge status={ticket.status} />
                </div>""")
open(p, 'w', encoding='utf-8').write(s)
print('card list ok')

# ---------- 6. Dashboard: kolom Prioritas -> Tipe ----------
p = 'app/reviewer/page.tsx'
s = open(p, encoding='utf-8').read()
s = s.replace("import { StatusBadge, PriorityBadge } from '@/components/shared/StatusBadge';",
              "import { StatusBadge, TypeBadge } from '@/components/shared/StatusBadge';")
s = s.replace('<TableHead className="bg-muted/50 px-6 py-3">Prioritas</TableHead>',
              '<TableHead className="bg-muted/50 px-6 py-3">Tipe</TableHead>')
s = s.replace("""                    <TableCell className="px-6 py-3">
                      <PriorityBadge priority={ticket.priority} />
                    </TableCell>""",
              """                    <TableCell className="px-6 py-3">
                      <TypeBadge ticketType={ticket.ticketType} />
                    </TableCell>""")
open(p, 'w', encoding='utf-8').write(s)
print('dashboard ok')

# ---------- 7. Detail tinjauan-awal (salinan kerja): header badge tipe; prioritas tetap di triage ----------
p = 'app/reviewer/tiket/[id]/page.tsx'
s = open(p, encoding='utf-8').read()
s = s.replace("import { StatusBadge, PriorityBadge } from '@/components/shared/StatusBadge';",
              "import { StatusBadge, TypeBadge } from '@/components/shared/StatusBadge';")
# header: ganti PriorityBadge -> TypeBadge
s = s.replace("""            <div className="flex items-center gap-2">
              <PriorityBadge priority={ticket.priority} />
              <StatusBadge status={ticket.status} />
            </div>""",
              """            <div className="flex items-center gap-2">
              <TypeBadge ticketType={ticket.ticketType} />
              <StatusBadge status={ticket.status} />
            </div>""")
# salinan kerja: tambah field Tipe Tiket select di baris kategori
old = """              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Kategori</label>"""
new = """              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Tipe Tiket</label>
                  <Select value={tipeTiket} onValueChange={(v) => setTipeTiket(v ?? 'COMPLAINT')}>
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
                  <label className="text-xs font-semibold text-foreground block mb-1">Kategori</label>"""
assert old in s
s = s.replace(old, new)
# state tipeTiket + init: cari deklarasi state subject
m = re.search(r"const \[subject, setSubject\] = useState\('([^']*)'\);", s)
assert m
s = s.replace(m.group(0),
  m.group(0) + "\n  const [tipeTiket, setTipeTiket] = useState<TicketType>(ticket.ticketType);")
# import TicketType type
s = s.replace("import type { Ticket } from '@/lib/types/ticket';",
              "import type { Ticket, TicketType } from '@/lib/types/ticket';")
# ringkasan keputusan: prioritas label ringkas
s = s.replace('<span className="font-semibold">Prioritas {priority}</span>',
              '<span className="font-semibold">{priority ?? "Belum ditentukan"}</span>')
open(p, 'w', encoding='utf-8').write(s)
print('detail awal ok')

# ---------- 8. tinjauan-akhir detail: header + modal pakai TypeBadge ----------
p = 'app/reviewer/tiket/[id]/tinjauan-akhir/page.tsx'
s = open(p, encoding='utf-8').read()
s = s.replace("import { StatusBadge, PriorityBadge } from '@/components/shared/StatusBadge';",
              "import { StatusBadge, TypeBadge } from '@/components/shared/StatusBadge';")
s = s.replace("""            <div className="flex flex-wrap items-center gap-2">
              <PriorityBadge priority={ticket.priority} />
              <StatusBadge status={ticket.status} />
              {handlerActionLabel && (""",
              """            <div className="flex flex-wrap items-center gap-2">
              <TypeBadge ticketType={ticket.ticketType} />
              <StatusBadge status={ticket.status} />
              {handlerActionLabel && (""")
# modal Tipe Tiket: badge
s = s.replace("""                  <span className="text-muted-foreground block">Tipe Tiket</span>
                  <span className="font-semibold">{ticket.ticketType}</span>""",
              """                  <span className="text-muted-foreground block">Tipe Tiket</span>
                  <TypeBadge ticketType={ticket.ticketType} />""")
open(p, 'w', encoding='utf-8').write(s)
print('tinjauan akhir ok')

# ---------- 9. riwayat: kolom Prioritas -> Tipe ----------
p = 'app/reviewer/riwayat/page.tsx'
s = open(p, encoding='utf-8').read()
s = s.replace("import { StatusBadge, PriorityBadge } from '@/components/shared/StatusBadge';",
              "import { StatusBadge, TypeBadge } from '@/components/shared/StatusBadge';")
s = s.replace('<TableHead className="bg-muted/50 px-6 py-3">Prioritas</TableHead>',
              '<TableHead className="bg-muted/50 px-6 py-3">Tipe</TableHead>')
s = s.replace("""                  <TableCell className="px-6 py-3">
                    <PriorityBadge priority={ticket.priority} />
                  </TableCell>""",
              """                  <TableCell className="px-6 py-3">
                    <TypeBadge ticketType={ticket.ticketType} />
                  </TableCell>""")
open(p, 'w', encoding='utf-8').write(s)
print('riwayat ok')

# ---------- 10. tinjauan-akhir queue: kolom Prioritas -> Tipe ----------
p = 'app/reviewer/tinjauan-akhir/page.tsx'
s = open(p, encoding='utf-8').read()
s = s.replace("import { StatusBadge, PriorityBadge } from '@/components/shared/StatusBadge';",
              "import { StatusBadge, TypeBadge } from '@/components/shared/StatusBadge';")
s = s.replace('<TableHead className="bg-muted/50 px-6 py-3">Prioritas</TableHead>',
              '<TableHead className="bg-muted/50 px-6 py-3">Tipe</TableHead>')
s = s.replace("""                    <PriorityBadge priority={ticket.priority} />
                  </TableCell>""",
              """                    <TypeBadge ticketType={ticket.ticketType} />
                  </TableCell>""")
open(p, 'w', encoding='utf-8').write(s)
print('tinjauan-akhir queue ok')
