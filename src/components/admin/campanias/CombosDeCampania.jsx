/**
 * Qué combos programa la campaña (spec §8.4). Solo los de vigencia `CAMPANIA`
 * dependen de la campaña para verse; asociar uno `SIEMPRE` no cambia nada, y
 * se avisa en la fila en vez de esconderlo. Desasociar NO borra el combo.
 *
 * Cada checkbox persiste en el acto (`PUT /campanias/:id/combos`), igual que
 * `PromocionesDeCampania`: vive FUERA del `<form>` de la campaña.
 */
export default function CombosDeCampania({ combos, asociados, guardando, onGuardar, errorCarga = null }) {
  const idsAsociados = new Set((asociados ?? []).map((combo) => combo.id));

  // "Falló la carga" NO es "no hay combos": sin esta rama un backend caído se
  // leía como una lista vacía y mandaba al admin a crear un combo que ya existe.
  if (errorCarga) {
    return (
      <p
        role="alert"
        className="font-body-md text-body-md rounded-lg bg-error-container px-4 py-3 text-on-error-container"
      >
        No pudimos cargar los combos. Recargá la pantalla para intentar de nuevo.
      </p>
    );
  }

  if (combos.length === 0) {
    return (
      <p className="font-body-sm text-body-sm text-on-surface-variant">
        Todavía no hay combos. Creá uno desde <strong>Combos</strong> y volvé acá para programarlo.
      </p>
    );
  }

  return (
    <div className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-xl border border-outline-variant p-2">
      {combos.map((combo) => {
        const asociado = idsAsociados.has(combo.id);
        return (
          <label
            key={combo.id}
            className="font-body-md text-body-md flex min-h-11 items-center gap-3 rounded px-2 py-2 text-on-surface transition-colors hover:bg-surface-container"
          >
            <input
              type="checkbox"
              checked={asociado}
              disabled={guardando}
              onChange={() => {
                const actuales = [...idsAsociados];
                onGuardar(asociado ? actuales.filter((id) => id !== combo.id) : [...actuales, combo.id]);
              }}
              className="h-4 w-4 accent-[rgb(var(--color-primary))]"
            />
            <span className="truncate">{combo.nombre}</span>
            {combo.vigencia === "SIEMPRE" ? (
              <span className="font-body-sm text-body-sm ml-auto shrink-0 text-on-surface-variant">
                Siempre vigente: la campaña no cambia cuándo se ve
              </span>
            ) : null}
          </label>
        );
      })}
    </div>
  );
}
