"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListVideo, Trash2, Video, Plus, Settings } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

const navItems = [
  { href: "/videos", label: "一覧", icon: ListVideo },
  { href: "/trash", label: "ゴミ箱", icon: Trash2 },
  { href: "/settings", label: "設定", icon: Settings },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-40 hidden border-b bg-background/80 backdrop-blur-md supports-backdrop-filter:bg-background/60 md:flex md:items-center md:justify-between md:px-6 md:py-3">
        <Link href="/videos" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Video className="size-4" />
          </span>
          clip-hive
        </Link>
        <nav className="flex items-center gap-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                  active && "bg-primary/10 font-medium text-primary hover:bg-primary/15 hover:text-primary"
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-1">
          <Button asChild size="sm" className="rounded-full">
            <Link href="/videos/new">
              <Plus className="size-4" />
              登録
            </Link>
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-[74px] items-center border-t bg-background/95 py-1 backdrop-blur-md md:hidden">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] whitespace-nowrap text-muted-foreground",
                active && "font-medium text-primary"
              )}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          );
        })}
        <Link
          href="/videos/new"
          className="flex flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] whitespace-nowrap text-muted-foreground"
        >
          <Plus className="size-5" />
          登録
        </Link>
      </nav>
    </>
  );
}
