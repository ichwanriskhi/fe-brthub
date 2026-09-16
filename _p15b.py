# Lanjutan _p15: mock data + halaman (fix open mode)
import re

# ---------- 3. Mock data: OPEN tickets priority -> null ----------
p = 'lib/mock/data.ts'
s = open(p, encoding='utf-8').read()
lines = s.split('\n')
out = []
i = 0
while i < len(lines):
    line = lines[i]
    out.append(line)
    if line.strip().startswith("status: 'OPEN',"):
        for j in range(len(out) - 1, max(len(out) - 12, -1), -1):
            if out[j].strip().startswith('priority:'):
                out[j] = re.sub(r"priority: '[ABC]',", 'priority: null,', out[j])
                break
    i += 1
s = '\n'.join(out)
open(p, 'w', encoding='utf-8').write(s)
print('mock ok')

# ---------- 4. tinjauan-awal queue ----------
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

# ---------- 5. TicketCardList ----------
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

# ---------- 6. Dashboard ----------
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

# ---------- 7. Detail tinjauan-awal ----------
p = 'app/reviewer/tiket/[id]/page.tsx'
s = open(p, encoding='utf-8').read()
s = s.replace("import { StatusBadge, PriorityBadge } from '@/components/shared/StatusBadge';",
              "import { StatusBadge, TypeBadge } from '@/components/shared/StatusBadge';")
s = s.replace("""            <div className="flex items-center gap-2">
              <PriorityBadge priority={ticket.priority} />
              <StatusBadge status={ticket.status} />
            </div>""",
              """            <div className="flex items-center gap-2">
              <TypeBadge ticketType={ticket.ticketType} />
              <StatusBadge status={ticket.status} />
            </div>""")
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
assert old in s, 'kategori block not found'
s = s.replace(old, new)
m = re.search(r"const \[subject, setSubject\] = useState\('([^']*)'\);", s)
assert m, 'subject state not found'
s = s.replace(m.group(0),
  m.group(0) + "\n  const [tipeTiket, setTipeTiket] = useState<TicketType>(ticket.ticketType);")
m2 = re.search(r"import type \{ Ticket \} from '@/lib/types/ticket';", s)
if m2:
    s = s.replace(m2.group(0), "import type { Ticket, TicketType } from '@/lib/types/ticket';")
else:
    # cari import type apapun dari types/ticket
    m3 = re.search(r"import type \{ ([^}]+) \} from '@/lib/types/ticket';", s)
    assert m3, 'ticket type import not found'
    if 'TicketType' not in m3.group(1):
        s = s.replace(m3.group(0), m3.group(0).replace('} ', ', TicketType } '))
s = s.replace('<span className="font-semibold">Prioritas {priority}</span>',
              '<span className="font-semibold">{priority ?? "Belum ditentukan"}</span>')
open(p, 'w', encoding='utf-8').write(s)
print('detail awal ok')

# ---------- 8. tinjauan-akhir detail ----------
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
s = s.replace("""                  <span className="text-muted-foreground block">Tipe Tiket</span>
                  <span className="font-semibold">{ticket.ticketType}</span>""",
              """                  <span className="text-muted-foreground block">Tipe Tiket</span>
                  <TypeBadge ticketType={ticket.ticketType} />""")
open(p, 'w', encoding='utf-8').write(s)
print('tinjauan akhir ok')

# ---------- 9. riwayat ----------
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

# ---------- 10. tinjauan-akhir queue ----------
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
