import { useEffect, useRef, useState } from "react";
import BotonVolver from "../../components/BotonVolver.jsx";
import EstadoVacio from "../../components/EstadoVacio.jsx";
import Spinner from "../../components/Spinner.jsx";
import SoloEscritorio from "../../components/admin/SoloEscritorio.jsx";
import CalendarioComercial from "../../components/admin/campanias/CalendarioComercial.jsx";
import FormularioCampania from "../../components/admin/campanias/FormularioCampania.jsx";
import {
  claveDeDia,
  etiquetaDeMes,
  semanasDelMes,
} from "../../components/admin/campanias/calendario.js";
import { claseCelda, claseEncabezado } from "../../components/admin/clasesTabla.js";
import { estiloDeCampania } from "../../constants/campanias.js";
import { formatFecha } from "../../utils/formato.js";
import useDialogo from "../../hooks/useDialogo.js";
import {
  actualizarCampania,
  cambiarEstadoCampania,
  crearCampania,
  duplicarCampania,
  eliminarCampania,
  getCampanias,
  getOpcionesCampania,
  quitarDoodle,
  subirDoodle,
} from "../../api/campanias.js";
import useContextoComercial from "../../hooks/useContextoComercial.js";

/**
 * Centro de Campañas — el calendario comercial del panel.
 *
 * SOLO ESCRITORIO, y por eso va envuelto en `SoloEscritorio`: la grilla es de
 * siete columnas con barras que atraviesan la semana, y a 412 px no hay forma
 * honesta de mostrarla. El item tampoco aparece en el drawer de < lg.
 *
 * LAYOUT: el calendario ocupa el ancho completo arriba, y abajo va el CRUD de
 * las campañas del mes. Empezó como calendario + panel lateral de 22 rem, y el
 * panel apretaba un formulario que tiene cuatro secciones. Las dos mitades
 * hablan SIEMPRE del mismo conjunto: la tabla usa la misma ventana de
 * solapamiento que la consulta del calendario.
 *
 * Promociones es un módulo APARTE (`/catalogo/admin/promociones`) y no una
 * sección de esta pantalla: su listado comercial es una tabla de análisis
 * entera. La separación que sí importa no es de pantallas sino de ACCIONES —
 * Promociones define QUÉ descuento tiene cada producto, el calendario programa
 * CUÁNDO se aplica.
 */

/** El mes al que pertenece una clave `AAAA-MM-DD`. */
function mesDeClave(clave) {
  const [ano, mes] = clave.split("-").map(Number);
  return { ano, mes: mes - 1 };
}

/** Los bordes del mes visible, para acotar la consulta. */
function ventanaDelMes({ ano, mes }) {
  const semanas = semanasDelMes(ano, mes);
  const ultima = semanas[semanas.length - 1];
  return { desde: claveDeDia(semanas[0][0]), hasta: claveDeDia(ultima[6]) };
}

