import { ReporterNavbar } from '@/components/shared/ReporterNavbar';
import { ReporterGuard } from '@/components/shared/ReporterGuard';
import { ReporterUnreadProvider } from '@/components/providers/ReporterUnreadProvider';

export default function LaporanLayout({ children }: { children: React.ReactNode }) {
  return (
    <ReporterUnreadProvider>
      <div className="flex min-h-svh flex-col bg-background">
        <ReporterNavbar />
        <main className="min-w-0 flex-1 overflow-y-auto">
          <ReporterGuard>{children}</ReporterGuard>
        </main>
      </div>
    </ReporterUnreadProvider>
  );
}
