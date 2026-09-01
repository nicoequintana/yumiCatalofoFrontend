/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--color-background) / <alpha-value>)",
        "on-background": "rgb(var(--color-on-background) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        "surface-container-lowest": "rgb(var(--color-surface-container-lowest) / <alpha-value>)",
        "surface-container-low": "rgb(var(--color-surface-container-low) / <alpha-value>)",
        "surface-container": "rgb(var(--color-surface-container) / <alpha-value>)",
        "surface-container-high": "rgb(var(--color-surface-container-high) / <alpha-value>)",
        "surface-container-highest": "rgb(var(--color-surface-container-highest) / <alpha-value>)",
        "surface-variant": "rgb(var(--color-surface-variant) / <alpha-value>)",
        "on-surface": "rgb(var(--color-on-surface) / <alpha-value>)",
        "on-surface-variant": "rgb(var(--color-on-surface-variant) / <alpha-value>)",
        outline: "rgb(var(--color-outline) / <alpha-value>)",
        "outline-variant": "rgb(var(--color-outline-variant) / <alpha-value>)",
        primary: "rgb(var(--color-primary) / <alpha-value>)",
        "on-primary": "rgb(var(--color-on-primary) / <alpha-value>)",
        "primary-container": "rgb(var(--color-primary-container) / <alpha-value>)",
        "on-primary-container": "rgb(var(--color-on-primary-container) / <alpha-value>)",
        secondary: "rgb(var(--color-secondary) / <alpha-value>)",
        "on-secondary": "rgb(var(--color-on-secondary) / <alpha-value>)",
        "secondary-container": "rgb(var(--color-secondary-container) / <alpha-value>)",
        "on-secondary-container": "rgb(var(--color-on-secondary-container) / <alpha-value>)",
        tertiary: "rgb(var(--color-tertiary) / <alpha-value>)",
        "on-tertiary": "rgb(var(--color-on-tertiary) / <alpha-value>)",
        "tertiary-container": "rgb(var(--color-tertiary-container) / <alpha-value>)",
        "on-tertiary-container": "rgb(var(--color-on-tertiary-container) / <alpha-value>)",
        error: "rgb(var(--color-error) / <alpha-value>)",
        "on-error": "rgb(var(--color-on-error) / <alpha-value>)",
        "error-container": "rgb(var(--color-error-container) / <alpha-value>)",
        "on-error-container": "rgb(var(--color-on-error-container) / <alpha-value>)",
        "inverse-surface": "rgb(var(--color-inverse-surface) / <alpha-value>)",
        // Mockup-literal aliases ("Vibrant Editorial Discovery" style guide)
        // for classes referenced by that exact name in markup — same values
        // as their semantic counterparts above (primary/secondary/tertiary/
        // background), not a second independent palette.
        "terracotta-warm": "rgb(var(--color-terracotta-warm) / <alpha-value>)",
        "moss-green": "rgb(var(--color-moss-green) / <alpha-value>)",
        "golden-sand": "rgb(var(--color-golden-sand) / <alpha-value>)",
        "cream-base": "rgb(var(--color-cream-base) / <alpha-value>)",
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
        // Alto EXACTO de la barra del `Navbar`, por breakpoint. Son la misma
        // medida en dos usos que tienen que coincidir sí o sí: el `h-…` de la
        // barra en `Navbar.jsx` y el `top-…` de la barra sticky de
        // `FiltrosCatalogo.jsx`. Manejarlos con el mismo token es lo que hace
        // imposible que se desincronicen.
        //
        // Antes había UN solo `navbar-height: 88px` mientras el navbar no
        // tenía alto fijo (crecía de su contenido: 76px en móvil, 84px en
        // escritorio). La barra de filtros se clavaba 12px/4px más abajo de
        // donde el navbar terminaba, y por ese hueco se veía pasar la grilla
        // al scrollear. Un único valor no puede ser correcto para los dos
        // breakpoints: por eso son dos.
        "navbar-height": "76px",
        "navbar-height-md": "84px",
        // Alto de la barra superior en flujo del admin (`AdminLayout.jsx`,
        // visible solo por debajo de `lg`). Contrato de dos puntas, mismo
        // criterio que `navbar-height` con `FiltrosCatalogo`: esta barra usa
        // `h-topbar-admin`, y `EditorTabs` usa `top-topbar-admin` para pegar
        // sus pestañas justo debajo — un valor hardcodeado en cualquiera de
        // los dos lados reabre el mismo hueco que ya se documentó para el
        // navbar público.
        "topbar-admin": "56px",
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
