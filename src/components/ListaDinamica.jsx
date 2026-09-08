import { useState } from "react";

import { nuevoIdTemporal } from "../utils/idTemporal.js";

/**
 * Generic add/remove/reorder text-list editor, shared by every "simple list"
 * commercial field (Beneficios, ¿Cómo podés usarlo?, Ideal para, ¿Qué
 * incluye?) — all four are structurally identical (one line of text + order),
 * so they share this one component instead of four near-duplicates.
 *
 * Controlled by the parent, same pattern as `MediaUploader`: `items` is
 * `{ id, texto }[]`, `onChange(nextItems)` reports the new array. `id` may be
 * a persisted numeric id or a client-generated `tmp-<uuid>` string for
 * not-yet-saved items — this component never inspects `id`'s type, it only
 * uses it as the React key and for reorder/remove lookups.
 *
 * `etiqueta` is the ADD FIELD's accessible name, and it is not optional in
 * practice. Without it the only name that field has is its placeholder, and a
 * placeholder disappears the moment the user types: the product editor renders
 * four of these lists on the same screen, so "which list am I typing into?"
 * stops having an answer for anyone who can't see the section heading.
 */
function ListaDinamica({ items, onChange, placeholder, etiqueta }) {
  const [nuevoTexto, setNuevoTexto] = useState("");

  function agregar() {
    const texto = nuevoTexto.trim();
    if (!texto) return;
    onChange([...items, { id: nuevoIdTemporal(), texto }]);
    setNuevoTexto("");
  }

  function eliminar(index) {
    onChange(items.filter((_, i) => i !== index));
  }

  function mover(index, direccion) {
    const destino = index + direccion;
    if (destino < 0 || destino >= items.length) return;
    const siguientes = [...items];
    [siguientes[index], siguientes[destino]] = [siguientes[destino], siguientes[index]];
    onChange(siguientes);
  }

  return (
    <div>
      <div className="mb-3 flex flex-col gap-2">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-2 rounded-lg bg-surface-container px-4 py-2"
          >
            <span className="font-body-md text-body-md text-on-surface">{item.texto}</span>
            {/* Los tres botones llevan `min-h-11 min-w-11` SIN breakpoint.
                Traían `max-md:`, o sea 44×44 solo por debajo de 768px, y en
                escritorio quedaba el glifo pelado de 18px.

                ⚠️ No los agarró la auditoría del 07/09/2026 porque el barrido
                usó el editor de un producto NUEVO, donde las listas arrancan
                VACÍAS y estos botones no se renderizan nunca. Un control que
                solo existe con datos cargados no lo ve un barrido sobre un
                formulario en blanco.

                Se agrandan de verdad y no con pseudo-elemento porque los tres
                van en este `flex gap-1`: con glifos de 18px el paso es de
                22px, y tres áreas postizas de 44 se pisarían entre sí — la de
                más abajo en el DOM le robaría el área a la anterior. Crecer la
                caja no agrega costo nuevo: en mobile ya medían 44×44, así que
                escritorio pasa a igualar lo que el celular ya mostraba. */}
            <div className="flex shrink-0 items-center gap-1">
              {index > 0 ? (
                <button
                  type="button"
                  onClick={() => mover(index, -1)}
                  aria-label={`Mover ${item.texto} hacia arriba`}
                  className="inline-flex items-center justify-center text-on-surface-variant hover:text-on-surface min-h-11 min-w-11"
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                </button>
              ) : null}
              {index < items.length - 1 ? (
                <button
                  type="button"
                  onClick={() => mover(index, 1)}
                  aria-label={`Mover ${item.texto} hacia abajo`}
                  className="inline-flex items-center justify-center text-on-surface-variant hover:text-on-surface min-h-11 min-w-11"
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => eliminar(index)}
                aria-label={`Eliminar ${item.texto}`}
                className="inline-flex items-center justify-center text-on-surface-variant hover:text-error min-h-11 min-w-11"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={nuevoTexto}
          onChange={(e) => setNuevoTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              agregar();
            }
          }}
          placeholder={placeholder}
          aria-label={etiqueta}
          className="font-body-md text-body-md w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:outline-none"
        />
        {/* `min-h-11` (44px) ADEMÁS del `py-3`, no en lugar de él: el mínimo
            táctil de WCAG 2.5.8 es un PISO y el padding sigue decidiendo el
            aire alrededor del texto (mismo criterio que `SelectorCantidad`).
            Medido en navegador el 07/09/2026 a 390px con `elementFromPoint`
            —área EFECTIVA, no la caja declarada—: 93x43 sobre una caja de
            358x43, porque `text-label-md` son 14px con interlineado 1.2
            (16,8) y 12+12 de padding dan 40,8. */}
        <button
          type="button"
          onClick={agregar}
          className="font-label-md text-label-md min-h-11 shrink-0 rounded-lg border border-outline-variant px-4 py-3 uppercase tracking-widest text-on-surface-variant hover:border-outline"
        >
          Agregar
        </button>
      </div>
    </div>
  );
}

export default ListaDinamica;
