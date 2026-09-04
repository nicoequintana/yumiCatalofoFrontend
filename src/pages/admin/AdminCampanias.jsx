import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BotonVolver from "../../components/BotonVolver.jsx";
import EstadoVacio from "../../components/EstadoVacio.jsx";
import Spinner from "../../components/Spinner.jsx";
import SoloEscritorio from "../../components/admin/SoloEscritorio.jsx";
import CalendarioComercial from "../../components/admin/campanias/CalendarioComercial.jsx";
import DialogoCampania from "../../components/admin/campanias/DialogoCampania.jsx";
import {
  claveDeDia,
  etiquetaDeMes,
  semanasDelMes,
} from "../../components/admin/campanias/calendario.js";
import { claseCelda, claseEncabezado } from "../../components/admin/clasesTabla.js";
import { estiloDeCampania } from "../../constants/campanias.js";
import { formatFecha } from "../../utils/formato.js";
import { cambiarEstadoCampania, getCampanias } from "../../api/campanias.js";
import {
  cambiarEstadoProgramacion,
  eliminarProgramacion,
  getProgramaciones,
  getPromociones,
  programarPromocion,
} from "../../api/promociones.js";
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
 *
 * ESTA PANTALLA YA NO EDITA CAMPAÑAS: NAVEGA. El alta y la edición viven en
 * `/campanias/nueva` y `/campanias/:id/editar`, que son PÁGINAS
 * (`AdminCampaniaEditor`). El editor ya medía 1.686 px de alto en una ventana
 * de 800 antes de sumarle el selector de productos: elegir la vitrina dentro de
 * un modal es un flujo dentro de un flujo. Mismo precedente que el editor de
 * producto.
 *
 * LO QUE SÍ SIGUE SIENDO DIÁLOGO: programar una promoción y el panel de una
 * promoción ya programada. Son cortos e interruptivos —una fecha, un
 * interruptor—, que es justo para lo que sirve un modal.
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
  const navigate = useNavigate();

  // Arranca en `null` y NO en el mes del reloj del navegador. `claveDia` la
  // manda el backend, que es la única definición de "día" del sistema: sembrar
  // con `new Date().getUTCMonth()` reintroducía en el frontend la definición por
  // reloj UTC que el proyecto borró a propósito, y entre las 21:00 y las 23:59
  // del último día del mes abría el calendario en el mes SIGUIENTE.
  const [mesVisible, setMesVisible] = useState(null);
  const [campanias, setCampanias] = useState([]);
  const [programaciones, setProgramaciones] = useState([]);
  const [promociones, setPromociones] = useState([]);
  const [programando, setProgramando] = useState(null);
  const [programacionAbierta, setProgramacionAbierta] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

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

  /**
   * Abre la página de edición de una campaña.
   *
   * **No pide el detalle acá**: lo carga el editor, que es quien lo necesita
   * entero (promociones, vitrina, referencia del CTA). Pedirlo desde el
   * calendario sería la misma consulta hecha dos veces.
   */
  function abrirCampania(campania) {
    navigate(`/catalogo/admin/campanias/${campania.id}/editar`);
  }

  /**
   * Abre el alta con el día que se tocó ya precargado en las dos fechas.
   *
   * `clave` la manda el backend (`claveDia`) o sale del calendario, nunca del
   * reloj del navegador. Sin ella se abre el alta con las fechas vacías, que es
   * mejor que sembrarlas con un día que podría estar corrido.
   */
  function abrirAlta(clave) {
    navigate(`/catalogo/admin/campanias/nueva${clave ? `?dia=${clave}` : ""}`);
  }

  /**
   * Abre lo que se tocó en el calendario, sea una campaña o una programación.
   *
   * Son dos entidades distintas y se abren distinto: una campaña tiene una
   * página entera (formulario, Doodle, vitrina, cartel); una programación solo
   * tiene fechas y un interruptor, y para eso alcanza un diálogo.
   */
  function abrirElemento(elemento) {
    if (elemento.tipo === "PROMOCION") {
      setProgramacionAbierta(elemento);
      return;
    }
    abrirCampania(elemento);
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

  /**
   * El ON/OFF desde la fila. Va por su ruta propia y no por el editor: apagar
   * una campaña desde el calendario no tiene que reenviar fechas y textos que
   * nadie está tocando.
   */
  async function alternarEstado(campania) {
    const siguiente = campania.estado === "HABILITADA" ? "DESHABILITADA" : "HABILITADA";
    await conGuardado(() => cambiarEstadoCampania(campania.id, siguiente));
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
              setProgramacionAbierta(null);
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
                        onAbrir={() => abrirCampania(campania)}
                        onAlternarEstado={() => alternarEstado(campania)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
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

/**
 * Una fila del CRUD. Aparte para que el `map` de la tabla se lea de un vistazo.
 *
 * El nombre y "Editar" llevan al MISMO lugar: la página del editor. Son dos
 * puertas a propósito — el nombre es el gesto natural sobre una fila, y el botón
 * es el que se busca cuando se viene a cambiar algo.
 */
function FilaCampania({ campania, guardando, onAbrir, onAlternarEstado }) {
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
          <button type="button" disabled={guardando} onClick={onAbrir} className={claseAccionFila}>
            Editar
          </button>
        </span>
      </td>
    </tr>
  );
}

/**
 * Las dos formas de botón secundario de esta pantalla.
 *
 * `claseAccion` es de ancho completo y la usa el panel de una promoción
 * programada; `claseAccionFila` es compacta y la usan los botones de cada fila
 * del CRUD. **Las dos siguen en uso**: es fácil confundirlas con residuo del
 * detalle que vivía acá antes de que la edición se mudara a su propia página.
 */
const claseAccion =
  "font-label-md text-label-md w-full rounded-lg border border-outline-variant px-4 py-3 uppercase tracking-widest text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:opacity-60";

const claseAccionFila =
  "font-label-sm text-label-sm rounded-lg border border-outline-variant px-3 py-2 uppercase tracking-widest text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-60";
