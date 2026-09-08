import { useEffect, useState } from "react";
import BotonVolver from "../../components/BotonVolver.jsx";
import Spinner from "../../components/Spinner.jsx";
import EstadoVacio from "../../components/EstadoVacio.jsx";
import EstadoErrorCarga from "../../components/admin/EstadoErrorCarga.jsx";
import Advertencia from "../../components/admin/Advertencia.jsx";
import BadgeEstado from "../../components/admin/BadgeEstado.jsx";
import { getMetricasComerciales } from "../../api/adminMetricasComerciales.js";
import { formatEntero, formatFecha } from "../../utils/formato.js";
import {
  claseCelda,
  claseCeldaNumerica,
  claseEncabezado,
  claseTablaApilada,
} from "../../components/admin/clasesTabla.js";

/**
 * Filtros de estado temporal, mapeados al `?estado=` que espera
 * `getMetricasComerciales`. `undefined` es "sin filtro" a propósito: así el
 * llamado a la API siempre lleva la clave `estado`, sea cual sea su valor —
 * mismo criterio que el resto de los filtros del panel.
 */
const FILTROS_ESTADO = [
  { etiqueta: "Todas", valor: undefined },
  { etiqueta: "Activas", valor: "ACTIVA" },
  { etiqueta: "Programadas", valor: "PROGRAMADA" },
  { etiqueta: "Finalizadas", valor: "FINALIZADA" },
];

/**
 * Tasa (0..1) -> "25,0%". Mismo criterio que `AdminEmbudo`: `null`/`undefined`
 * es "no calculable" y se resuelve ANTES de llamar a esta función — nunca
 * "0%", que le mentiría al admin sobre una tasa que en realidad no se sabe.
 */
function formatTasa(tasa) {
  return `${(tasa * 100).toFixed(1).replace(".", ",")}%`;
}

/**
 * Una tarjeta por campaña o promoción. No es una fila de tabla: cada ítem
 * tiene demasiadas dimensiones (estado temporal, estado administrativo,
 * período, dos orígenes con tres números cada uno, destinos, etapas) para que
 * eso entre en una fila legible.
 */
