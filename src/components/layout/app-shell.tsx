"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { Separator } from "@/components/ui/separator";

interface AppShellProps {
  children: React.ReactNode;
}

const breadcrumbMap: Record<string, { label: string; parent?: { label: string; href: string } }> = {
  "/dashboard": { label: "Dashboard" },
  "/videos": { label: "Source Carousels", parent: { label: "Content", href: "/dashboard" } },
  "/generate": { label: "Generate", parent: { label: "Content", href: "/dashboard" } },
  "/generated": { label: "Generated", parent: { label: "Content", href: "/dashboard" } },
  "/calendar": { label: "Posting Calendar", parent: { label: "Schedule", href: "/dashboard" } },
  "/accounts": { label: "Accounts", parent: { label: "Schedule", href: "/dashboard" } },
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  // Match breadcrumb — exact or prefix (for /generate/[id])
  const crumb =
    breadcrumbMap[pathname] ||
    Object.entries(breadcrumbMap).find(
      ([key]) => key !== "/" && pathname.startsWith(key + "/")
    )?.[1] ||
    null;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center border-b border-border bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mx-2 h-4" />
          <nav className="flex items-center gap-1.5 text-sm">
            {crumb?.parent && (
              <>
                <Link
                  href={crumb.parent.href}
                  className="text-muted-foreground hover:text-foreground transition-colors duration-150 ease-out"
                >
                  {crumb.parent.label}
                </Link>
                <span className="text-muted-foreground/60">/</span>
              </>
            )}
            <span className="font-medium text-foreground">
              {crumb?.label || "ContentHouse"}
            </span>
          </nav>
        </header>
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
