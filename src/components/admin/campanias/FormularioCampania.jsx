import { useEffect, useState } from "react";

/**
 * Alta y edición de una campaña, organizado por secciones.
 *
 * La jerarquía de títulos copia `SeccionesFormulario.jsx` del editor de
 * producto: `<h3>` en versalitas por sección, campos apilados con `gap-8`, y
 * todo dentro de un `<fieldset disabled>` con `className="contents"` — la clase
 * es obligatoria, sin ella el `<fieldset>` rompe el layout flex de adentro.
 *
 * Las fechas van como `<input type="date">`, que trabaja nativamente en
 * `AAAA-MM-DD`: exactamente el formato que la API pide y devuelve. No hay
 * ninguna conversión de por medio, y por lo tanto ningún lugar donde la zona
 * horaria pueda correr un día.
 *
 * ⚠️ **Las opciones de los dos `<select>` LLEGAN POR PROP desde la API**
 * (`GET /campanias/opciones`), no se declaran acá. Estuvieron un rato copiadas
 * a mano y era la regla 1 del proyecto al revés, con el modo de falla más mudo
 * que hay: agregar un tipo en `lib/campanias.js` lo hacía aceptable para el
 * backend e invisible en el panel, sin ningún test rojo.
 */

const claseEtiqueta =
  "font-label-md text-label-md mb-2 block uppercase tracking-widest text-on-surface";
const claseCampo =
  "w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:outline-none";

function valoresIniciales(campania, diaElegido, opciones) {
  return {
    nombre: campania?.nombre ?? "",
    descripcion: campania?.descripcion ?? "",
    // El default sale de la PRIMERA opción que mandó el backend, no de una
    // constante local: si algún día el primer tipo deja de ser ESTACIONAL, el
    // formulario no se queda pidiendo un valor que ya no existe.
    tipo: campania?.tipo ?? opciones?.tipos?.[0]?.valor ?? "",
    estado: campania?.estado ?? "BORRADOR",
    desde: campania?.desde ?? diaElegido ?? "",
    hasta: campania?.hasta ?? diaElegido ?? "",
    prioridad: String(campania?.prioridad ?? 0),
    doodleEnCatalogo: campania?.doodleEnCatalogo ?? true,
    doodleEnAdmin: campania?.doodleEnAdmin ?? false,
  };
}

