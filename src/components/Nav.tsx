"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/creators", label: "Creators" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/partnerships", label: "Partnerships" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="nav" aria-label="Main">
      <Link href="/" className="brand">
        <span className="logo" aria-hidden>
          ◆
        </span>
        CreatorHub
      </Link>
      <ul>
        {LINKS.map((l) => {
          const active =
            l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={active ? "active" : undefined}
              >
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
