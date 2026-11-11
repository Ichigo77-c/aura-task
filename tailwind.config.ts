import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ["selector", "[data-theme='dark']"],
  theme: {
    extend: {
      colors: {
        // Aura Tasks - Indigo/Violet Palette
        aura: {
          50: "#f9f5ff",
          100: "#f3e8ff",
          200: "#e9d5ff",
          300: "#d8b4fe",
          400: "#c084fc",
          500: "#a855f7",
          600: "#9333ea",
          700: "#7e22ce",
          800: "#6b21a8",
          900: "#581c87",
        },
        indigo: {
          50: "#f0f4ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },
      },
      boxShadow: {
        // Aura glow effects
        "aura-sm": "0 2px 8px rgba(99, 102, 241, 0.15)",
        aura: "0 4px 16px rgba(99, 102, 241, 0.25)",
        "aura-lg": "0 8px 32px rgba(99, 102, 241, 0.35)",
        "aura-xl": "0 16px 48px rgba(99, 102, 241, 0.45)",
        // Dark theme glow
        "dark-aura": "0 0 20px rgba(168, 85, 247, 0.3)",
        "dark-aura-lg": "0 0 40px rgba(168, 85, 247, 0.4)",
      },
      animation: {
        // Smooth entrance animations
        "fade-in": "fadeIn 0.3s ease-in-out",
        "zoom-in": "zoomIn 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)",
        "slide-in": "slideIn 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        zoomIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