export default function AdminCampanias() {
  const { claveDia, resuelto } = useContextoComercial();

  // Arranca en `null` y NO en el mes del reloj del navegador. `claveDia` la
  // manda el backend, que es la única definición de "día" del sistema: sembrar
  // con `new Date().getUTCMonth()` reintroducía en el frontend la definición por
  // reloj UTC que el proyecto borró a propósito, y entre las 21:00 y las 23:59
  // del último día del mes abría el calendario en el mes SIGUIENTE.
  const [mesVisible, setMesVisible] = useState(null);
  const [opciones, setOpciones] = useState(null);
  const [campanias, setCampanias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [seleccionada, setSeleccionada] = useState(null);
  const [diaElegido, setDiaElegido] = useState(null);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);
  const inputDoodle = useRef(null);

  // El mes del calendario lo fija la clave del día que manda el BACKEND, no el
  // reloj del navegador. Hasta que llegue, la pantalla muestra el spinner.
  useEffect(() => {
    if (claveDia) setMesVisible((actual) => actual ?? mesDeClave(claveDia));
  }, [claveDia]);

  // El contexto terminó de intentar y no trajo la fecha: sin ella no hay mes
  // que abrir, y esperar para siempre dejaría el spinner girando. Se dice qué
  // pasó en vez de fingir que todavía está cargando.
  const sinFecha = resuelto && !claveDia;
  useEffect(() => {
    if (sinFecha) setCargando(false);
  }, [sinFecha]);

  useEffect(() => {
    let activo = true;
    getOpcionesCampania()
      .then((datos) => {
        if (activo) setOpciones(datos);
      })
      .catch((err) => {
        if (activo) setError(err.message);
      });
    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    if (!mesVisible) return undefined;
    let activo = true;

    setCargando(true);
    getCampanias(ventanaDelMes(mesVisible))
      .then((datos) => {
        if (!activo) return;
        setCampanias(datos);
        // Un fetch exitoso limpia el error anterior: si no, un problema de red
        // ya resuelto seguiría en pantalla sobre datos frescos.
        setError(null);
      })
      // El catch es obligatorio: sin él, un backend caído deja la promesa
      // rechazada sin manejar y el spinner girando para siempre.
      .catch((err) => {
        if (activo) setError(err.message);
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [mesVisible]);

  function cerrarPanel() {
    setSeleccionada(null);
    setDiaElegido(null);
    setEditando(false);
    setConfirmandoBorrado(false);
  }

  function abrirDetalle(campania) {
    setSeleccionada(campania);
    setDiaElegido(null);
    setEditando(false);
    setConfirmandoBorrado(false);
  }

  function abrirEdicion(campania) {
    setSeleccionada(campania);
    setDiaElegido(null);
    setEditando(true);
    setConfirmandoBorrado(false);
  }

  function abrirAlta(clave) {
    setSeleccionada(null);
    setDiaElegido(clave);
    setEditando(true);
  }

  /**
   * Ejecuta una mutación y refresca el listado.
   *
   * **El refresco tiene su propio catch, con un mensaje DISTINTO**, igual que
   * en `AdminAnuncios` y `AdminCategorias`. El motivo es concreto: si la
   * escritura anduvo y el GET posterior falla, dejar caer el error en el catch
   * de arriba muestra el mensaje crudo de red — indistinguible de "no se
   * guardó"— y el admin repite una operación que ya se hizo. `Campania.nombre`
   * no es único, así que el reintento crea una segunda fila real.
   */
  async function conGuardado(operacion) {
    setGuardando(true);
    setError(null);
    try {
      await operacion();
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setGuardando(false);
    }

    try {
      const datos = await getCampanias(ventanaDelMes(mesVisible));
      setCampanias(datos);
    } catch {
      setError(
        "La operación se guardó, pero no se pudo actualizar el calendario. Recargá la página para ver el estado actual.",
      );
    }
    return true;
  }

  async function guardar(datos) {
    const ok = await conGuardado(() =>
      seleccionada ? actualizarCampania(seleccionada.id, datos) : crearCampania(datos),
    );
    if (ok) cerrarPanel();
  }

  async function alternarEstado(campania) {
    const siguiente = campania.estado === "HABILITADA" ? "DESHABILITADA" : "HABILITADA";
    await conGuardado(async () => {
      const actualizada = await cambiarEstadoCampania(campania.id, siguiente);
      // Solo se refleja en el diálogo si es la campaña que está abierta: el
      // botón de la tabla puede apagar una fila distinta de la seleccionada.
      setSeleccionada((actual) => (actual?.id === campania.id ? actualizada : actual));
    });
  }

  async function duplicar(campania) {
    const ok = await conGuardado(async () => {
      const copia = await duplicarCampania(campania.id);
      setSeleccionada(copia);
    });
    if (ok) setEditando(true);
  }

  async function eliminar(campania) {
    const ok = await conGuardado(() => eliminarCampania(campania.id));
    if (ok) cerrarPanel();
  }

  async function cambiarDoodle(evento) {
    const archivo = evento.target.files?.[0];
    // Se limpia el input SIEMPRE, así reintentar con el mismo archivo dispara
    // el change de nuevo.
    evento.target.value = "";
    if (!archivo || !seleccionada) return;

    await conGuardado(async () => {
      const actualizada = await subirDoodle(seleccionada.id, archivo);
      setSeleccionada(actualizada);
    });
  }

  async function borrarDoodle() {
    await conGuardado(async () => {
      const actualizada = await quitarDoodle(seleccionada.id);
      setSeleccionada(actualizada);
    });
  }

  const panelAbierto = seleccionada !== null || diaElegido !== null;
  const mostrandoFormulario = editando || (diaElegido !== null && seleccionada === null);

  return (
    <SoloEscritorio titulo="Campañas">
      <main className="w-full px-4 py-6 md:px-8 md:py-8">
        <div className="mb-6">
          <BotonVolver fallback="/catalogo/admin/productos" />
        </div>

        <div className="mb-10">
          <span className="font-label-sm text-label-sm mb-2 block uppercase tracking-[0.2em] text-secondary">
            Panel de administración
          </span>
          <h1 className="font-headline-lg text-headline-lg text-primary">Centro de Campañas</h1>
          <p className="font-body-md text-body-md mt-2 max-w-2xl text-on-surface-variant">
            Cuándo está activa cada experiencia comercial. Tocá un día para crear una campaña, o una
            barra para abrirla.
          </p>
        </div>

        {error ? (
          <p className="font-body-md text-body-md mb-6 rounded-lg bg-error-container px-4 py-3 text-on-error-container">
            {error}
          </p>
        ) : null}

        {/* CALENDARIO — a lo ancho. Es la vista principal del módulo. */}
        {sinFecha ? (
          <EstadoVacio
            icono="cloud_off"
            titulo="No se pudo abrir el calendario"
            mensaje="Revisá tu conexión e intentá de nuevo."
          />
        ) : cargando || !mesVisible ? (
          <div className="flex items-center justify-center gap-3 py-24">
            <Spinner className="h-8 w-8 text-on-surface-variant" />
            <span className="font-body-md text-body-md text-on-surface-variant">
              Cargando campañas…
            </span>
          </div>
        ) : (
          <CalendarioComercial
            mesVisible={mesVisible}
            onCambiarMes={(mes) => {
              // Sin `claveDia` no hay a qué "hoy" volver: se queda donde está en
              // vez de inventar uno con el reloj del navegador.
              setMesVisible(mes ?? (claveDia ? mesDeClave(claveDia) : mesVisible));
              cerrarPanel();
            }}
            campanias={campanias}
            claveHoy={claveDia}
            onSeleccionarDia={abrirAlta}
            onSeleccionarCampania={abrirDetalle}
          />
        )}

        {/* CRUD — las campañas del mes visible, con la MISMA ventana de
            solapamiento que el calendario: lo de arriba y lo de abajo hablan
            siempre del mismo conjunto. */}
        {!sinFecha && mesVisible ? (
          <section aria-labelledby="titulo-crud-campanias" className="mt-10">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h2
                  id="titulo-crud-campanias"
                  className="font-headline-sm text-headline-sm text-primary"
                >
                  Campañas de {etiquetaDeMes(mesVisible)}
                </h2>
                <p className="font-body-md text-body-md mt-1 text-on-surface-variant">
                  Incluye las que arrancan antes o terminan después, mientras ocupen algún día del
                  mes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => abrirAlta(claveDia)}
                className="font-label-md text-label-md shrink-0 rounded-lg bg-primary px-5 py-3 uppercase tracking-widest text-on-primary transition-opacity hover:opacity-90"
              >
                Nueva campaña
              </button>
            </div>

            {cargando ? null : campanias.length === 0 ? (
              <EstadoVacio
                icono="event_available"
                titulo="Todavía no hay campañas este mes"
                mensaje="Tocá cualquier día del calendario, o el botón de arriba, para crear la primera."
              />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
                {/* Sin `claseTablaApilada`: esta pantalla nunca se renderiza por
                    debajo de `lg`, así que el CSS de apilado —que arranca en
                    `md`— no puede dispararse nunca. Ver `clasesTabla.js`. */}
                <table role="table" className="w-full">
                  <thead role="rowgroup">
                    <tr
                      role="row"
                      className="border-b border-outline-variant bg-surface-container-low text-left"
                    >
                      <th role="columnheader" className={claseEncabezado}>
                        Campaña
                      </th>
                      <th role="columnheader" className={claseEncabezado}>
                        Período
                      </th>
                      <th role="columnheader" className={claseEncabezado}>
                        Estado
                      </th>
                      <th role="columnheader" className={`${claseEncabezado} text-right`}>
                        Prioridad
                      </th>
                      <th role="columnheader" className={claseEncabezado}>
                        Experiencia
                      </th>
                      <th role="columnheader" className={`${claseEncabezado} text-right`}>
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody role="rowgroup">
                    {campanias.map((campania) => (
                      <FilaCampania
                        key={campania.id}
                        campania={campania}
                        guardando={guardando}
                        onAbrir={() => abrirDetalle(campania)}
                        onEditar={() => abrirEdicion(campania)}
                        onAlternarEstado={() => alternarEstado(campania)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : null}

        {/* El detalle y el formulario viven en un DIÁLOGO y no en un panel
            lateral: el formulario tiene cuatro secciones y en 22 rem quedaba
            apretado contra el borde. */}
        {panelAbierto ? (
          <DialogoCampania
            titulo={
              mostrandoFormulario
                ? seleccionada
                  ? "Editar campaña"
                  : "Nueva campaña"
                : seleccionada.nombre
            }
            onCerrar={cerrarPanel}
          >
            {mostrandoFormulario ? (
              <FormularioCampania
                campania={seleccionada}
                diaElegido={diaElegido}
                opciones={opciones}
                guardando={guardando}
                onGuardar={guardar}
                onCancelar={() => (seleccionada ? setEditando(false) : cerrarPanel())}
              />
            ) : (
              <DetalleCampania
                campania={seleccionada}
                guardando={guardando}
                confirmandoBorrado={confirmandoBorrado}
                inputDoodle={inputDoodle}
                onEditar={() => setEditando(true)}
                onAlternarEstado={() => alternarEstado(seleccionada)}
                onDuplicar={() => duplicar(seleccionada)}
                onPedirBorrado={() => setConfirmandoBorrado(true)}
                onCancelarBorrado={() => setConfirmandoBorrado(false)}
                onEliminar={() => eliminar(seleccionada)}
                onSubirDoodle={cambiarDoodle}
                onQuitarDoodle={borrarDoodle}
              />
            )}
          </DialogoCampania>
        ) : null}
      </main>
    </SoloEscritorio>
  );
}

/** Una fila del CRUD. Aparte para que el `map` de la tabla se lea de un vistazo. */
function FilaCampania({ campania, guardando, onAbrir, onEditar, onAlternarEstado }) {
  const estilo = estiloDeCampania(campania);
  const encendida = campania.estado === "HABILITADA";
  const sinExperiencia = !campania.doodleUrl && !campania.modalActivo;

  return (
    <tr
      role="row"
      className="border-b border-outline-variant transition-colors last:border-b-0 hover:bg-surface-container"
    >
      <td role="cell" className={claseCelda}>
        <button type="button" onClick={onAbrir} className="text-left text-primary hover:underline">
          {campania.nombre}
        </button>
        <span className="font-body-sm text-body-sm block text-on-surface-variant">
          {campania.tipo}
        </span>
      </td>
      <td role="cell" className={`${claseCelda} whitespace-nowrap text-on-surface-variant`}>
        {formatFecha(campania.desde)} → {formatFecha(campania.hasta)}
      </td>
      <td role="cell" className={claseCelda}>
        {/* El estado nunca se comunica solo con color: ícono + texto siempre. */}
        <span
          className={`font-label-sm text-label-sm inline-flex items-center gap-1 rounded-full px-3 py-1 ${estilo.barra}`}
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
            {estilo.icono}
          </span>
          {campania.etiquetaEstado} · {campania.etiquetaTemporal}
        </span>
      </td>
      <td role="cell" className={`${claseCelda} text-right text-on-surface-variant`}>
        {campania.prioridad}
      </td>
      <td role="cell" className={`${claseCelda} text-on-surface-variant`}>
        <span className="flex gap-3">
          {campania.doodleUrl ? (
            <span className="flex items-center gap-1">
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                palette
              </span>
              Doodle
            </span>
          ) : null}
          {campania.modalActivo ? (
            <span className="flex items-center gap-1">
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                campaign
              </span>
              Modal
            </span>
          ) : null}
          {sinExperiencia ? "—" : null}
        </span>
      </td>
      <td role="cell" className={`${claseCelda} text-right`}>
        <span className="flex justify-end gap-2">
          <button
            type="button"
            disabled={guardando}
            onClick={onAlternarEstado}
            className={claseAccionFila}
          >
            {encendida ? "Apagar" : "Encender"}
          </button>
          <button type="button" disabled={guardando} onClick={onEditar} className={claseAccionFila}>
            Editar
          </button>
        </span>
      </td>
    </tr>
  );
}

/**
 * El diálogo que envuelve al detalle y al formulario.
 *
 * `useDialogo` resuelve las cuatro piezas de un modal accesible (foco inicial,
 * trampa de foco, Escape, restauración) y `tabIndex={-1}` + `role="dialog"` +
 * `aria-modal` son parte de su contrato, no decoración.
 */
function DialogoCampania({ titulo, onCerrar, children }) {
  const dialogoRef = useDialogo({ onCerrar });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-6">
      <div
        ref={dialogoRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-dialogo-campania"
        tabIndex={-1}
        className="my-auto w-full max-w-2xl rounded-xl bg-surface-container-lowest p-6 shadow-ambient outline-none"
      >
        <div className="mb-6 flex items-start justify-between gap-3">
          <h2
            id="titulo-dialogo-campania"
            className="font-headline-sm text-headline-sm text-primary"
          >
            {titulo}
          </h2>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="rounded-lg p-1 text-on-surface-variant transition-colors hover:bg-surface-container"
          >
            <span aria-hidden="true" className="material-symbols-outlined block text-[20px]">
              close
            </span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const claseAccion =
  "font-label-md text-label-md w-full rounded-lg border border-outline-variant px-4 py-3 uppercase tracking-widest text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:opacity-60";

const claseAccionFila =
  "font-label-sm text-label-sm rounded-lg border border-outline-variant px-3 py-2 uppercase tracking-widest text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-60";

function DetalleCampania({
  campania,
  guardando,
  confirmandoBorrado,
  inputDoodle,
  onEditar,
  onAlternarEstado,
  onDuplicar,
  onPedirBorrado,
  onCancelarBorrado,
  onEliminar,
  onSubirDoodle,
  onQuitarDoodle,
}) {
  const estilo = estiloDeCampania(campania);
  const encendida = campania.estado === "HABILITADA";

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="flex flex-col gap-5">
        {/* El estado nunca se comunica solo con color: ícono + texto siempre. */}
        <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${estilo.barra}`}>
          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
            {estilo.icono}
          </span>
          <span className="font-label-md text-label-md">
            {campania.etiquetaEstado} · {campania.etiquetaTemporal}
          </span>
        </div>

        <dl className="font-body-md text-body-md flex flex-col gap-2 text-on-surface-variant">
          <div className="flex justify-between gap-3">
            <dt>Período</dt>
            <dd className="text-on-surface">
              {formatFecha(campania.desde)} → {formatFecha(campania.hasta)}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Tipo</dt>
            <dd className="text-on-surface">{campania.tipo}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Prioridad</dt>
            <dd className="text-on-surface">{campania.prioridad}</dd>
          </div>
          {campania.modalActivo ? (
            <div className="flex justify-between gap-3">
              <dt>Modal</dt>
              <dd className="text-on-surface">{campania.modalTitulo}</dd>
            </div>
          ) : null}
          {campania.descripcion ? (
            <div className="mt-1">
              <dt className="font-label-sm text-label-sm uppercase tracking-widest">Nota interna</dt>
              <dd className="mt-1 text-on-surface">{campania.descripcion}</dd>
            </div>
          ) : null}
        </dl>

        <div>
          <h3 className="font-label-md text-label-md mb-3 block uppercase tracking-widest text-on-surface-variant">
            Doodle
          </h3>
          {campania.doodleUrl ? (
            <img
              src={campania.doodleUrl}
              alt={`Doodle de ${campania.nombre}`}
              className="mb-3 h-16 w-auto rounded-lg bg-surface-container p-2"
            />
          ) : (
            <p className="font-body-sm text-body-sm mb-3 text-on-surface-variant">
              Sin Doodle: el logo queda como siempre.
            </p>
          )}

          <input
            ref={inputDoodle}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onSubirDoodle}
            className="sr-only"
          />
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={guardando}
              onClick={() => inputDoodle.current?.click()}
              className={claseAccion}
            >
              {campania.doodleUrl ? "Reemplazar Doodle" : "Subir Doodle"}
            </button>
            {campania.doodleUrl ? (
              <button
                type="button"
                disabled={guardando}
                onClick={onQuitarDoodle}
                className={claseAccion}
              >
                Quitar Doodle
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={guardando}
          onClick={onAlternarEstado}
          className={`font-label-md text-label-md w-full rounded-lg px-4 py-3 uppercase tracking-widest transition-opacity hover:opacity-90 disabled:opacity-60 ${
            encendida ? "bg-surface-container text-on-surface" : "bg-primary text-on-primary"
          }`}
        >
          {encendida ? "Apagar campaña" : "Encender campaña"}
        </button>
        <button type="button" disabled={guardando} onClick={onEditar} className={claseAccion}>
          Editar
        </button>
        <button type="button" disabled={guardando} onClick={onDuplicar} className={claseAccion}>
          Duplicar
        </button>

        {/* Confirmación inline, sin otro modal encima: el mismo patrón que
            Categorías y Anuncios usan para el borrado. */}
        {confirmandoBorrado ? (
          <div className="mt-2 flex flex-col gap-2 rounded-lg bg-error-container p-3">
            <p className="font-body-sm text-body-sm text-on-error-container">
              ¿Eliminar “{campania.nombre}”? No se puede deshacer.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={guardando}
                onClick={onEliminar}
                className="font-label-md text-label-md flex-1 rounded-lg bg-error px-4 py-2 uppercase tracking-widest text-on-error disabled:opacity-60"
              >
                Sí, eliminar
              </button>
              <button
                type="button"
                disabled={guardando}
                onClick={onCancelarBorrado}
                className="font-label-md text-label-md flex-1 rounded-lg border border-outline-variant px-4 py-2 uppercase tracking-widest text-on-surface-variant"
              >
                No
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={guardando}
            onClick={onPedirBorrado}
            className={`${claseAccion} mt-2`}
          >
            Eliminar
          </button>
        )}
      </div>
    </div>
  );
}