function TarjetaMetrica({ item, origenes, registraDesde }) {
  const estadoAdministrativo =
    item.tipo === "CAMPANIA" ? item.estado : item.activa ? "Habilitada" : "Deshabilitada";

  return (
    <li className="flex flex-col gap-4 rounded-xl bg-surface-container-lowest p-5 shadow-ambient">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-headline-md text-headline-md text-on-surface">{item.nombre}</h3>
        <BadgeEstado estado={item.estadoTemporal} />
        {item.subregistrada ? (
          <span
            title={`La medición empezó el ${registraDesde}`}
            className="font-label-sm text-label-sm rounded-full bg-tertiary-container px-2 py-1 uppercase tracking-widest text-on-surface"
          >
            Parcial
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <p className="font-body-md text-body-md text-on-surface-variant">
          Estado administrativo: {estadoAdministrativo}
        </p>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Período: {formatFecha(item.periodo.desde)} – {formatFecha(item.periodo.hasta)}
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-outline-variant">
        <table role="table" className={`${claseTablaApilada} w-full min-w-[320px] text-left`}>
          <thead role="rowgroup">
            <tr role="row" className="border-b border-outline-variant">
              <th role="columnheader" className={claseEncabezado}>Origen</th>
              <th role="columnheader" className={claseEncabezado}>Impresiones</th>
              <th role="columnheader" className={claseEncabezado}>Clicks</th>
              <th role="columnheader" className={claseEncabezado}>Tasa</th>
            </tr>
          </thead>
          <tbody role="rowgroup">
            {origenes.map((origen) => {
              const tasa = item.tasaClicks[origen.valor];
              return (
                <tr
                  key={origen.valor}
                  role="row"
                  className="border-b border-outline-variant last:border-b-0"
                >
                  <td
                    role="cell"
                    data-celda="identidad"
                    className={`${claseCelda} text-on-surface`}
                  >
                    {origen.etiqueta}
                  </td>
                  <td
                    role="cell"
                    data-label="Impresiones"
                    className={`${claseCeldaNumerica} text-on-surface-variant`}
                  >
                    {formatEntero(item.impresiones[origen.valor])}
                  </td>
                  <td
                    role="cell"
                    data-label="Clicks"
                    className={`${claseCeldaNumerica} text-on-surface-variant`}
                  >
                    {formatEntero(item.clicks[origen.valor])}
                  </td>
                  <td
                    role="cell"
                    data-label="Tasa"
                    className={`${claseCeldaNumerica} text-on-surface-variant`}
                  >
                    {tasa === null || tasa === undefined ? "—" : formatTasa(tasa)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {item.clicksPorDestino.length > 0 ? (
        <p className="font-body-md text-body-md text-on-surface-variant">
          Clicks por destino:{" "}
          {item.clicksPorDestino
            .map((destino) => `${destino.etiqueta} (${formatEntero(destino.clicks)})`)
            .join(" · ")}
        </p>
      ) : null}

      {item.etapas.length > 0 ? (
        <ul className="flex flex-wrap gap-x-6 gap-y-1">
          {item.etapas.map((etapa) => (
            <li
              key={etapa.clave}
              className="font-body-md text-body-md text-on-surface-variant"
            >
              {etapa.etiqueta}: {formatEntero(etapa.cantidad)}
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/**
 * `/catalogo/admin/metricas-comerciales` — impresiones, clicks y etapas de
 * cada campaña y promoción con banner cargado.
 *
 * Molde de `AdminEmbudo.jsx` (bandera `activo` del efecto, `EstadoErrorCarga`
 * con `onReintentar`, `EstadoVacio`, error que se limpia en el fetch
 * exitoso), con tres diferencias a propósito:
 *
 * - **Sin `SelectorPeriodo`**: el período es el de cada ítem, no uno global.
 *   El filtro es por estado temporal, un `role="group"` de botones con
 *   `aria-pressed` — nunca `role="tablist"`, que exigiría roving `tabindex` y
 *   navegación por flechas que este filtro no necesita.
 * - **Una tarjeta por ítem, no una fila de tabla.**
 * - **La tabla chica va DENTRO de cada tarjeta** (`TarjetaMetrica`), una fila
 *   por origen — los orígenes y sus etiquetas los manda el backend
 *   (`origenes`), la pantalla nunca los escribe a mano.
 *
 * La pantalla no calcula nada: las tasas, el estado temporal, las etiquetas
 * y `subregistrada` llegan resueltos del backend.
 */
function AdminMetricasComerciales() {
  const [estado, setEstado] = useState(undefined);
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [reintento, setReintento] = useState(0);

  useEffect(() => {
    let activo = true;
    setCargando(true);

    getMetricasComerciales({ estado })
      .then((resultado) => {
        if (!activo) return;
        setDatos(resultado);
        setError(null);
        setCargando(false);
      })
      .catch(() => {
        if (!activo) return;
        setError(true);
        setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [estado, reintento]);

  return (
    <main className="w-full px-4 py-6 md:px-8 md:py-8">
      <div className="mb-6">
        <BotonVolver fallback="/catalogo/admin/productos" />
      </div>

      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <span className="font-label-sm text-label-sm mb-2 block uppercase tracking-[0.2em] text-secondary">
            Panel de administración
          </span>
          <h1 className="font-headline-lg text-headline-lg text-primary">
            Métricas comerciales
          </h1>
        </div>

        <div
          role="group"
          aria-label="Filtrar por estado temporal"
          className="flex flex-wrap gap-2"
        >
          {FILTROS_ESTADO.map((filtro) => (
            <button
              key={filtro.etiqueta}
              type="button"
              aria-pressed={estado === filtro.valor}
              onClick={() => setEstado(filtro.valor)}
              className={`font-label-md text-label-md rounded-lg border px-4 py-2 uppercase tracking-widest ${
                estado === filtro.valor
                  ? "border-primary bg-primary text-on-primary"
                  : "border-outline-variant text-on-surface-variant hover:border-outline"
              }`}
            >
              {filtro.etiqueta}
            </button>
          ))}
        </div>
      </div>

      {/*
        Los dos avisos van afuera del ternario de carga, igual que
        `AvisoPeriodoRecortado` en `AdminEmbudo`: mientras carga, `datos` es
        `null` y no renderizan nada.
      */}
      {datos?.truncado ? (
        <Advertencia testId="advertencia-truncado" titulo="Listado recortado">
          <p className="font-body-md text-body-md text-on-surface">
            Este listado muestra como máximo las 50 campañas y promociones más
            recientes. Si hay más, y en especial si estás filtrando por
            estado, puede haber ítems que existen y no se muestran acá.
          </p>
        </Advertencia>
      ) : null}

      {datos?.etapasEnRango ? (
        <p
          role="status"
          className="font-body-md text-body-md mb-8 rounded-xl border border-outline-variant bg-surface-container-low p-4 text-on-surface-variant"
        >
          Las vistas de producto y los agregados al carrito se contaron sobre
          el rango del {datos.etapasEnRango.desde} al{" "}
          {datos.etapasEnRango.hasta}, no sobre el período de cada campaña o
          promoción.
        </p>
      ) : null}

      {cargando ? (
        <div className="flex w-full flex-col items-center justify-center gap-4 px-4 py-24 text-center md:px-8">
          <Spinner className="h-8 w-8 text-on-surface-variant" />
          <p className="font-body-md text-body-md text-on-surface-variant">
            Cargando métricas comerciales…
          </p>
        </div>
      ) : error ? (
        <EstadoErrorCarga
          titulo="No se pudieron cargar las métricas comerciales"
          onReintentar={() => setReintento((n) => n + 1)}
        />
      ) : datos === null ? null : datos.items.length === 0 ? (
        <EstadoVacio
          icono="campaign"
          titulo="Todavía no hay campañas ni promociones con actividad"
          mensaje="Cuando una campaña o promoción con banner cargado reciba impresiones o clicks, sus métricas van a aparecer acá."
        />
      ) : (
        <ul className="flex flex-col gap-6">
          {datos.items.map((item) => (
            <TarjetaMetrica
              key={`${item.tipo}-${item.id}`}
              item={item}
              origenes={datos.origenes}
              registraDesde={datos.registraDesde}
            />
          ))}
        </ul>
      )}
    </main>
  );
}

export default AdminMetricasComerciales;
