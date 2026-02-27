"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

// ─── Types ───────────────────────────────────────────────────────────

export type Locale = "de" | "en";

type Translations = {
  [key: string]: string;
};

// ─── Translation Data ────────────────────────────────────────────────

const translations: Record<Locale, Translations> = {
  de: {
    // Navigation
    "nav.dashboard": "Übersicht",
    "nav.keys": "Keys",
    "nav.events": "Events",
    "nav.categories": "Kategorien",
    "nav.settings": "Einstellungen",

    // Dashboard
    "dashboard.title": "Übersicht",
    "dashboard.subtitle": "Dein Überblick über alle getrackte Zeiten",
    "dashboard.totalHours": "Gesamtstunden",
    "dashboard.totalEvents": "Events gesamt",
    "dashboard.activeKeys": "Aktive Keys",
    "dashboard.thisWeek": "Diese Woche",
    "dashboard.lastWeek": "Letzte Woche",
    "dashboard.weeklyOverview": "Wöchentliche Übersicht",
    "dashboard.hoursPerKey": "Stunden pro Key",
    "dashboard.recentEvents": "Letzte Events",
    "dashboard.hours": "Stunden",
    "dashboard.trend": "Trend",
    "dashboard.noData": "Keine Daten vorhanden",
    "dashboard.vsLastWeek": "vs. letzter Woche",
    "dashboard.viewAll": "Alle",

    // Keys
    "keys.title": "Keys verwalten",
    "keys.subtitle": "Erstelle und verwalte deine Tracking-Keys",
    "keys.addKey": "Neuen Key erstellen",
    "keys.editKey": "Key bearbeiten",
    "keys.deleteKey": "Key löschen",
    "keys.name": "Name",
    "keys.category": "Kategorie",
    "keys.totalTime": "Gesamtzeit",
    "keys.events": "Events",
    "keys.noKeys": "Noch keine Keys angelegt",
    "keys.search": "Keys suchen...",
    "keys.allCategories": "Alle Kategorien",
    "keys.uncategorized": "Ohne Kategorie",
    "keys.deleteConfirm": "Möchtest du diesen Key wirklich löschen?",
    "keys.color": "Farbe",
    "keys.created": "Erstellt",

    // Categories
    "categories.title": "Kategorien",
    "categories.subtitle": "Organisiere deine Keys in Kategorien",
    "categories.add": "Neue Kategorie",
    "categories.edit": "Kategorie bearbeiten",
    "categories.delete": "Kategorie löschen",
    "categories.name": "Name",
    "categories.description": "Beschreibung",
    "categories.noCategories": "Noch keine Kategorien angelegt",
    "categories.keysCount": "Keys",
    "categories.deleteConfirm": "Möchtest du diese Kategorie wirklich löschen?",
    "categories.descriptionPlaceholder": "z.B. Alle Fächer im 4. Semester",
    "categories.namePlaceholder": "z.B. Semester 4",

    // Events
    "events.title": "Events",
    "events.subtitle": "Alle getrackte Kalender-Events",
    "events.filter": "Nach Key filtern",
    "events.allKeys": "Alle Keys",
    "events.noEvents": "Keine Events gefunden",
    "events.duration": "Dauer",
    "events.date": "Datum",
    "events.search": "Events suchen...",
    "events.total": "Events",
    "events.gpmOnly": "Nur GPM-Events",

    // Settings
    "settings.title": "Einstellungen",
    "settings.language": "Sprache",
    "settings.languageDesc": "Ändere die Anzeigesprache",
    "settings.theme": "Design",
    "settings.darkMode": "Dunkelmodus",
    "settings.darkModeDesc": "Zwischen hell und dunkel wechseln",
    "settings.about": "Über CalendarTracker",
    "settings.aboutDesc": "Version 1.0.0",
    "settings.googleAccount": "Google-Konto",
    "settings.connected": "Verbunden",
    "settings.notConnected": "Nicht verbunden",
    "settings.connect": "Verbinden",
    "settings.disconnect": "Trennen",
    "settings.appearance": "Darstellung",
    "settings.account": "Konto",
    "settings.general": "Allgemein",
    "settings.install": "App installieren",
    "settings.installDesc": "CalendarTracker auf deinem Gerät installieren",
    "settings.german": "Deutsch",
    "settings.english": "Englisch",

    // Common
    "common.save": "Speichern",
    "common.cancel": "Abbrechen",
    "common.delete": "Löschen",
    "common.edit": "Bearbeiten",
    "common.add": "Hinzufügen",
    "common.close": "Schließen",
    "common.loading": "Laden...",
    "common.error": "Fehler",
    "common.success": "Erfolgreich",
    "common.hours": "Std.",
    "common.minutes": "Min.",
    "common.confirm": "Bestätigen",
    "common.search": "Suchen",
    "common.noCategory": "Keine Kategorie",
    "common.create": "Erstellen",
  },
  en: {
    // Navigation
    "nav.dashboard": "Dashboard",
    "nav.keys": "Keys",
    "nav.events": "Events",
    "nav.categories": "Categories",
    "nav.settings": "Settings",

    // Dashboard
    "dashboard.title": "Dashboard",
    "dashboard.subtitle": "Your overview of all tracked time",
    "dashboard.totalHours": "Total Hours",
    "dashboard.totalEvents": "Total Events",
    "dashboard.activeKeys": "Active Keys",
    "dashboard.thisWeek": "This Week",
    "dashboard.lastWeek": "Last Week",
    "dashboard.weeklyOverview": "Weekly Overview",
    "dashboard.hoursPerKey": "Hours per Key",
    "dashboard.recentEvents": "Recent Events",
    "dashboard.hours": "Hours",
    "dashboard.trend": "Trend",
    "dashboard.noData": "No data available",
    "dashboard.vsLastWeek": "vs. last week",
    "dashboard.viewAll": "All",

    // Keys
    "keys.title": "Manage Keys",
    "keys.subtitle": "Create and manage your tracking keys",
    "keys.addKey": "Create New Key",
    "keys.editKey": "Edit Key",
    "keys.deleteKey": "Delete Key",
    "keys.name": "Name",
    "keys.category": "Category",
    "keys.totalTime": "Total Time",
    "keys.events": "Events",
    "keys.noKeys": "No keys created yet",
    "keys.search": "Search keys...",
    "keys.allCategories": "All Categories",
    "keys.uncategorized": "Uncategorized",
    "keys.deleteConfirm": "Do you really want to delete this key?",
    "keys.color": "Color",
    "keys.created": "Created",

    // Categories
    "categories.title": "Categories",
    "categories.subtitle": "Organize your keys into categories",
    "categories.add": "New Category",
    "categories.edit": "Edit Category",
    "categories.delete": "Delete Category",
    "categories.name": "Name",
    "categories.description": "Description",
    "categories.noCategories": "No categories created yet",
    "categories.keysCount": "Keys",
    "categories.deleteConfirm": "Do you really want to delete this category?",
    "categories.descriptionPlaceholder": "e.g. All subjects in semester 4",
    "categories.namePlaceholder": "e.g. Semester 4",

    // Events
    "events.title": "Events",
    "events.subtitle": "All tracked calendar events",
    "events.filter": "Filter by Key",
    "events.allKeys": "All Keys",
    "events.noEvents": "No events found",
    "events.duration": "Duration",
    "events.date": "Date",
    "events.search": "Search events...",
    "events.total": "Events",
    "events.gpmOnly": "GPM events only",

    // Settings
    "settings.title": "Settings",
    "settings.language": "Language",
    "settings.languageDesc": "Change the display language",
    "settings.theme": "Theme",
    "settings.darkMode": "Dark Mode",
    "settings.darkModeDesc": "Switch between light and dark",
    "settings.about": "About CalendarTracker",
    "settings.aboutDesc": "Version 1.0.0",
    "settings.googleAccount": "Google Account",
    "settings.connected": "Connected",
    "settings.notConnected": "Not Connected",
    "settings.connect": "Connect",
    "settings.disconnect": "Disconnect",
    "settings.appearance": "Appearance",
    "settings.account": "Account",
    "settings.general": "General",
    "settings.install": "Install App",
    "settings.installDesc": "Install CalendarTracker on your device",
    "settings.german": "German",
    "settings.english": "English",

    // Common
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.add": "Add",
    "common.close": "Close",
    "common.loading": "Loading...",
    "common.error": "Error",
    "common.success": "Success",
    "common.hours": "hrs",
    "common.minutes": "min",
    "common.confirm": "Confirm",
    "common.search": "Search",
    "common.noCategory": "No Category",
    "common.create": "Create",
  },
};

// ─── Context ─────────────────────────────────────────────────────────

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("de");

  const t = useCallback(
    (key: string): string => {
      return translations[locale][key] || key;
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}
