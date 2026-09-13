import useWhatsapp from "../hooks/useWhatsapp.js";
import { registrarEvento } from "../api/products.js";
import { AREA_TACTIL_ANCHA } from "../utils/areaTactil.js";

/**
 * Floating WhatsApp contact button (FAB) — fixed-position, shown on public
 * catalog pages. `contexto` is forwarded to `useWhatsapp` unchanged (see
 * that hook for the accepted shapes per page).
 *
 * Uses WhatsApp's official brand green (#25D366) — an intentional, isolated
 * exception to the site's design tokens (CLAUDE.md), scoped to this one
 * button so it stays recognizable as WhatsApp.
 *
 * The glyph is an inline SVG of WhatsApp's speech-bubble/phone mark rather
 * than a Material Symbols stand-in (e.g. "chat") — Material Symbols has no
 * WhatsApp glyph, and a generic chat bubble would undercut the "this opens
 * WhatsApp" recognition a FAB like this depends on. No new icon library
 * added, per task constraints.
 *
 * `variant="inline"` renders it as a normal in-flow link (no `fixed`
 * positioning, no hours pill) for the ProductoDetalle hero's secondary
 * button row, alongside BotonCompartir. Default `variant="fab"` keeps the
 * original fixed floating-action-button behavior used everywhere else.
 *
 * OFFSET MÓVIL DE LA VARIANTE `fab` (13/09/2026). Todo consumidor de esta
 * variante hoy vive bajo `Layout.jsx` (`BotonWhatsappFlotante`, montado una
 * sola vez, y `Favoritos.jsx`, que mantiene el suyo propio) — o sea, TODOS
 * conviven con la isla flotante de `NavFlotante.jsx` en mobile. Por eso el
 * offset que evita superponerse con ella es el DEFAULT de la variante, no
 * algo que cada consumidor pase por `className`.
 *
 * La cuenta, a partir de `NavFlotante.jsx`: la píldora mide `p-1.5` (0.375rem
 * por lado) + `h-11` (2.75rem) = **3.5rem** de alto, y el wrapper que la aloja
 * la separa del borde inferior real de la pantalla con
 * `pb-[calc(1rem+env(safe-area-inset-bottom))]`. O sea que el BORDE SUPERIOR
 * de la isla queda a `1rem + 3.5rem = 4.5rem` (más el inset seguro) del fondo
 * de la pantalla. Este FAB mide `h-14` (3.5rem) y antes flotaba a `bottom-6`
 * (1.5rem): con la isla presente, su borde superior quedaba a `1.5 + 3.5 =
 * 5rem`, apenas 0.5rem por encima del techo de la isla — visualmente se
 * tocaban, y con la píldora de horario (`textoHorario`) sumando otra fila
 * arriba, se pisaban de lleno. `bottom-[calc(5.5rem+env(safe-area-inset-bottom))]`
 * deja el mismo margen de aire (1rem) que ya tenía el propio wrapper de la
 * isla contra el fondo de pantalla. En escritorio la isla no existe
 * (`NavFlotante` es `md:hidden`), así que `md:bottom-6 md:right-6` vuelve al
 * valor de siempre.
 */
