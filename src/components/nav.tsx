"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import type { Role } from "@/lib/types";

type NavLink = {
  href: string;
  label: string;
  roles: Role[];
};

const links: NavLink[] = [
  { href: "/dashboard", label: "Tổng quan", roles: ["admin", "staff"] },
  { href: "/orders/new", label: "Tạo đơn", roles: ["admin", "staff"] },
  { href: "/orders/out", label: "Trả đồ", roles: ["admin", "staff"] },
  { href: "/orders", label: "Đơn hàng", roles: ["admin", "staff"] },
  { href: "/services", label: "Dịch vụ", roles: ["admin"] },
  { href: "/templates", label: "Mẫu PDF", roles: ["admin"] },
  { href: "/reports", label: "Báo cáo", roles: ["admin"] },
  { href: "/declarations", label: "Kê khai", roles: ["admin"] },
  { href: "/drive", label: "Drive", roles: ["admin"] },
  { href: "/settings", label: "Cài đặt", roles: ["admin"] },
];

export function Nav({ role }: { role: Role }) {
  const path = usePathname();
  const visible = links.filter((link) => link.roles.includes(role));

  return (
    <nav className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-sky-100 bg-white/80 p-1.5 shadow-soft">
      {visible.map((link) => {
        const active = path === link.href || path.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "whitespace-nowrap rounded-lg px-3 py-2 text-sm font-extrabold transition",
              active ? "bg-brand text-white shadow-soft" : "text-slate-600 hover:bg-skySoft hover:text-navy",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
