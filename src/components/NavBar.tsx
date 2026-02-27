"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  Home,
  LayoutDashboard,
  CalendarDays,
  Key,
  Settings,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  name: string;
  url: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { name: "Home", url: "/", icon: Home },
  { name: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { name: "Kalender", url: "/calendar", icon: CalendarDays },
  { name: "Keys", url: "/keys", icon: Key },
  { name: "Settings", url: "/settings", icon: Settings },
];

export function NavBar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const idx = NAV_ITEMS.findIndex((item) => {
      if (item.url === "/") return pathname === "/";
      return pathname.startsWith(item.url);
    });
    if (idx >= 0) setActiveIndex(idx);
  }, [pathname]);

  if (!session) return null;

  return (
    <div className="navbar-wrapper">
      <nav className="navbar">
        {NAV_ITEMS.map((item, index) => {
          const Icon = item.icon;
          const isActive = activeIndex === index;

          return (
            <Link
              key={item.name}
              href={item.url}
              className={`navbar__item ${isActive ? "navbar__item--active" : ""}`}
            >
              <Icon size={20} strokeWidth={2.5} />
              <span className="navbar__label">{item.name}</span>

              {isActive && (
                <motion.div
                  layoutId="navbar-lamp"
                  className="navbar__lamp-indicator"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                  }}
                >
                  <div className="navbar__lamp-bar" />
                  <div className="navbar__lamp-glow" />
                </motion.div>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
