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
 */
function ListaDinamica({ items, onChange, placeholder }) {
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
            <div className="flex shrink-0 items-center gap-1">
              {index > 0 ? (
                <button
                  type="button"
                  onClick={() => mover(index, -1)}
                  aria-label={`Mover ${item.texto} hacia arriba`}
                  className="inline-flex items-center justify-center text-on-surface-variant hover:text-on-surface max-md:min-h-11 max-md:min-w-11"
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                </button>
              ) : null}
              {index < items.length - 1 ? (
                <button
                  type="button"
                  onClick={() => mover(index, 1)}
                  aria-label={`Mover ${item.texto} hacia abajo`}
                  className="inline-flex items-center justify-center text-on-surface-variant hover:text-on-surface max-md:min-h-11 max-md:min-w-11"
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => eliminar(index)}
                aria-label={`Eliminar ${item.texto}`}
                className="inline-flex items-center justify-center text-on-surface-variant hover:text-error max-md:min-h-11 max-md:min-w-11"
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
          className="font-body-md text-body-md w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:outline-none"
        />
        <button
          type="button"
          onClick={agregar}
          className="font-label-md text-label-md shrink-0 rounded-lg border border-outline-variant px-4 py-3 uppercase tracking-widest text-on-surface-variant hover:border-outline"
        >
          Agregar
        </button>
      </div>
    </div>
  );
}

export default ListaDinamica;
