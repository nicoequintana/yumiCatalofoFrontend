import { useCallback, useEffect, useRef, useState } from "react";
import BotonVolver from "../../components/BotonVolver.jsx";
import EstadoVacio from "../../components/EstadoVacio.jsx";
import Spinner from "../../components/Spinner.jsx";
import SoloEscritorio from "../../components/admin/SoloEscritorio.jsx";
import CalendarioComercial from "../../components/admin/campanias/CalendarioComercial.jsx";
import FormularioCampania from "../../components/admin/campanias/FormularioCampania.jsx";
import { claveDeDia, semanasDelMes } from "../../components/admin/campanias/calendario.js";
import { estiloDeCampania } from "../../constants/campanias.js";
import {
  actualizarCampania,
  cambiarEstadoCampania,
  crearCampania,
  duplicarCampania,
  eliminarCampania,
  getCampanias,
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
 * El mes visible acota la consulta (`?desde`/`?hasta`) con filtro de
 * SOLAPAMIENTO: una campaña de agosto a octubre aparece al mirar septiembre,
 * porque efectivamente ocupa ese mes.
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
  const { claveDia } = useContextoComercial();

  const [mesVisible, setMesVisible] = useState(() => {
    const hoy = new Date();
    return { ano: hoy.getUTCFullYear(), mes: hoy.getUTCMonth() };
  });
  const [campanias, setCampanias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [seleccionada, setSeleccionada] = useState(null);
  const [diaElegido, setDiaElegido] = useState(null);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);
  const inputDoodle = useRef(null);

  // La clave del día la manda el BACKEND. Cuando llega, el calendario salta al
  // mes que de verdad es hoy — no al que dice el reloj del navegador.
  const [mesAlineado, setMesAlineado] = useState(false);
  useEffect(() => {
    if (claveDia && !mesAlineado) {
      setMesVisible(mesDeClave(claveDia));
      setMesAlineado(true);
    }
  }, [claveDia, mesAlineado]);

  const cargar = useCallback(
    async ({ silencioso = false } = {}) => {
      if (!silencioso) setCargando(true);
      try {
        const datos = await getCampanias(ventanaDelMes(mesVisible));
        setCampanias(datos);
        // Un fetch exitoso limpia el error anterior: si no, un problema de red
        // ya resuelto seguiría en pantalla sobre datos frescos.
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setCargando(false);
      }
    },
    [mesVisible],
  );

  useEffect(() => {
    let activo = true;

    setCargando(true);
    getCampanias(ventanaDelMes(mesVisible))
      .then((datos) => {
        if (!activo) return;
        setCampanias(datos);
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

  async function conGuardado(operacion) {
    setGuardando(true);
    setError(null);
    try {
      await operacion();
      await cargar({ silencioso: true });
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setGuardando(false);
    }
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
      setSeleccionada(actualizada);
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

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div>
            {cargando ? (
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
                  setMesVisible(mes ?? mesDeClave(claveDia ?? claveDeDia(new Date())));
                  cerrarPanel();
                }}
                campanias={campanias}
                claveHoy={claveDia}
                onSeleccionarDia={(clave) => {
                  setSeleccionada(null);
                  setDiaElegido(clave);
                  setEditando(false);
                }}
                onSeleccionarCampania={(campania) => {
                  setSeleccionada(campania);
                  setDiaElegido(null);
                  setEditando(false);
                  setConfirmandoBorrado(false);
                }}
              />
            )}

            {!cargando && !error && campanias.length === 0 ? (
              <div className="mt-6">
                <EstadoVacio
                  icono="event_available"
                  titulo="Todavía no hay campañas este mes"
                  mensaje="Tocá cualquier día del calendario para crear la primera."
                />
              </div>
            ) : null}
          </div>

          <aside className="rounded-xl border border-outline-variant bg-surface-container-low p-5">
            {!panelAbierto ? (
              <p className="font-body-md text-body-md text-on-surface-variant">
                Elegí un día para crear una campaña, o una campaña del calendario para ver su
                detalle.
              </p>
            ) : mostrandoFormulario ? (
              <>
                <h2 className="font-headline-sm text-headline-sm mb-6 text-primary">
                  {seleccionada ? "Editar campaña" : "Nueva campaña"}
                </h2>
                <FormularioCampania
                  campania={seleccionada}
                  diaElegido={diaElegido}
                  guardando={guardando}
                  onGuardar={guardar}
                  onCancelar={() => (seleccionada ? setEditando(false) : cerrarPanel())}
                />
              </>
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
                onCerrar={cerrarPanel}
              />
            )}
          </aside>
        </div>
      </main>
    </SoloEscritorio>
  );
}

const claseAccion =
  "font-label-md text-label-md w-full rounded-lg border border-outline-variant px-4 py-3 uppercase tracking-widest text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:opacity-60";

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
  onCerrar,
}) {
  const estilo = estiloDeCampania(campania);
  const encendida = campania.estado === "HABILITADA";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-headline-sm text-headline-sm text-primary">{campania.nombre}</h2>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar detalle"
          className="rounded-lg p-1 text-on-surface-variant transition-colors hover:bg-surface-container"
        >
          <span aria-hidden="true" className="material-symbols-outlined block text-[20px]">
            close
          </span>
        </button>
      </div>

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
            {campania.desde} → {campania.hasta}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Prioridad</dt>
          <dd className="text-on-surface">{campania.prioridad}</dd>
        </div>
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
            className="mb-3 h-16 w-auto rounded-lg bg-surface-container-lowest p-2"
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
            <button type="button" disabled={guardando} onClick={onQuitarDoodle} className={claseAccion}>
              Quitar Doodle
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-outline-variant pt-4">
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

        {/* Confirmación inline, sin modal: el mismo patrón que Categorías y
            Anuncios usan para el borrado. */}
        {confirmandoBorrado ? (
          <div className="flex flex-col gap-2 rounded-lg bg-error-container p-3">
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
          <button type="button" disabled={guardando} onClick={onPedirBorrado} className={claseAccion}>
            Eliminar
          </button>
        )}
      </div>
    </div>
  );
}
