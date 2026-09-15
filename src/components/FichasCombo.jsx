import { formatPrecio } from "../utils/formato.js";

/**
 * Piezas del ticket de combo que comparten `TarjetaCombo` y `PaginaCombo`
 * (rediseño del 15/09/2026). El tamaño y qué variante se ve lo decide el CSS
 * por el ANCHO de `.tarjeta-combo-wrap` (container query en `index.css`),
 * nunca JS midiendo el DOM.
 */

function Signo() {
  return (
    <span aria-hidden="true" className="signo-combo font-display-lg leading-none text-outline">
      +
    </span>
  );
}

function Ficha({ item }) {
  return (
    <span
      data-testid="ficha-item"
      title={item.nombre}
      className="ficha-combo relative flex-none rounded-2xl bg-surface-container-lowest shadow-sombra-ficha"
    >
      <span className="ficha-combo-foto relative block h-full w-full overflow-hidden">
        {item.foto ? (
          <img src={item.foto} alt="" className="absolute inset-0 h-full w-full object-contain p-[8%]" />
        ) : (
          <span
            aria-hidden="true"
            className="material-symbols-outlined absolute inset-0 grid place-items-center text-on-surface-variant"
          >
            inventory_2
          </span>
        )}
      </span>
      {item.cantidad > 1 ? (
        <span className="absolute -right-1.5 -top-1.5 rounded-full bg-secondary px-1.5 py-1 font-label-sm text-[11px] font-extrabold leading-none tracking-normal text-on-secondary shadow-[0_0_0_2px_rgb(var(--color-surface-container-lowest))]">
          ×{item.cantidad}
        </span>
      ) : null}
    </span>
  );
}

function FichaMas({ cantidad }) {
  return (
    <span
      data-testid="ficha-mas"
      className="ficha-combo grid flex-none place-items-center rounded-2xl bg-surface-container-high font-display-lg text-[17px] font-extrabold leading-none text-primary-container"
    >
      +{cantidad}
    </span>
  );
}

/**
 * La fila de fichas. Regla de visibles (nunca desborda):
 * - ≤ 3 productos: todos, sin variantes.
 * - 4: ancha/apilada muestra los 4; angosta (≤ 380px) 2 + "+2".
 * - ≥ 5: ancha/apilada 3 + "+(n−3)"; angosta 2 + "+(n−2)".
 * Las dos variantes se pre-renderizan y `.fichas-solo-ancho`/`.fichas-solo-angosto`
 * prenden una u otra (mismo mecanismo que el diseño aprobado).
 */
export default function FichasCombo({ items, unidades }) {
  const n = items.length;

  return (
    <div className="fichas-combo flex min-w-0 items-center" aria-label={`Incluye ${unidades} productos`}>
      {n <= 3 ? (
        items.map((item, indice) => (
          <span key={item.productId} className="contents">
            {indice > 0 ? <Signo /> : null}
            <Ficha item={item} />
          </span>
        ))
      ) : (
        <>
          <Ficha item={items[0]} />
          <Signo />
          <Ficha item={items[1]} />
          <span className="fichas-solo-ancho">
            <Signo />
            <Ficha item={items[2]} />
          </span>
          <span className="fichas-solo-ancho">
            <Signo />
            {n === 4 ? <Ficha item={items[3]} /> : <FichaMas cantidad={n - 3} />}
          </span>
          <span className="fichas-solo-angosto">
            <Signo />
            <FichaMas cantidad={n - 2} />
          </span>
        </>
      )}
    </div>
  );
}

/**
 * El arte del cuerpo claro del ticket (15/09/2026, `combos-fondo-separado.html`),
 * dibujado ENTERO en código: manchas, curva punteada, subrayado y rayitas son
 * SVG de trazos (sin `<text>`), y "Mejor juntos" / "COMBO" salen de `content:`
 * de pseudo-elementos en `index.css` — nunca texto del DOM, así no entran a la
 * regla de cloaking ni los lee un lector de pantalla (`aria-hidden` además).
 * Dónde va cada pieza lo decide el CSS por container query, para que el
 * lettering nunca pise chips, título ni frase.
 */
