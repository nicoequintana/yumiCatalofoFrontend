/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Dark palette per user-provided reference ("Color Palette" swatch):
        // 07111D navy (background), 39444D slate (surfaces), 5D5D5D grey
        // (elevated surfaces/outline), E5E5DF off-white (text), DB9941 amber
        // (primary accent), AE2C11 terracotta (secondary accent). Token
        // *names* are unchanged from the light theme so every component
        // that references them repaints without any JSX changes.
        "secondary-fixed": "#f0b06b",
        "surface-variant": "#39444D",
        surface: "#07111D",
        "on-primary": "#07111D",
        "error-container": "#3a1410",
        "primary-container": "#5a3a14",
        "surface-dim": "#050d16",
        "tertiary-container": "#050d16",
        "surface-container-highest": "#5D5D5D",
        "on-secondary-fixed": "#2a0f08",
        "on-tertiary-container": "#c7ccce",
        "on-background": "#E5E5DF",
        "on-primary-fixed": "#2a1a05",
        "primary-fixed-dim": "#a9702c",
        "secondary-fixed-dim": "#8a2010",
        "inverse-primary": "#E8C989",
        "surface-container-lowest": "#0c1826",
        "on-surface": "#E5E5DF",
        "on-surface-variant": "#b9bcc2",
        "on-primary-fixed-variant": "#5a3a14",
        "surface-tint": "#E8C989",
        "on-tertiary": "#E5E5DF",
        "primary-fixed": "#f0b06b",
        "surface-container": "#39444D",
        "on-tertiary-fixed": "#E5E5DF",
        "on-tertiary-fixed-variant": "#c7ccce",
        "on-secondary-container": "#f5c9ab",
        "surface-bright": "#1a2634",
        "on-error-container": "#ffdad6",
        "inverse-surface": "#E5E5DF",
        "on-primary-container": "#f5c9ab",
        tertiary: "#E5E5DF",
        "secondary-container": "#5a2113",
        "on-error": "#ffffff",
        background: "#07111D",
        "surface-container-low": "#1a2634",
        "on-secondary-fixed-variant": "#f5c9ab",
        "tertiary-fixed": "#39444D",
        "surface-container-high": "#455260",
        outline: "#5D5D5D",
        "tertiary-fixed-dim": "#5D5D5D",
        "inverse-on-surface": "#07111D",
        "on-secondary": "#ffffff",
        error: "#AE2C11",
        primary: "#E8C989",
        secondary: "#AE2C11",
        "outline-variant": "#39444D",
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },
      spacing: {
        "container-max": "1280px",
        "margin-desktop": "64px",
        unit: "8px",
        gutter: "24px",
        "margin-mobile": "20px",
      },
      fontFamily: {
        "headline-md": ["Playfair Display"],
        "headline-lg-mobile": ["Playfair Display"],
        "label-sm": ["Montserrat"],
        "headline-lg": ["Playfair Display"],
        "label-md": ["Montserrat"],
        "display-lg": ["Playfair Display"],
        "body-lg": ["Montserrat"],
        "body-md": ["Montserrat"],
      },
      fontSize: {
        "headline-md": ["24px", { lineHeight: "1.3", fontWeight: "600" }],
        "headline-lg-mobile": ["28px", { lineHeight: "1.2", fontWeight: "600" }],
        "label-sm": ["12px", { lineHeight: "1.2", letterSpacing: "0.08em", fontWeight: "500" }],
        "headline-lg": ["32px", { lineHeight: "1.2", fontWeight: "600" }],
        "label-md": ["14px", { lineHeight: "1.2", letterSpacing: "0.05em", fontWeight: "600" }],
        "display-lg": ["48px", { lineHeight: "1.1", fontWeight: "700" }],
        "body-lg": ["18px", { lineHeight: "1.6", fontWeight: "400" }],
        "body-md": ["16px", { lineHeight: "1.6", fontWeight: "400" }],
        // Missing from the client's own mockup config (docs/mockups/*.html) despite
        // being used in their markup (home.html L218/222/226/230, detalle L224).
        // Defined here to fix the gap rather than silently port the broken class.
        "label-sm-mobile": ["11px", { lineHeight: "1.2", letterSpacing: "0.08em", fontWeight: "500" }],
      },
      boxShadow: {
        // Promoted from a raw CSS class (catalogo.html L103: `.ambient-shadow`) and
        // an inline `style` (home.html L141, detalle-producto.html L150) into a
        // real Tailwind token so it's usable as `shadow-ambient`.
        ambient: "0px 10px 30px rgba(26, 26, 26, 0.05)",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        fadeIn: "fadeIn 200ms ease-in-out",
      },
    },
  },
  plugins: [],
};
