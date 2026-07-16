import { Navigation } from "@/components/Navigation";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Navigation />
      <main className="flex-1 overflow-y-auto p-4 pb-[74px] md:p-6 md:pb-6">{children}</main>
    </div>
  );
}
