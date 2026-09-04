import { useRef } from "react";
import Interruptor from "./Interruptor.jsx";
import { claseCampo, claseEtiqueta } from "../clasesFormulario.js";

/**
 * Los datos de la campaña: qué es, cuándo vale y con qué marca.
 *
 * LAS AYUDAS VAN DENTRO DE LA ETIQUETA (`Hasta · inclusive`), no en un párrafo
 * debajo de cada campo. Un formulario con una aclaración bajo cada input mide
 * tres pantallas y se lee como un instructivo — fue exactamente lo que se
 * rechazó del primer diseño. La regla que necesita más de cinco palabras va en
 * la única nota de la sección, no repartida campo por campo.
 *
 * Las fechas son `<input type="date">`, que trabaja nativamente en `AAAA-MM-DD`:
 * el mismo formato que la API pide y devuelve. No hay ninguna conversión de por
 * medio, y por lo tanto ningún lugar donde la zona horaria pueda correr un día.
 *
 * ⚠️ **Las opciones de los `<select>` LLEGAN POR PROP desde la API**
 * (`GET /campanias/opciones`), no se declaran acá: un tipo nuevo en
 * `lib/campanias.js` sería aceptable para el backend e invisible en el panel,
 * sin ningún test rojo.
 */
export default function SeccionCampania({
  valores,
  editar,
  opciones,
  esEdicion,
  campania,
  guardando,
  onSubirDoodle,
  onQuitarDoodle,
}) {
  const inputDoodle = useRef(null);

  function elegirArchivo(evento) {
    const archivo = evento.target.files?.[0];
    // Se limpia el input SIEMPRE, así reintentar con el mismo archivo vuelve a
    // disparar el change.
    evento.target.value = "";
    onSubirDoodle(archivo);
  }

  return (
    <section
      aria-labelledby="titulo-seccion-campania"
      className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6"
    >
      <h2
        id="titulo-seccion-campania"
        className="font-headline-sm text-headline-sm mb-5 text-primary"
      >
        Campaña
      </h2>

      <div className="flex flex-col gap-5">
        {/* Una sola fila de cuatro. El nombre pesa el doble porque es el único
            campo de texto libre; el resto son un select o un número corto. */}
        <div className="grid gap-4 md:grid-cols-5">
          <div className="md:col-span-2">
            <label htmlFor="campania-nombre" className={claseEtiqueta}>
              Nombre
            </label>
            <input
              id="campania-nombre"
              type="text"
              required
              maxLength={120}
              value={valores.nombre}
              onChange={(e) => editar("nombre", e.target.value)}
              className={claseCampo}
              placeholder="Primavera 2026"
            />
          </div>
          <div>
            <label htmlFor="campania-tipo" className={claseEtiqueta}>
              Tipo
            </label>
            <select
              id="campania-tipo"
              value={valores.tipo}
              onChange={(e) => editar("tipo", e.target.value)}
              className={claseCampo}
            >
              {(opciones?.tipos ?? []).map((tipo) => (
                <option key={tipo.valor} value={tipo.valor}>
                  {tipo.etiqueta}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="campania-estado" className={claseEtiqueta}>
              Estado
            </label>
            <select
              id="campania-estado"
              value={valores.estado}
              onChange={(e) => editar("estado", e.target.value)}
              className={claseCampo}
            >
              {(opciones?.estados ?? []).map((estado) => (
                <option key={estado.valor} value={estado.valor}>
                  {estado.etiqueta}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="campania-prioridad" className={claseEtiqueta}>
              Prioridad
            </label>
            <input
              id="campania-prioridad"
              type="number"
              step={1}
              value={valores.prioridad}
              onChange={(e) => editar("prioridad", e.target.value)}
              className={claseCampo}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          <div>
            <label htmlFor="campania-desde" className={claseEtiqueta}>
              Desde
            </label>
            <input
              id="campania-desde"
              type="date"
              required
              value={valores.desde}
              onChange={(e) => editar("desde", e.target.value)}
              className={claseCampo}
            />
          </div>
          <div>
            <label htmlFor="campania-hasta" className={claseEtiqueta}>
              Hasta <span className="normal-case tracking-normal">· inclusive</span>
            </label>
            <input
              id="campania-hasta"
              type="date"
              required
              value={valores.hasta}
              onChange={(e) => editar("hasta", e.target.value)}
              className={claseCampo}
            />
          </div>
        </div>

        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Con dos campañas activas a la vez, el Doodle que se muestra es el de mayor prioridad.
        </p>

        {/* ⚠️ El Doodle solo existe con id: sube a `PUT /:id/doodle`, y no se
            puede subir una imagen a algo que todavía no fue creado. Mismo patrón
            que los bloques de IA en `SolapaImagenes`. */}
        {esEdicion ? (
          <div className="rounded-lg border border-outline-variant p-4">
            <h3 className="font-label-md text-label-md mb-3 uppercase tracking-widest text-on-surface-variant">
              Doodle
            </h3>

            <div className="flex flex-wrap items-center gap-4">
              {campania?.doodleUrl ? (
                <img
                  src={campania.doodleUrl}
                  alt={`Doodle de ${campania.nombre}`}
                  className="h-16 w-auto rounded-lg bg-surface-container p-2"
                />
              ) : (
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Sin Doodle: el logo queda como siempre.
                </p>
              )}

              <input
                ref={inputDoodle}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={elegirArchivo}
                className="sr-only"
              />
              <button
                type="button"
                disabled={guardando}
                onClick={() => inputDoodle.current?.click()}
                className={claseAccionDoodle}
              >
                {campania?.doodleUrl ? "Reemplazar" : "Subir Doodle"}
              </button>
              {campania?.doodleUrl ? (
                <button
                  type="button"
                  disabled={guardando}
                  onClick={onQuitarDoodle}
                  className={claseAccionDoodle}
                >
                  Quitar
                </button>
              ) : null}
            </div>

            {/* Son DOS interruptores y no uno porque el catálogo y el panel son
                públicos distintos: se puede querer marca festiva de cara al
                cliente sin cambiarle el logo a quien está trabajando adentro. */}
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Interruptor
                etiqueta="En el catálogo"
                activo={valores.doodleEnCatalogo}
                onCambiar={(valor) => editar("doodleEnCatalogo", valor)}
              />
              <Interruptor
                etiqueta="En el panel"
                activo={valores.doodleEnAdmin}
                onCambiar={(valor) => editar("doodleEnAdmin", valor)}
              />
            </div>
          </div>
        ) : null}

        <div>
          <label htmlFor="campania-descripcion" className={claseEtiqueta}>
            Nota interna <span className="normal-case tracking-normal">· no sale al catálogo</span>
          </label>
          <textarea
            id="campania-descripcion"
            rows={2}
            maxLength={1000}
            value={valores.descripcion}
            onChange={(e) => editar("descripcion", e.target.value)}
            className={claseCampo}
            placeholder="Para qué es esta campaña."
          />
        </div>
      </div>
    </section>
  );
}

const claseAccionDoodle =
  "font-label-sm text-label-sm rounded-lg border border-outline-variant px-4 py-2 uppercase tracking-widest text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-60";
