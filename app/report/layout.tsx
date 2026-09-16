import { ReporterNavbar } from '@/components/shared/ReporterNavbar';

export default function ReporterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <ReporterNavbar />
      <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
