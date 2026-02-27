"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import {
  CalendarDays,
  LogOut,
  Loader2,
  LogIn,
  LayoutDashboard,
  Settings,
  Key,
  User,
  ArrowRight,
} from "lucide-react";

interface BentoCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  href?: string;
  action?: () => void;
  highlight?: boolean;
  cta?: string;
  gridArea?: string;
  extra?: React.ReactNode;
}

function BentoCard({ icon: Icon, title, description, href, action, highlight, cta, gridArea, extra }: BentoCardProps) {
  const content = (
    <>
      <div className="bento-card__content">
        <div className="bento-card__icon">
          <Icon size={highlight ? 22 : 18} strokeWidth={2.5} />
        </div>
        <h2 className="bento-card__title" style={highlight ? { fontSize: "22px" } : undefined}>
          {title}
        </h2>
        <p className="bento-card__desc">{description}</p>
        {extra}
      </div>
      {cta && (
        <div className="bento-card__cta">
          <ArrowRight size={16} />
          <span>{cta}</span>
        </div>
      )}
      <div className="bento-card__overlay" />
    </>
  );

  const style: React.CSSProperties = { gridArea };

  if (href) {
    return (
      <Link href={href} className="bento-card" style={style}>
        {content}
      </Link>
    );
  }

  return (
    <div
      className="bento-card"
      style={{ ...style, cursor: action ? "pointer" : "default" }}
      onClick={action}
    >
      {content}
    </div>
  );
}

export default function HomePage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Loader2
          size={32}
          className="animate-spin"
          style={{ color: "var(--app-text-muted)" }}
        />
      </main>
    );
  }

  const isLoggedIn = !!session;

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        width: "100%",
      }}
    >
      <div className="animate-fade-up" style={{ textAlign: "center", marginBottom: "48px" }}>
        <h1
          style={{
            fontSize: "clamp(28px, 5vw, 42px)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
          }}
        >
          CalendarTracker
        </h1>
        <p
          style={{
            marginTop: "8px",
            fontSize: "14px",
            color: "var(--app-text-muted)",
          }}
        >
          Deine Kalenderzeit im Blick.
        </p>
      </div>

      <div className="bento-grid" style={{ maxWidth: "780px" }}>
        {isLoggedIn ? (
          <>
            {/* User / Hero card */}
            <BentoCard
              icon={User}
              title={`Hallo, ${session.user?.name?.split(" ")[0] || "User"}`}
              description={session.user?.email || "Verbunden mit Google."}
              highlight
              gridArea="1 / 1 / 3 / 4"
              extra={
                <button
                  className="btn-ghost"
                  style={{ marginTop: "12px", width: "fit-content" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    signOut();
                  }}
                >
                  <LogOut size={15} />
                  Abmelden
                </button>
              }
            />
            <BentoCard
              icon={LayoutDashboard}
              title="Dashboard"
              description="Alle getrackten Zeiten auf einen Blick."
              href="/dashboard"
              cta="Dashboard öffnen"
              gridArea="1 / 4 / 2 / 7"
            />
            <BentoCard
              icon={CalendarDays}
              title="Kalender"
              description="Events aus all deinen Google-Kalendern einsehen."
              href="/calendar"
              cta="Kalender öffnen"
              gridArea="2 / 4 / 3 / 7"
            />
            <BentoCard
              icon={Settings}
              title="Einstellungen"
              description="Sprache, Dark Mode und mehr."
              href="/settings"
              cta="Einstellungen öffnen"
              gridArea="3 / 1 / 4 / 3"
            />
            <BentoCard
              icon={Key}
              title="Keys verwalten"
              description="Tracking-Keys erstellen und organisieren."
              href="/keys"
              cta="Keys öffnen"
              gridArea="3 / 3 / 4 / 7"
            />
          </>
        ) : (
          <>
            {/* Login card */}
            <BentoCard
              icon={LogIn}
              title="Anmelden"
              description="Mit deinem Google-Konto verbinden und Kalenderdaten synchronisieren."
              highlight
              gridArea="1 / 1 / 3 / 4"
              extra={
                <button
                  className="btn-primary"
                  style={{ marginTop: "16px", width: "fit-content" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    signIn("google", { callbackUrl: "/" });
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Mit Google anmelden
                </button>
              }
            />
            <BentoCard
              icon={LayoutDashboard}
              title="Dashboard"
              description="Alle getrackten Zeiten auf einen Blick."
              gridArea="1 / 4 / 2 / 7"
            />
            <BentoCard
              icon={CalendarDays}
              title="Kalender"
              description="Events aus deinen Google-Kalendern."
              gridArea="2 / 4 / 3 / 7"
            />
            <BentoCard
              icon={Settings}
              title="Einstellungen"
              description="Sprache, Dark Mode und mehr."
              gridArea="3 / 1 / 4 / 3"
            />
            <BentoCard
              icon={Key}
              title="Keys verwalten"
              description="Tracking-Keys erstellen und organisieren."
              gridArea="3 / 3 / 4 / 7"
            />
          </>
        )}
      </div>
    </main>
  );
}
