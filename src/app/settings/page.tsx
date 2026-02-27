"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMantineColorScheme } from "@mantine/core";
import { useI18n } from "@/lib/i18n";
import { Switch } from "@/components/ui/Switch";
import {
  Globe,
  Moon,
  Sun,
  Info,
  ChevronRight,
  Download,
  Shield,
  ArrowLeft,
  Loader2,
} from "lucide-react";

function SettingRow({
  icon: Icon,
  label,
  description,
  children,
  onClick,
  danger,
}: {
  icon: React.ElementType;
  label: string;
  description?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <div
      className={`setting-row ${onClick ? "setting-row--clickable" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className={`setting-icon ${danger ? "setting-icon--danger" : ""}`}>
          <Icon
            size={16}
            style={{
              color: danger ? "#FF3B30" : "var(--app-text-secondary)",
            }}
          />
        </div>
        <div className="min-w-0">
          <p
            style={{
              fontSize: "14px",
              fontWeight: 500,
              color: danger ? "#FF3B30" : undefined,
            }}
          >
            {label}
          </p>
          {description && (
            <p
              style={{
                marginTop: "2px",
                fontSize: "12px",
                color: "var(--app-text-muted)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="ml-4 flex-shrink-0">
        {children || (
          <ChevronRight size={16} style={{ color: "var(--app-text-muted)" }} />
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const { data: session, status } = useSession();
  const router = useRouter();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const isDarkMode = colorScheme === "dark";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleDarkModeToggle = (checked: boolean) => {
    setColorScheme(checked ? "dark" : "light");
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    }
  };

  if (status === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--app-text-muted)" }} />
      </main>
    );
  }

  if (!session) return null;

  return (
    <main style={{ minHeight: "100vh", padding: "40px 20px" }}>
      <div style={{ maxWidth: "672px", margin: "0 auto", width: "100%" }}>
        {/* Back + Header */}
        <div className="mb-8 animate-fade-up">
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "13px",
              color: "var(--app-text-muted)",
              textDecoration: "none",
              marginBottom: "16px",
            }}
          >
            <ArrowLeft size={16} />
            Zurück
          </Link>
          <h1 style={{ fontSize: "clamp(24px, 4vw, 32px)", fontWeight: 800, letterSpacing: "-0.03em" }}>
            {t("settings.title")}
          </h1>
        </div>

        {/* Appearance */}
        <div className="mb-5 animate-fade-up delay-1">
          <p className="section-label">{t("settings.appearance")}</p>
          <div className="glow-card" style={{ overflow: "hidden" }}>
            <SettingRow
              icon={isDarkMode ? Moon : Sun}
              label={t("settings.darkMode")}
              description={t("settings.darkModeDesc")}
            >
              <Switch
                checked={isDarkMode}
                onCheckedChange={handleDarkModeToggle}
                showIcons
              />
            </SettingRow>
            <div style={{ borderTop: "1px solid var(--app-border)" }} />
            <SettingRow
              icon={Globe}
              label={t("settings.language")}
              description={t("settings.languageDesc")}
            >
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setLocale("de")}
                  className="btn-ghost"
                  style={{
                    padding: "6px 12px",
                    fontSize: "12px",
                    fontWeight: 600,
                    ...(locale === "de"
                      ? { background: "var(--app-fg)", color: "var(--app-bg)", borderColor: "transparent" }
                      : {}),
                  }}
                >
                  {t("settings.german")}
                </button>
                <button
                  onClick={() => setLocale("en")}
                  className="btn-ghost"
                  style={{
                    padding: "6px 12px",
                    fontSize: "12px",
                    fontWeight: 600,
                    ...(locale === "en"
                      ? { background: "var(--app-fg)", color: "var(--app-bg)", borderColor: "transparent" }
                      : {}),
                  }}
                >
                  {t("settings.english")}
                </button>
              </div>
            </SettingRow>
          </div>
        </div>

        {/* General */}
        <div className="mb-5 animate-fade-up delay-2">
          <p className="section-label">{t("settings.general")}</p>
          <div className="glow-card" style={{ overflow: "hidden" }}>
            <SettingRow
              icon={Download}
              label={t("settings.install")}
              description={t("settings.installDesc")}
              onClick={handleInstall}
            />
            <div style={{ borderTop: "1px solid var(--app-border)" }} />
            <SettingRow
              icon={Shield}
              label={t("settings.googleAccount")}
              description={t("settings.notConnected")}
            >
              <button className="btn-ghost" style={{ fontSize: "12px" }}>
                {t("settings.connect")}
              </button>
            </SettingRow>
          </div>
        </div>

        {/* About */}
        <div className="animate-fade-up delay-3">
          <p className="section-label">Info</p>
          <div className="glow-card" style={{ overflow: "hidden" }}>
            <SettingRow
              icon={Info}
              label={t("settings.about")}
              description={t("settings.aboutDesc")}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
