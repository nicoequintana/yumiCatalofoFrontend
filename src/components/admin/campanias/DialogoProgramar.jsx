import { useState } from "react";
import useDialogo from "../../../hooks/useDialogo.js";
import VeloModal from "../../VeloModal.jsx";
import { claseCampo, claseEtiqueta } from "../clasesFormulario.js";
import { AREA_TACTIL_ICONO } from "../../../utils/areaTactil.js";

/**
 * Programar una promoción suelta, sin campaña.
 *
 * Es el §21 del pedido: desde el calendario se elige una fecha o un rango y se
 * le asigna una promoción, **sin obligar a crear una campaña**. Una campaña es
 * una experiencia comercial completa (Doodle, modal, CTA); bajar un precio tres
 * días no necesita nada de eso.
 *
 * La promoción **ya tiene que existir y tener sus productos**: acá solo se elige
 * CUÁNDO. Es la misma separación de siempre — Promociones define el qué, el
 * calendario define el cuándo — y por eso este diálogo no ofrece crear una
 * promoción ni tocar sus porcentajes.
 */

export default function DialogoProgramar({ promociones, diaInicial, guardando, onProgramar, onCerrar }) {
  const dialogoRef = useDialogo({ onCerrar });
  const disponibles = promociones.filter((p) => p.activa);

  const [promocionId, setPromocionId] = useState(disponibles[0]?.id ?? "");
  const [desde, setDesde] = useState(diaInicial ?? "");
  const [hasta, setHasta] = useState(diaInicial ?? "");

  const elegida = disponibles.find((p) => p.id === Number(promocionId));
  // Una promoción sin productos no le baja el precio a nadie. Programarla sería
  // una barra en el calendario que no hace nada, y el admin la daría por hecha.
  const sinProductos = elegida && elegida.cantidadProductos === 0;

  function enviar(evento) {
    evento.preventDefault();
    if (!promocionId || sinProductos) return;
    onProgramar({ promocionId: Number(promocionId), desde, hasta });
  }

  // Mismo contenedor que `DialogoCampania`: el envoltorio `min-h-full`
  // reemplaza al `my-auto` que dejaba el borde superior fuera de la pantalla
  // cuando el panel no entraba, y `lg:pb-24` lo despega de la bottom nav. El
  // portal y el bloqueo del scroll los pone `VeloModal`. Detalle allá.
  return (
    <VeloModal className="z-50 overflow-y-auto bg-black/40 p-6 lg:pb-24">
      <div className="flex min-h-full items-center justify-center">
        <div
          ref={dialogoRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-programar"
          tabIndex={-1}
          className="w-full max-w-lg rounded-xl bg-surface-container-lowest p-6 shadow-ambient outline-none"
        >
          <div className="mb-6 flex items-start justify-between gap-3">
            <h2 id="titulo-programar" className="font-headline-sm text-headline-sm text-primary">
              Programar una promoción
            </h2>
            <button
              type="button"
              onClick={onCerrar}
              aria-label="Cerrar"
              // El glifo NO crece: 20px al lado del título es lo que equilibra
              // el encabezado, y un disco de 44 lo desbalancea. El área se
              // extiende con el pseudo-elemento de `utils/areaTactil.js`, que
              // acá es seguro porque el único vecino es el `<h2>` —no es un
              // control, así que no hay áreas que se roben entre sí—.
              // `p-1` sobre un glifo de 20px da ~28×28, la mitad del mínimo de
              // 44×44 (WCAG 2.5.8): la caja declarada, porque la medición del
              // 07/09/2026 barrió la pantalla en reposo y nunca abrió este
              // diálogo.
              className={`${AREA_TACTIL_ICONO} rounded-lg p-1 text-on-surface-variant transition-colors hover:bg-surface-container`}
            >
              <span aria-hidden="true" className="material-symbols-outlined block text-[20px]">
                close
              </span>
            </button>
          </div>

          {disponibles.length === 0 ? (
            <p className="font-body-md text-body-md text-on-surface-variant">
              No hay promociones activas. Creá una desde <strong>Promociones</strong> y volvé acá para
              programarla.
            </p>
          ) : (
            <form onSubmit={enviar} className="flex flex-col gap-5">
              <fieldset disabled={guardando} className="contents">
                <div>
                  <label htmlFor="programar-promocion" className={claseEtiqueta}>
                    Promoción
                  </label>
                  <select
                    id="programar-promocion"
                    value={promocionId}
                    onChange={(e) => setPromocionId(e.target.value)}
                    className={claseCampo}
                  >
                    {disponibles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} ({p.cantidadProductos} producto
                        {p.cantidadProductos === 1 ? "" : "s"})
                      </option>
                    ))}
                  </select>
                  {sinProductos ? (
                    <p className="font-body-sm text-body-sm mt-2 rounded-lg bg-error-container px-3 py-2 text-on-error-container">
                      Esta promoción no tiene productos: programarla no le bajaría el precio a nadie.
                    </p>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="programar-desde" className={claseEtiqueta}>
                      Desde
                    </label>
                    <input
                      id="programar-desde"
                      type="date"
                      required
                      value={desde}
                      onChange={(e) => setDesde(e.target.value)}
                      className={claseCampo}
                    />
                  </div>
                  <div>
                    <label htmlFor="programar-hasta" className={claseEtiqueta}>
                      Hasta
                    </label>
                    <input
                      id="programar-hasta"
                      type="date"
                      required
                      value={hasta}
                      onChange={(e) => setHasta(e.target.value)}
                      className={claseCampo}
                    />
                  </div>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Los dos días valen completos. Para un solo día, poné la misma fecha en las dos.
                </p>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  {/* `min-h-11` ADEMÁS del `py-3`, nunca en lugar de él: el
                      mínimo táctil de 44px (WCAG 2.5.8) es un PISO. La caja
                      declarada da 43, los mismos que dio MEDIDA su gemela
                      «Programar promoción» de la pantalla de atrás. Crecer en
                      alto es gratis acá: en mobile los dos botones se apilan
                      (`flex-col-reverse`) y en `sm+` van en fila con `gap-3`,
                      así que ninguna de las dos direcciones pisa al otro. */}
                  <button
                    type="button"
                    onClick={onCerrar}
                    className="font-label-md text-label-md inline-flex min-h-11 items-center justify-center rounded-lg border border-outline-variant px-5 py-3 uppercase tracking-widest text-on-surface-variant transition-colors hover:bg-surface-container"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={sinProductos}
                    className="font-label-md text-label-md inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 py-3 uppercase tracking-widest text-on-primary transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    {guardando ? "Programando…" : "Programar"}
                  </button>
                </div>
              </fieldset>
            </form>
          )}
        </div>
      </div>
    </VeloModal>
  );
}
