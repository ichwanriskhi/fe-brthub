import { ReporterNavbar } from '@/components/shared/ReporterNavbar';
import { ReporterGuard } from '@/components/shared/ReporterGuard';

export default function ReporterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <ReporterNavbar />
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <ReporterGuard>{children}</ReporterGuard>
      </main>
    </div>
  );
}
