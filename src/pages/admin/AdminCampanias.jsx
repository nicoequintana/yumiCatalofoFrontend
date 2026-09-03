import { useEffect, useRef, useState } from "react";
import BotonVolver from "../../components/BotonVolver.jsx";
import EstadoVacio from "../../components/EstadoVacio.jsx";
import Spinner from "../../components/Spinner.jsx";
import SoloEscritorio from "../../components/admin/SoloEscritorio.jsx";
import CalendarioComercial from "../../components/admin/campanias/CalendarioComercial.jsx";
import DialogoCampania from "../../components/admin/campanias/DialogoCampania.jsx";
import FormularioCampania from "../../components/admin/campanias/FormularioCampania.jsx";
import {
  claveDeDia,
  etiquetaDeMes,
  semanasDelMes,
} from "../../components/admin/campanias/calendario.js";
import { claseCelda, claseEncabezado } from "../../components/admin/clasesTabla.js";
import { estiloDeCampania } from "../../constants/campanias.js";
import { formatFecha } from "../../utils/formato.js";
import {
  actualizarCampania,
  cambiarEstadoCampania,
  crearCampania,
  duplicarCampania,
  eliminarCampania,
  getCampania,
  getCampanias,
  getOpcionesCampania,
  quitarDoodle,
  subirDoodle,
} from "../../api/campanias.js";
import {
  cambiarEstadoProgramacion,
  eliminarProgramacion,
  getProgramaciones,
  getPromociones,
  programarPromocion,
} from "../../api/promociones.js";
import { guardarPromocionesDeCampania } from "../../api/campanias.js";
import DialogoProgramar from "../../components/admin/campanias/DialogoProgramar.jsx";
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
  const [programaciones, setProgramaciones] = useState([]);
  const [promociones, setPromociones] = useState([]);
  const [programando, setProgramando] = useState(null);
  const [programacionAbierta, setProgramacionAbierta] = useState(null);
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
    Promise.all([
      getCampanias(ventanaDelMes(mesVisible)),
      getProgramaciones(ventanaDelMes(mesVisible)),
      getPromociones(),
    ])
      .then(([datos, progs, promos]) => {
        if (!activo) return;
        setCampanias(datos);
        setProgramaciones(progs);
        setPromociones(promos);
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

  /**
   * Abre el detalle de una campaña.
   *
   * **Pide el DETALLE, no reusa la fila del listado**: el listado no trae
   * `promociones` —serían N consultas para pintar una grilla— y sin ellas los
   * checkboxes de "promociones que aplica" saldrían todos vacíos, como si la
   * campaña no tuviera ninguna. La fila se muestra igual mientras llega, para
   * que el diálogo no aparezca en blanco.
   */
  async function abrirDetalle(campania) {
    setSeleccionada(campania);
    setDiaElegido(null);
    setEditando(false);
    setConfirmandoBorrado(false);
    try {
      const detalle = await getCampania(campania.id);
      setSeleccionada((actual) => (actual?.id === detalle.id ? detalle : actual));
    } catch (err) {
      setError(err.message);
    }
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
   * Abre lo que se tocó en el calendario, sea una campaña o una programación.
   *
   * Son dos entidades distintas y se editan distinto: una campaña tiene
   * formulario, Doodle y modal; una programación solo tiene fechas y un
   * interruptor. Ramificar acá evita que el detalle tenga que adivinar qué le
   * llegó.
   */
  function abrirElemento(elemento) {
    if (elemento.tipo === "PROMOCION") {
      setProgramacionAbierta(elemento);
      cerrarPanel();
      return;
    }
    abrirDetalle(elemento);
  }

  async function programar({ promocionId, desde, hasta }) {
    const ok = await conGuardado(() => programarPromocion(promocionId, { desde, hasta }));
    if (ok) setProgramando(null);
  }

  async function alternarProgramacion(programacion) {
    await conGuardado(async () => {
      await cambiarEstadoProgramacion(programacion.id, !programacion.habilitada);
      setProgramacionAbierta((actual) =>
        actual?.id === programacion.id ? { ...actual, habilitada: !programacion.habilitada } : actual,
      );
    });
  }

  async function desprogramar(programacion) {
    const ok = await conGuardado(() => eliminarProgramacion(programacion.id));
    if (ok) setProgramacionAbierta(null);
  }

  /** Qué promociones aplica una campaña mientras está activa. */
  async function guardarPromociones(campaniaId, promocionIds) {
    await conGuardado(async () => {
      await guardarPromocionesDeCampania(campaniaId, promocionIds);
      // El detalle abierto tiene que reflejar lo que se acaba de guardar: el
      // refresco general recarga el LISTADO, que no trae `promociones`.
      const detalle = await getCampania(campaniaId);
      setSeleccionada((actual) => (actual?.id === campaniaId ? detalle : actual));
    });
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
      const [datos, progs, promos] = await Promise.all([
        getCampanias(ventanaDelMes(mesVisible)),
        getProgramaciones(ventanaDelMes(mesVisible)),
        getPromociones(),
      ]);
      setCampanias(datos);
      setProgramaciones(progs);
      setPromociones(promos);
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

  /**
   * Lo que el calendario dibuja: campañas Y promociones programadas, en una
   * sola lista con un `tipo` que las distingue. El reparto en carriles trabaja
   * sobre el conjunto, así que una campaña y una promo que se superponen se
   * apilan igual que dos campañas — que es lo correcto: ocupan los mismos días.
   */
  const elementos = [
    ...campanias.map((c) => ({ ...c, tipo: "CAMPANIA" })),
    ...programaciones.map((p) => ({ ...p, tipo: "PROMOCION" })),
  ];

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
            elementos={elementos}
            claveHoy={claveDia}
            onSeleccionarDia={abrirAlta}
            onSeleccionar={abrirElemento}
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
              <span className="flex shrink-0 gap-2">
                {/* Programar una promoción SIN crear una campaña: el §21. Bajar
                    un precio tres días no necesita Doodle, modal ni CTA. */}
                <button
                  type="button"
                  onClick={() => setProgramando(claveDia)}
                  className="font-label-md text-label-md rounded-lg border border-outline-variant px-5 py-3 uppercase tracking-widest text-on-surface-variant transition-colors hover:bg-surface-container"
                >
                  Programar promoción
                </button>
                <button
                  type="button"
                  onClick={() => abrirAlta(claveDia)}
                  className="font-label-md text-label-md rounded-lg bg-primary px-5 py-3 uppercase tracking-widest text-on-primary transition-opacity hover:opacity-90"
                >
                  Nueva campaña
                </button>
              </span>
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
                promociones={promociones}
                onGuardarPromociones={(ids) => guardarPromociones(seleccionada.id, ids)}
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
        {programando !== null ? (
          <DialogoProgramar
            promociones={promociones}
            diaInicial={programando}
            guardando={guardando}
            onProgramar={programar}
            onCerrar={() => setProgramando(null)}
          />
        ) : null}

        {programacionAbierta ? (
          <DialogoCampania
            titulo={programacionAbierta.nombre}
            onCerrar={() => setProgramacionAbierta(null)}
          >
            <div className="flex flex-col gap-5">
              <p className="font-body-md text-body-md text-on-surface-variant">
                Promoción programada del{" "}
                <strong className="text-on-surface">{formatFecha(programacionAbierta.desde)}</strong>{" "}
                al{" "}
                <strong className="text-on-surface">{formatFecha(programacionAbierta.hasta)}</strong>.
              </p>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Los descuentos por producto se editan desde <strong>Promociones</strong>. Acá solo se
                decide cuándo se aplican.
              </p>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={guardando}
                  onClick={() => alternarProgramacion(programacionAbierta)}
                  className={`font-label-md text-label-md w-full rounded-lg px-4 py-3 uppercase tracking-widest transition-opacity hover:opacity-90 disabled:opacity-60 ${
                    programacionAbierta.habilitada
                      ? "bg-surface-container text-on-surface"
                      : "bg-primary text-on-primary"
                  }`}
                >
                  {programacionAbierta.habilitada ? "Apagar" : "Encender"}
                </button>
                {/* Desprogramar borra el PERÍODO, no la promoción: sigue
                    existiendo con sus productos y sus otras programaciones. */}
                <button
                  type="button"
                  disabled={guardando}
                  onClick={() => desprogramar(programacionAbierta)}
                  className={claseAccion}
                >
                  Quitar del calendario
                </button>
              </div>
            </div>
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
const claseAccion =
  "font-label-md text-label-md w-full rounded-lg border border-outline-variant px-4 py-3 uppercase tracking-widest text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:opacity-60";

const claseAccionFila =
  "font-label-sm text-label-sm rounded-lg border border-outline-variant px-3 py-2 uppercase tracking-widest text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-60";

function DetalleCampania({
  campania,
  promociones,
  onGuardarPromociones,
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
        {/* Las promociones que la campaña aplica mientras está activa. De acá
            sale la regla más útil del módulo: apagar la campaña las apaga a
            todas de una, sin desactivar nada una por una. */}
        <div className="mb-2">
          <h3 className="font-label-md text-label-md mb-2 block uppercase tracking-widest text-on-surface-variant">
            Promociones que aplica
          </h3>
          {promociones.length === 0 ? (
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Todavía no hay promociones. Creá una desde Promociones.
            </p>
          ) : (
            <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-lg border border-outline-variant p-2">
              {promociones.map((promocion) => {
                const asociada = (campania.promociones ?? []).some((p) => p.id === promocion.id);
                return (
                  <label
                    key={promocion.id}
                    className="font-body-md text-body-md flex items-center gap-2 rounded px-2 py-1 text-on-surface hover:bg-surface-container"
                  >
                    <input
                      type="checkbox"
                      checked={asociada}
                      disabled={guardando}
                      onChange={() => {
                        const actuales = (campania.promociones ?? []).map((p) => p.id);
                        onGuardarPromociones(
                          asociada
                            ? actuales.filter((id) => id !== promocion.id)
                            : [...actuales, promocion.id],
                        );
                      }}
                      className="h-4 w-4 accent-[rgb(var(--color-primary))]"
                    />
                    <span className="truncate">{promocion.nombre}</span>
                    <span className="font-body-sm text-body-sm ml-auto shrink-0 text-on-surface-variant">
                      {promocion.cantidadProductos}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

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
