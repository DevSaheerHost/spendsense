"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getMessagingInstance } from "@/lib/firebase/client";
import { listenForForegroundMessages } from "@/lib/notifications/fcm";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/loans", label: "Loans" },
  { href: "/recurring", label: "Recurring" },
  { href: "/recommendations", label: "Advice" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { logout } = useAuth();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    getMessagingInstance().then((messaging) => {
      if (!messaging) return;
      unsubscribe = listenForForegroundMessages(messaging, (title, body) => {
        toast(`${title}: ${body}`, { duration: 6000 });
      });
    });
    return () => unsubscribe?.();
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <span className="text-lg font-bold text-slate-900">SpendSense</span>
        <button
          onClick={() => logout()}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          Log out
        </button>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-24 pt-4 sm:pb-8">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white sm:hidden">
        <div className="mx-auto flex max-w-2xl justify-around">
          {NAV_ITEMS.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium ${
                  active ? "text-indigo-600" : "text-slate-500"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <nav className="hidden border-t border-slate-200 bg-white sm:block">
        <div className="mx-auto flex max-w-2xl justify-around">
          {NAV_ITEMS.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center gap-0.5 py-3 text-sm font-medium ${
                  active ? "text-indigo-600" : "text-slate-500"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
