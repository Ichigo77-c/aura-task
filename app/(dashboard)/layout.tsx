import { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import DashboardNav from "@/components/shared/dashboard-nav";
import { CommandPalette } from "@/components/shared/command-palette";

export const instant = false;

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/signin");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface text-fg transition-colors duration-300">
      <DashboardNav user={session.user} />
      <main className="flex-1 overflow-y-auto bg-surface">
        {children}
      </main>
      <CommandPalette />
    </div>
  );
}
