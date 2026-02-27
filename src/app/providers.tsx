"use client";

import { MantineProvider, createTheme, MantineColorsTuple } from "@mantine/core";
import { I18nProvider } from "@/lib/i18n";
import { SessionProvider } from "next-auth/react";

const darkColors: MantineColorsTuple = [
  '#1a1a1a',
  '#2a2a2a',
  '#3a3a3a',
  '#4a4a4a',
  '#666666',
  '#808080',
  '#999999',
  '#b3b3b3',
  '#cccccc',
  '#e6e6e6',
];

const successColors: MantineColorsTuple = [
  '#e6f9f0',
  '#c3f0d9',
  '#9fe7c2',
  '#7bdeab',
  '#57d594',
  '#00C853',
  '#00b04a',
  '#009841',
  '#008038',
  '#00682f',
];

const dangerColors: MantineColorsTuple = [
  '#ffe6e6',
  '#ffcccc',
  '#ffb3b3',
  '#ff9999',
  '#ff8080',
  '#FF3B30',
  '#e6352b',
  '#cc2f26',
  '#b32921',
  '#99231c',
];

const theme = createTheme({
  primaryColor: "dark",
  colors: {
    dark: darkColors,
    success: successColors,
    danger: dangerColors,
  },
  black: '#000000',
  white: '#ffffff',
  defaultRadius: "md",
  fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  headings: {
    fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    fontWeight: '700',
    sizes: {
      h1: { fontSize: '32px', lineHeight: '1.2' },
      h2: { fontSize: '24px', lineHeight: '1.3' },
      h3: { fontSize: '20px', lineHeight: '1.4' },
      h4: { fontSize: '18px', lineHeight: '1.4' },
    },
  },
  components: {
    Button: {
      defaultProps: {
        size: 'lg',
        color: 'white',
      },
      styles: {
        root: {
          fontWeight: 600,
        },
      },
    },
    Modal: {
      defaultProps: {
        centered: true,
        overlayProps: {
          opacity: 0.55,
          blur: 3,
        },
      },
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <MantineProvider theme={theme} defaultColorScheme="dark">
        <I18nProvider>{children}</I18nProvider>
      </MantineProvider>
    </SessionProvider>
  );
}