export default function FormularioCampania({
  campania,
  diaElegido,
  opciones,
  guardando,
  onGuardar,
  onCancelar,
}) {
  const [valores, setValores] = useState(() => valoresIniciales(campania, diaElegido, opciones));

  // Al cambiar de campaña seleccionada (o al abrir el alta desde otro día) el
  // formulario tiene que reflejar lo nuevo. Sin esto, editar una campaña
  // distinta mostraría los valores de la anterior.
  useEffect(() => {
    setValores(valoresIniciales(campania, diaElegido, opciones));
  }, [campania, diaElegido, opciones]);

  function cambiar(campo, valor) {
    setValores((actuales) => ({ ...actuales, [campo]: valor }));
  }

  function enviar(evento) {
    evento.preventDefault();
    onGuardar({
      nombre: valores.nombre.trim(),
      descripcion: valores.descripcion.trim() || null,
      tipo: valores.tipo,
      estado: valores.estado,
      desde: valores.desde,
      hasta: valores.hasta,
      prioridad: Number(valores.prioridad) || 0,
      doodleEnCatalogo: valores.doodleEnCatalogo,
      doodleEnAdmin: valores.doodleEnAdmin,
    });
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-8">
      <fieldset disabled={guardando} className="contents">
        <div>
          <h3 className="font-label-md text-label-md mb-3 block uppercase tracking-widest text-on-surface-variant">
            Información
          </h3>

          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="campania-nombre" className={claseEtiqueta}>
                Nombre
              </label>
              <input
                id="campania-nombre"
                type="text"
                required
                maxLength={120}
                value={valores.nombre}
                onChange={(e) => cambiar("nombre", e.target.value)}
                className={claseCampo}
                placeholder="Primavera 2026"
              />
            </div>

            <div>
              <label htmlFor="campania-descripcion" className={claseEtiqueta}>
                Nota interna <span className="normal-case tracking-normal">(opcional)</span>
              </label>
              <textarea
                id="campania-descripcion"
                rows={2}
                maxLength={1000}
                value={valores.descripcion}
                onChange={(e) => cambiar("descripcion", e.target.value)}
                className={claseCampo}
                placeholder="Para qué es esta campaña. No sale al catálogo."
              />
            </div>

            <div>
              <label htmlFor="campania-tipo" className={claseEtiqueta}>
                Tipo
              </label>
              <select
                id="campania-tipo"
                value={valores.tipo}
                onChange={(e) => cambiar("tipo", e.target.value)}
                className={claseCampo}
              >
                {(opciones?.tipos ?? []).map((tipo) => (
                  <option key={tipo.valor} value={tipo.valor}>
                    {tipo.etiqueta}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-label-md text-label-md mb-3 block uppercase tracking-widest text-on-surface-variant">
            Programación
          </h3>

          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="campania-desde" className={claseEtiqueta}>
                  Desde
                </label>
                <input
                  id="campania-desde"
                  type="date"
                  required
                  value={valores.desde}
                  onChange={(e) => cambiar("desde", e.target.value)}
                  className={claseCampo}
                />
              </div>
              <div>
                <label htmlFor="campania-hasta" className={claseEtiqueta}>
                  Hasta
                </label>
                <input
                  id="campania-hasta"
                  type="date"
                  required
                  value={valores.hasta}
                  onChange={(e) => cambiar("hasta", e.target.value)}
                  className={claseCampo}
                />
              </div>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              La campaña vale los dos días completos. Para una fecha puntual, poné la misma en las
              dos.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="campania-estado" className={claseEtiqueta}>
                  Estado
                </label>
                <select
                  id="campania-estado"
                  value={valores.estado}
                  onChange={(e) => cambiar("estado", e.target.value)}
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
                  onChange={(e) => cambiar("prioridad", e.target.value)}
                  className={claseCampo}
                />
              </div>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Si dos campañas activas tienen Doodle, se muestra el de mayor prioridad.
            </p>
          </div>
        </div>

        <div>
          <h3 className="font-label-md text-label-md mb-3 block uppercase tracking-widest text-on-surface-variant">
            Dónde se muestra el Doodle
          </h3>

          {/* Son DOS interruptores y no uno porque el catálogo y el panel son
              públicos distintos: se puede querer marca festiva de cara al
              cliente sin cambiarle el logo a quien está trabajando adentro. */}
          <div className="flex flex-col gap-3">
            {[
              { campo: "doodleEnCatalogo", etiqueta: "En el catálogo público" },
              { campo: "doodleEnAdmin", etiqueta: "En el panel de administración" },
            ].map(({ campo, etiqueta }) => (
              <button
                key={campo}
                type="button"
                role="switch"
                aria-checked={valores[campo]}
                onClick={() => cambiar(campo, !valores[campo])}
                className="flex items-center justify-between gap-4 rounded-lg border border-outline-variant px-4 py-3 text-left transition-colors hover:bg-surface-container"
              >
                <span className="font-body-md text-body-md text-on-surface">{etiqueta}</span>
                <span
                  aria-hidden="true"
                  className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${
                    valores[campo] ? "bg-primary" : "bg-outline-variant"
                  }`}
                >
                  <span
                    className={`h-5 w-5 rounded-full bg-surface-container-lowest transition-transform ${
                      valores[campo] ? "translate-x-5" : ""
                    }`}
                  />
                </span>
              </button>
            ))}
          </div>
          <p className="font-body-sm text-body-sm mt-2 text-on-surface-variant">
            Solo tiene efecto si la campaña está activa y tiene un Doodle cargado.
          </p>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancelar}
            className="font-label-md text-label-md rounded-lg border border-outline-variant px-5 py-3 uppercase tracking-widest text-on-surface-variant transition-colors hover:bg-surface-container"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="font-label-md text-label-md rounded-lg bg-primary px-5 py-3 uppercase tracking-widest text-on-primary transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