export function ArteCombo() {
  return (
    <span aria-hidden="true" className="arte-combo">
      <svg className="arte-combo-mancha arte-combo-mancha-ti text-salvia" viewBox="0 0 150 130" focusable="false">
        <path d="M0 0 H140 C150 40 120 70 88 74 C55 78 40 96 30 130 H0 Z" fill="currentColor" />
      </svg>
      <svg className="arte-combo-mancha arte-combo-mancha-td text-durazno" viewBox="0 0 170 150" focusable="false">
        <path d="M20 0 H170 V150 C150 110 150 70 118 62 C80 54 40 44 20 0 Z" fill="currentColor" />
      </svg>
      <svg className="arte-combo-mancha arte-combo-mancha-bi text-durazno" viewBox="0 0 170 150" focusable="false">
        <path d="M0 20 C30 30 46 60 66 98 C80 122 120 112 150 130 L170 150 H0 Z" fill="currentColor" />
      </svg>
      <svg className="arte-combo-mancha arte-combo-mancha-bd text-salvia" viewBox="0 0 190 150" focusable="false">
        <path d="M190 40 C150 44 128 76 104 104 C84 128 40 124 20 150 H190 Z" fill="currentColor" />
        <path
          d="M10 148 C40 130 70 132 96 118 C122 104 130 70 186 58"
          fill="none"
          className="text-marca-combo"
          stroke="currentColor"
          strokeWidth="3"
          strokeDasharray="9 8"
          strokeLinecap="round"
        />
      </svg>
      <span className="arte-combo-lettering">
        <span className="arte-combo-script text-primary-container" />
        <svg className="arte-combo-subrayado text-naranja-vivo" viewBox="0 0 120 22" focusable="false">
          <path d="M8 12 C40 4 80 2 116 5" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
          <path d="M34 19 C62 14 90 12 116 13" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
        </svg>
      </span>
      <svg className="arte-combo-rayitas arte-combo-r1 text-naranja-vivo" viewBox="0 0 30 26" focusable="false">
        <path d="M4 22 L9 2 M14 24 L24 8 M18 25 L28 21" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <svg className="arte-combo-rayitas arte-combo-r2 text-primary-container" viewBox="0 0 30 26" focusable="false">
        <path d="M26 4 L20 22 M14 2 L8 16 M4 22 L14 22" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span className="arte-combo-marca" />
    </span>
  );
}

/** El sello rojo girado con el %: rojo propio (`bg-sello`), nunca el de error. */
export function SelloCombo({ porcentaje }) {
  return (
    <div
      role="img"
      aria-label={`${porcentaje}% de descuento`}
      className="sello-combo absolute z-[3] grid rotate-[-12deg] place-items-center rounded-full bg-sello text-center text-on-primary shadow-[0_8px_18px_-6px_rgba(120,12,8,0.55),inset_0_0_0_3px_rgb(var(--color-on-primary)/0.28)]"
    >
      <span className="grid gap-0.5">
        <span className="sello-combo-numero font-display-lg font-black leading-[0.9] tracking-[-0.04em]">
          -{porcentaje}%
        </span>
        <span className="font-display-lg text-[11px] font-extrabold uppercase leading-none tracking-[0.1em]">
          Combo
        </span>
      </span>
    </div>
  );
}

/** "Por separado" tachado + "Precio combo" grande: los dos montos llegan resueltos. */
export function PreciosCombo({ combo }) {
  return (
    <div className="grid gap-0.5 tabular-nums">
      <span className="flex flex-wrap items-baseline gap-2 font-label-md text-[13px] tracking-normal text-on-primary-container">
        Por separado
        <s className="font-display-lg text-[17px] font-semibold text-on-primary/70 decoration-secondary-container decoration-2">
          {formatPrecio(combo.precioSeparado)}
        </s>
      </span>
      <span className="mt-1.5 font-label-sm text-[11px] font-semibold uppercase tracking-[0.12em] text-on-primary-container">
        Precio combo
      </span>
      <span className="precio-combo font-display-xl font-black leading-none tracking-[-0.045em] text-on-primary">
        {formatPrecio(combo.precioCombo)}
      </span>
    </div>
  );
}

/** Pastilla "Ahorrás $" con el ícono de ahorro. */
export function AhorroCombo({ ahorro }) {
  return (
    <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-secondary-container/[0.22] py-[5px] pl-2 pr-3 font-label-md text-[14px] font-bold tracking-normal text-on-primary shadow-[inset_0_0_0_1px_rgb(var(--color-secondary-container)/0.55)]">
      <span aria-hidden="true" className="material-symbols-outlined text-[17px] text-secondary-container">
        savings
      </span>
      Ahorrás {formatPrecio(ahorro)}
    </span>
  );
}

/** Chip de stock ("Agotado" / "Quedan N") en la fila de chips, resuelto por el backend. */
export function ChipStockCombo({ combo }) {
  if (!combo.disponible) {
    return (
      <span className="rounded-full bg-error-container px-2.5 py-1 font-label-sm text-[11px] font-bold uppercase text-on-error-container">
        Agotado
      </span>
    );
  }
  if (combo.quedanPocos) {
    return (
      <span className="rounded-full bg-secondary-container px-2.5 py-1 font-label-sm text-[11px] font-bold uppercase text-on-secondary-container">
        Quedan {combo.alcanza}
      </span>
    );
  }
  return null;
}

/** Chip teal "Combo" + "N productos" + stock. */
export function ChipsCombo({ combo }) {
  return (
    <div className="chips-combo flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-[5px] rounded-full bg-primary py-[5px] pl-2 pr-2.5 font-label-sm text-[11px] font-extrabold uppercase leading-none tracking-[0.14em] text-on-primary">
        <span aria-hidden="true" className="material-symbols-outlined text-[15px]">
          redeem
        </span>
        Combo
      </span>
      <span className="font-label-md text-[12px] font-semibold tracking-normal text-on-surface-variant">
        {combo.unidades} productos
      </span>
      <ChipStockCombo combo={combo} />
    </div>
  );
}
