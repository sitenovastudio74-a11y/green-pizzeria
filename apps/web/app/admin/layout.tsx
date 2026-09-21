"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { isLoggedIn } from "../login/page";
import { apiFetch } from "../lib/api";

const ADMIN_LINKS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/combos", label: "Combos" },
  { href: "/admin/options", label: "Options & Addons" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/kitchen", label: "Kitchen" },
  { href: "/admin/delivery", label: "Delivery" },
  { href: "/admin/complaints", label: "Complaints" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    apiFetch("/profile")
      .then(async (r) => {
        if (!r.ok) throw new Error("Could not verify access.");
        return r.json();
      })
      .then((profile) => {
        if (profile.role === "ADMIN" || profile.role === "SUPER_ADMIN") {
          setAllowed(true);
        } else {
          router.push("/");
        }
      })
      .catch(() => router.push("/"))
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!allowed) {
    return null;
  }

  return (
    <div className="w-full min-w-0">
      <div className="w-full min-w-0 overflow-x-auto border-b border-dark/10 bg-cream-soft">
        <nav className="flex gap-1 px-3 sm:px-4 py-2 w-max min-w-full sm:w-full">
          {ADMIN_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors " +
                  (active
                    ? "bg-green-600 text-white"
                    : "text-dark hover:bg-dark/5")
                }
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="w-full min-w-0">{children}</div>
    </div>
  );
}
