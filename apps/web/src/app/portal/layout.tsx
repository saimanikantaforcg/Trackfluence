export default function PortalLayout({ children }: { children: React.ReactNode }) {
  // Portal is a public standalone page — no AppShell, no sidebar, no auth required
  return <>{children}</>;
}