function BotonWhatsapp({ contexto, productId, className = "", variant = "fab" }) {
  const { url, textoHorario } = useWhatsapp(contexto);

  function handleClick() {
    // Fire-and-forget (same pattern as BotonCompartir/registrarCompartido):
    // counted the moment the FAB is tapped, never blocks or can fail the
    // actual navigation to WhatsApp.
    registrarEvento("CLICK_WHATSAPP", productId);
  }

  if (!url) return null;

  if (variant === "inline") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        aria-label="Contactar por WhatsApp"
        // Área táctil: comparte fila y clases con `BotonCompartir`, al que la
        // medición del 07/09/2026 con `elementFromPoint` le encontró **19px de
        // alto** de área efectiva. Acá no llegó a medirse en navegador porque
        // el entorno local no tiene WhatsApp configurado y el componente
        // devuelve `null` sin número: el problema estaba igual, escondido
        // detrás de esa guarda. Mismo criterio que el vecino — pseudo-elemento
        // y no `min-h-11`, para no empujar la fila 26px.
        className={`font-label-md text-label-md inline-flex items-center gap-2 text-on-surface-variant hover:text-on-surface ${AREA_TACTIL_ANCHA} ${className}`}
      >
        <span className="inline-flex h-[18px] w-[18px] items-center justify-center">
          <svg viewBox="0 0 32 32" width="16" height="16" fill="currentColor" aria-hidden="true">
            <path d="M16.004 3C9.377 3 4 8.373 4 15c0 2.36.685 4.56 1.867 6.41L4 29l7.79-1.826A11.94 11.94 0 0 0 16.004 27C22.63 27 28 21.627 28 15S22.63 3 16.004 3Zm0 21.818a9.77 9.77 0 0 1-4.98-1.363l-.357-.212-4.62 1.084 1.11-4.5-.234-.368A9.78 9.78 0 0 1 5.2 15c0-5.965 4.85-10.818 10.804-10.818S26.8 9.035 26.8 15 21.958 24.818 16.004 24.818Zm5.61-7.32c-.307-.154-1.818-.898-2.1-1.001-.282-.103-.487-.154-.692.154-.205.308-.794 1.001-.973 1.207-.179.205-.358.23-.665.077-.307-.154-1.296-.478-2.469-1.523-.913-.814-1.53-1.82-1.709-2.128-.179-.308-.019-.474.135-.627.138-.138.307-.358.46-.538.154-.179.205-.307.307-.512.103-.205.052-.384-.026-.538-.077-.154-.692-1.67-.949-2.287-.25-.6-.505-.52-.692-.53l-.59-.01c-.205 0-.538.077-.82.384-.282.308-1.076 1.052-1.076 2.566s1.102 2.977 1.256 3.183c.154.205 2.17 3.313 5.257 4.646.735.317 1.308.507 1.755.649.737.234 1.408.201 1.938.122.591-.088 1.818-.744 2.074-1.462.256-.718.256-1.334.18-1.462-.077-.128-.282-.205-.59-.359Z" />
          </svg>
        </span>
        WhatsApp
      </a>
    );
  }

  return (
    <div
      className={`fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-50 flex flex-col items-end gap-2 md:bottom-7 md:right-7 md:flex-row md:items-center ${className}`}
    >
      {/* `hidden md:inline-block`: a 390px el texto de fuera de horario ocupa
          casi todo el ancho y tapa lo que pasa por detrás (medido el
          13/09/2026). En móvil el horario no se muestra en ningún lado.
          En escritorio va A LA IZQUIERDA del botón (`md:flex-row`), como la
          `.wa__etiqueta` del mockup del rediseño; el punto verde es el mismo
          verde de marca del botón, no un token. */}
      {textoHorario ? (
        <span className="font-body-sm hidden whitespace-nowrap rounded-full bg-surface-container-lowest px-3 py-2 text-[12px] font-medium leading-none text-on-surface shadow-sombra-2 md:inline-block">
          <span aria-hidden="true" className="mr-1.5 inline-block h-[7px] w-[7px] rounded-full bg-[#25D366] align-[1px]" />
          {textoHorario}
        </span>
      ) : null}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        aria-label="Contactar por WhatsApp"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-sombra-flotante transition-transform hover:scale-105"
      >
        <svg viewBox="0 0 32 32" width="28" height="28" fill="currentColor" aria-hidden="true">
          <path d="M16.004 3C9.377 3 4 8.373 4 15c0 2.36.685 4.56 1.867 6.41L4 29l7.79-1.826A11.94 11.94 0 0 0 16.004 27C22.63 27 28 21.627 28 15S22.63 3 16.004 3Zm0 21.818a9.77 9.77 0 0 1-4.98-1.363l-.357-.212-4.62 1.084 1.11-4.5-.234-.368A9.78 9.78 0 0 1 5.2 15c0-5.965 4.85-10.818 10.804-10.818S26.8 9.035 26.8 15 21.958 24.818 16.004 24.818Zm5.61-7.32c-.307-.154-1.818-.898-2.1-1.001-.282-.103-.487-.154-.692.154-.205.308-.794 1.001-.973 1.207-.179.205-.358.23-.665.077-.307-.154-1.296-.478-2.469-1.523-.913-.814-1.53-1.82-1.709-2.128-.179-.308-.019-.474.135-.627.138-.138.307-.358.46-.538.154-.179.205-.307.307-.512.103-.205.052-.384-.026-.538-.077-.154-.692-1.67-.949-2.287-.25-.6-.505-.52-.692-.53l-.59-.01c-.205 0-.538.077-.82.384-.282.308-1.076 1.052-1.076 2.566s1.102 2.977 1.256 3.183c.154.205 2.17 3.313 5.257 4.646.735.317 1.308.507 1.755.649.737.234 1.408.201 1.938.122.591-.088 1.818-.744 2.074-1.462.256-.718.256-1.334.18-1.462-.077-.128-.282-.205-.59-.359Z" />
        </svg>
      </a>
    </div>
  );
}

export default BotonWhatsapp;
