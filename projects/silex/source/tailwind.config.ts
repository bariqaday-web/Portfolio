import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1E3A5F",
        paper: "#FAF8F5",
        muted: { DEFAULT: "#777C84", foreground: "#1E3A5F" },
        line: "#E8E5DE",
        chip: "#F1EFE9",
        accent: { DEFAULT: "#1E3A5F", foreground: "#FFFFFF" },
        card: { DEFAULT: "#FFFFFF", foreground: "#1E3A5F" },
        background: "#FAF8F5",
        foreground: "#1E3A5F",
        popover: { DEFAULT: "#FFFFFF", foreground: "#1E3A5F" },
        primary: { DEFAULT: "#1E3A5F", foreground: "#FFFFFF" },
        secondary: { DEFAULT: "#F1EFE9", foreground: "#1E3A5F" },
        destructive: { DEFAULT: "#DC2626", foreground: "#FFFFFF" },
        success: { DEFAULT: "#16A34A", foreground: "#FFFFFF" },
        border: "#E8E5DE",
        input: "#E8E5DE",
        ring: "#1E3A5F",
        sidebar: { DEFAULT: "#FFFFFF", foreground: "#1E3A5F" },
        "sidebar-primary": "#1E3A5F",
        "sidebar-primary-foreground": "#FFFFFF",
        "sidebar-accent": "#F1EFE9",
        "sidebar-accent-foreground": "#1E3A5F",
        "sidebar-border": "#E8E5DE",
        "sidebar-ring": "#1E3A5F",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        sans: ["var(--font-inter)", "sans-serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
        card: "1.25rem",
        pill: "999px",
      },
      boxShadow: {
        soft: "0 4px 18px rgba(30,58,95,0.06)",
        float: "0 12px 28px rgba(30,58,95,0.12)",
      },
      maxWidth: {
        app: "420px",
      },
    },
  },
  plugins: [],
};
export default config;
