import AppRail from '@/components/AppRail';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell">
      <AppRail />
      <div className="app-workspace">{children}</div>
    </div>
  );
}
