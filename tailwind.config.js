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
        // for classes referenced by that exact name in markup. These are four
        // TOKENS OF THEIR OWN, backed by their own custom properties in
        // `index.css` — close to the semantic tokens above, but NOT equal to
        // them. In light mode only `cream-base` matches its obvious
        // counterpart (`background`); `terracotta-warm` (178 74 42) differs
        // from `primary` (157 62 29), `moss-green` (96 108 56) differs from
        // `secondary` (88 99 48), and `golden-sand` (233 196 106) matches
        // `tertiary-container`, not `tertiary` (115 88 2). They diverge in
        // dark mode too. So do NOT "unify" them with the semantic tokens on
        // the assumption that they hold the same values: that would change
        // colors on screen.
        "terracotta-warm": "rgb(var(--color-terracotta-warm) / <alpha-value>)",
        "moss-green": "rgb(var(--color-moss-green) / <alpha-value>)",
        "golden-sand": "rgb(var(--color-golden-sand) / <alpha-value>)",
        "cream-base": "rgb(var(--color-cream-base) / <alpha-value>)",
        // Teal de marca (el del logo). Ver el comentario en `index.css`: es
        // fijo, no cambia con el tema del admin.
        "brand-teal": "rgb(var(--color-brand-teal) / <alpha-value>)",
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
      // tokens de headline/display quedan en la misma familia que el body.
      //
      // Cada token referencia una CUSTOM PROPERTY (`--font-display`,
      // `--font-label`, `--font-body`), no un nombre fijo — mismo mecanismo
      // que los colores de arriba. `:root, .paleta-clara` (`index.css`) las
      // define en "Plus Jakarta Sans" (admin, sin cambios); `.tema-publico`
      // las redefine en Outfit (títulos/etiquetas/precios) y DM Sans (texto
      // corriente), solo fuera del panel.
      fontFamily: {
        "headline-md": ["var(--font-display)", "sans-serif"],
        "headline-sm": ["var(--font-display)", "sans-serif"],
        "label-sm": ["var(--font-label)", "sans-serif"],
        "headline-lg": ["var(--font-display)", "sans-serif"],
        "label-md": ["var(--font-label)", "sans-serif"],
        "label-lg": ["var(--font-label)", "sans-serif"],
        "display-lg": ["var(--font-display)", "sans-serif"],
        "display-xl": ["var(--font-display)", "sans-serif"],
        "body-lg": ["var(--font-body)", "sans-serif"],
        "body-md": ["var(--font-body)", "sans-serif"],
        "body-sm": ["var(--font-body)", "sans-serif"],
      },
      // Sistema tipográfico responsive (guía tipográfica del 12/09/2026): el
      // TAMAÑO de cada token vive en una custom property de `index.css`
      // (`--fs-<token>`, `--lh-<token>`) y acá solo se referencia con `var()`
      // — Tailwind no puede alternar un `fontSize` por media query, así que el
      // cambio entre mobile y escritorio (corte a 1024px) lo hace la media
      // query de `index.css` redefiniendo la custom property, sin tocar esta
      // lista ni ningún call site. Mismo patrón que ya usan los colores del
      // proyecto: valores en `index.css`, referencia acá.
      //
      // El PESO sí es fijo por token y vive acá, no en una variable: la tabla
      // no lo hace responsive.
      //
      // `display-xl-mobile` y `headline-lg-mobile` (y sus `font-*-mobile`
      // pareados) se dieron de baja: existían solo para simular a mano lo que
      // ahora hace la media query. `headline-sm` y `body-sm` son nuevos: el
      // panel admin y `SlideCampania.jsx` ya los usaban en el markup sin que
      // tuvieran CSS detrás (ver `PENDIENTES_SIN_DEFINIR` en
      // `src/tokens.test.js`, ahora vacío).
      fontSize: {
        "display-xl": ["var(--fs-display-xl)", { lineHeight: "var(--lh-display-xl)", letterSpacing: "-0.03em", fontWeight: "800" }],
        "display-lg": ["var(--fs-display-lg)", { lineHeight: "var(--lh-display-lg)", fontWeight: "700" }],
        "headline-lg": ["var(--fs-headline-lg)", { lineHeight: "var(--lh-headline-lg)", fontWeight: "700" }],
        "headline-md": ["var(--fs-headline-md)", { lineHeight: "var(--lh-headline-md)", fontWeight: "600" }],
        "headline-sm": ["var(--fs-headline-sm)", { lineHeight: "var(--lh-headline-sm)", fontWeight: "600" }],
        "body-lg": ["var(--fs-body-lg)", { lineHeight: "var(--lh-body-lg)", fontWeight: "400" }],
        // ┌──────────────────────────────────────────────────────────────────┐
        // │ `body-md` NO BAJA DE 16px, ni en mobile ni en desktop.           │
        // └──────────────────────────────────────────────────────────────────┘
        //
        // Es el tamaño de los CONTROLES DE FORMULARIO: lo consumen
        // `CampoPassword` (`CLASES_APARIENCIA`), `pages/cuenta/clasesCuenta.js`
        // y los inputs sueltos del panel. Safari en iOS hace zoom de TODA la
        // página al enfocar un campo con `font-size` menor a 16px, y después no
        // vuelve solo: la persona queda con el sitio ampliado y desplazado a
        // mitad de un checkout. Se ve como un bug del sitio y no hay forma de
        // desactivarlo desde CSS (el `maximum-scale` del viewport lo ignora iOS
        // desde hace años, y usarlo rompe el zoom manual de quien lo necesita).
        // Por eso `--fs-body-md` no tiene entrada en la media query de
        // `index.css`: se queda en 16px en los dos anchos.
        "body-md": ["var(--fs-body-md)", { lineHeight: "var(--lh-body-md)", fontWeight: "400" }],
        // CTA/Botones. `lineHeight: 1.0` porque la tabla lo pide "centrado":
        // el texto se centra con flex en el markup del botón, no con
        // interlineado. No cambia en escritorio, mismo criterio que `body-md`.
        "label-lg": ["var(--fs-label-lg)", { lineHeight: "var(--lh-label-lg)", letterSpacing: "0.01em", fontWeight: "600" }],
        "body-sm": ["var(--fs-body-sm)", { lineHeight: "var(--lh-body-sm)", fontWeight: "400" }],
        "label-sm": ["var(--fs-label-sm)", { lineHeight: "var(--lh-label-sm)", letterSpacing: "0.08em", fontWeight: "600" }],
        // Perdió su rol de botón (ver `label-lg`): queda como variante de Body
        // Small a 14px/500. El tracking de 0.05em se conserva de la escala
        // anterior; la tabla no dice nada sobre letterSpacing y tocarlo no es
        // parte de esta migración.
        "label-md": ["var(--fs-label-md)", { lineHeight: "var(--lh-label-md)", letterSpacing: "0.05em", fontWeight: "500" }],
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
