"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getMessagingInstance } from "@/lib/firebase/client";
import { listenForForegroundMessages } from "@/lib/notifications/fcm";

// Heroicons (outline) paths, used as native-style line icons in the nav.
const ICON_PATHS: Record<string, string> = {
  dashboard:
    "M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75",
  transactions:
    "M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z",
  loans:
    "M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18",
  recurring:
    "M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.99v4.99",
  advice:
    "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z",
  logout:
    "M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75",
};

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: "dashboard" },
  { href: "/transactions", label: "Transactions", icon: "transactions" },
  { href: "/loans", label: "Loans", icon: "loans" },
  { href: "/recurring", label: "Recurring", icon: "recurring" },
  { href: "/recommendations", label: "Advice", icon: "advice" },
];

function Icon({ name, active = false }: { name: string; active?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2 : 1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}

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
    <div className="flex min-h-screen flex-col bg-[color:var(--background)]">
      <header
        className="sticky top-0 z-20 flex items-center justify-between bg-white px-4 py-3"
        style={{ boxShadow: "var(--elev-1)" }}
      >
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white">
            &#8377;
          </span>
          <span className="text-lg font-bold tracking-tight text-slate-900">SpendSense</span>
        </div>
        <button
          onClick={() => logout()}
          aria-label="Log out"
          className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
        >
          <Icon name="logout" />
        </button>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-6 pt-4">{children}</main>

      <nav
        className="sticky bottom-0 z-20 border-t border-slate-100 bg-white"
        style={{ boxShadow: "0 -1px 3px rgba(16,24,40,0.05)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex max-w-2xl items-stretch justify-around">
          {NAV_ITEMS.map((item) => {
            const active = pathname?.startsWith(item.href) ?? false;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-1 flex-col items-center gap-1 pb-2 pt-1.5"
              >
                <span
                  className="flex h-8 w-16 items-center justify-center rounded-full transition-colors"
                  style={
                    active
                      ? { backgroundColor: "var(--primary-container)", color: "var(--on-primary-container)" }
                      : { color: "#64748b" }
                  }
                >
                  <Icon name={item.icon} active={active} />
                </span>
                <span
                  className="text-[11px] font-medium leading-none"
                  style={{ color: active ? "var(--on-primary-container)" : "#64748b" }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
