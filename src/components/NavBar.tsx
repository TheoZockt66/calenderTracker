"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  Home,
  LayoutDashboard,
  Key,
  Settings,
  Activity,
  type LucideIcon,
} from "lucide-react";

const KEY_VIZ_URL = "/key-visualization";

interface NavItem {
  name: string;
  url: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { name: "Home", url: "/", icon: Home },
  { name: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { name: "Keys", url: "/keys", icon: Key },
  { name: "Verlauf", url: "/key-visualization", icon: Activity },
  { name: "Settings", url: "/settings", icon: Settings },
];

export function NavBar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [activeIndex, setActiveIndex] = useState(0);
  const verlaufRef = useRef<HTMLAnchorElement>(null);

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
          const isVerlaufActive =
            item.url === KEY_VIZ_URL && pathname === KEY_VIZ_URL;

          return (
            <Link
              key={item.name}
              href={item.url}
              ref={item.url === KEY_VIZ_URL ? verlaufRef : undefined}
              className={`navbar__item ${isActive ? "navbar__item--active" : ""}`}
              onClick={
                isVerlaufActive
                  ? (e) => {
                      e.preventDefault();
                      const rect = verlaufRef.current?.getBoundingClientRect();
                      window.dispatchEvent(
                        new CustomEvent("toggle-key-picker", {
                          detail: {
                            centerX: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
                          },
                        })
                      );
                    }
                  : undefined
              }
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
