/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--color-background)",
        "on-background": "var(--color-on-background)",
        surface: "var(--color-surface)",
        "surface-container-lowest": "var(--color-surface-container-lowest)",
        "surface-container-low": "var(--color-surface-container-low)",
        "surface-container": "var(--color-surface-container)",
        "surface-container-high": "var(--color-surface-container-high)",
        "surface-container-highest": "var(--color-surface-container-highest)",
        "surface-variant": "var(--color-surface-variant)",
        "on-surface": "var(--color-on-surface)",
        "on-surface-variant": "var(--color-on-surface-variant)",
        outline: "var(--color-outline)",
        "outline-variant": "var(--color-outline-variant)",
        primary: "var(--color-primary)",
        "on-primary": "var(--color-on-primary)",
        "primary-container": "var(--color-primary-container)",
        "on-primary-container": "var(--color-on-primary-container)",
        secondary: "var(--color-secondary)",
        "on-secondary": "var(--color-on-secondary)",
        "secondary-container": "var(--color-secondary-container)",
        "on-secondary-container": "var(--color-on-secondary-container)",
        tertiary: "var(--color-tertiary)",
        "on-tertiary": "var(--color-on-tertiary)",
        "tertiary-container": "var(--color-tertiary-container)",
        "on-tertiary-container": "var(--color-on-tertiary-container)",
        error: "var(--color-error)",
        "on-error": "var(--color-on-error)",
        "error-container": "var(--color-error-container)",
        "on-error-container": "var(--color-on-error-container)",
        "inverse-surface": "var(--color-inverse-surface)",
        // Mockup-literal aliases ("Vibrant Editorial Discovery" style guide)
        // for classes referenced by that exact name in markup — same values
        // as their semantic counterparts above (primary/secondary/tertiary/
        // background), not a second independent palette.
        "terracotta-warm": "var(--color-terracotta-warm)",
        "moss-green": "var(--color-moss-green)",
        "golden-sand": "var(--color-golden-sand)",
        "cream-base": "var(--color-cream-base)",
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
        gutter: "24px",
        "margin-mobile": "20px",
        "navbar-height": "88px",
      },
      // Sin serifas en todo el sitio, a propósito: "Libre Caslon Text" (la
      // serif de titulares del mockup original) se sacó por completo — los
      // seis tokens de headline/display quedan en la misma sans que el body.
      fontFamily: {
        "headline-md": ["Plus Jakarta Sans", "sans-serif"],
        "headline-lg-mobile": ["Plus Jakarta Sans", "sans-serif"],
        "label-sm": ["Plus Jakarta Sans", "sans-serif"],
        "headline-lg": ["Plus Jakarta Sans", "sans-serif"],
        "label-md": ["Plus Jakarta Sans", "sans-serif"],
        "display-lg": ["Plus Jakarta Sans", "sans-serif"],
        "display-xl": ["Plus Jakarta Sans", "sans-serif"],
        "display-xl-mobile": ["Plus Jakarta Sans", "sans-serif"],
        "body-lg": ["Plus Jakarta Sans", "sans-serif"],
        "body-md": ["Plus Jakarta Sans", "sans-serif"],
      },
      fontSize: {
        "headline-md": ["24px", { lineHeight: "1.3", fontWeight: "600" }],
        "headline-lg-mobile": ["28px", { lineHeight: "1.2", fontWeight: "600" }],
        "label-sm": ["12px", { lineHeight: "1.2", letterSpacing: "0.08em", fontWeight: "500" }],
        "headline-lg": ["32px", { lineHeight: "1.2", fontWeight: "600" }],
        "label-md": ["14px", { lineHeight: "1.2", letterSpacing: "0.05em", fontWeight: "600" }],
        "display-lg": ["48px", { lineHeight: "1.1", fontWeight: "700" }],
        // Hero headline. Split into a desktop and a mobile token (instead of a
        // single fluid `clamp()`) to match the `headline-lg` / `headline-lg-mobile`
        // pair already in this file: `fontSize` tokens carry weight and tracking
        // too, and those differ between the two sizes — a 72px headline needs
        // tighter tracking than a 44px one to read as one block.
        "display-xl": ["72px", { lineHeight: "1.05", letterSpacing: "-0.03em", fontWeight: "700" }],
        "display-xl-mobile": [
          "44px",
          { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "700" },
        ],
        "body-lg": ["18px", { lineHeight: "1.6", fontWeight: "400" }],
        "body-md": ["16px", { lineHeight: "1.6", fontWeight: "400" }],
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
        // Cinta de anuncios (`BarraAnuncios`). El -50% no es arbitrario: la
        // pista renderiza el mismo grupo de mensajes DOS veces, así que
        // desplazarla exactamente media pista deja la vista idéntica al punto
        // de partida y el reinicio no se ve. Con cualquier otro valor aparece
        // un salto en la costura.
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 200ms ease-in-out",
        // Sin duración acá a propósito: la fija el componente en un `style`
        // inline, calculada a partir del ancho medido del grupo y una velocidad
        // constante en px/s. Si la duración fuera fija, agregar o quitar
        // mensajes cambiaría la velocidad del texto.
        marquee: "marquee linear infinite",
      },
    },
  },
  plugins: [],
};
