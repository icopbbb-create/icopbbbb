// components/NavItems.tsx
'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Companions', href: '/companions' },
  { label: 'My Journey', href: '/my-journey' },
];

export default function NavItems() {
  const pathname = usePathname() || '/';

  return (
    <nav className="flex items-center gap-6">
      {navItems.map(({ label, href }) => {
        const active = pathname === href;
        return (
          <Link
            href={href}
            key={label}
            className={cn(
              'text-sm transition-colors px-1 py-1',
              active ? 'text-primary font-semibold' : 'text-foreground/80 hover:text-foreground'
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
