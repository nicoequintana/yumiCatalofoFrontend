import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Spinner from "../../components/Spinner.jsx";
import SeccionAdmin from "../../components/SeccionAdmin.jsx";
import { getSaludCatalogo } from "../../api/products.js";
import { BIEN, ESTILO, ICONO, construirChequeos } from "../../utils/saludCatalogo.js";

/**
 * `/catalogo/admin/productos/salud` — el estado del catálogo, chequeo por
 * chequeo.
 *
 * **Contesta una pregunta distinta de la de las pantallas de analytics.**
 * Ventas, Embudo y Clientes miden RESULTADO, y para eso hacen falta datos: con
 * 264 vistas y 2 ventas, una tasa de conversión por producto es ruido, no
 * señal. Esta mide COMPLETITUD y EXPOSICIÓN — qué productos están incompletos
 * y a cuáles no los ve nadie —, así que sirve desde el primer día, con el
 * catálogo que haya y sin esperar a que se acumule tráfico.
 *
 * **Un chequeo en cero SE MUESTRA, no se oculta.** "Cero productos sin fotos"
 * es la respuesta, no la ausencia de respuesta: si la fila desapareciera, no
 * habría forma de distinguir "está todo bien" de "el chequeo se rompió".
 *
 * **Cada fila lleva a donde se arregla**, y solo cuando ese destino existe de
 * verdad. Un link que no filtra nada es peor que ningún link — deja al admin
 * buscando a mano en una tabla de 80 filas creyendo que ya está filtrada.
 */

function Fila({ fila }) {
  return (
    <li className="flex flex-col gap-3 border-b border-outline-variant py-4 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="flex min-w-0 items-start gap-3">
        <span
          aria-hidden="true"
          className={`material-symbols-outlined mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-[16px] ${ESTILO[fila.estado]}`}
        >
          {ICONO[fila.estado]}
        </span>
        <div className="min-w-0">
          <p className="font-body-md text-body-md text-on-surface">{fila.etiqueta}</p>
          <p className="font-body-md mt-1 text-[14px] text-on-surface-variant">{fila.detalle}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-4 pl-10 sm:pl-0">
        <span className="font-headline-md text-[22px] tabular-nums text-on-surface">
          {fila.valor}
          {fila.de !== undefined ? (
            <span className="font-body-md text-[14px] text-on-surface-variant"> / {fila.de}</span>
          ) : null}
        </span>
        {/* El link aparece SOLO cuando el destino filtra de verdad. Ver el
            comentario de cabecera: un link que no filtra deja al admin
            buscando a mano creyendo que ya está filtrado. */}
        {fila.accion ? (
          <Link
            to={fila.accion.a}
            className="font-label-sm text-label-sm whitespace-nowrap rounded-full border border-outline-variant px-3 py-1.5 uppercase tracking-widest text-on-surface-variant hover:border-outline"
          >
            {fila.accion.texto}
          </Link>
        ) : null}
      </div>
    </li>
  );
}

function AdminSaludCatalogo() {
  const [salud, setSalud] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [reintento, setReintento] = useState(0);

  useEffect(() => {
    let activo = true;
    setCargando(true);

    getSaludCatalogo()
      .then((datos) => {
        if (!activo) return;
        setSalud(datos);
        setError(null);
        setCargando(false);
      })
      .catch(() => {
        if (!activo) return;
        // Distinguir "falló la carga" de "está todo bien": sin esto, un backend
        // caído se leería como un catálogo impecable, que es la mentira más
        // peligrosa que puede decir esta pantalla en particular.
        setError("No se pudo cargar el estado del catálogo. Revisá tu conexión e intentá de nuevo.");
        setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [reintento]);

  const chequeos = salud ? construirChequeos(salud) : [];
  const problemas = chequeos
    .flatMap((seccion) => seccion.filas)
    .filter((fila) => fila.estado !== BIEN).length;

  return (
    <main className="w-full px-4 py-6 md:px-8 md:py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="font-label-sm text-label-sm mb-2 block uppercase tracking-[0.2em] text-secondary">
            Panel de administración
          </span>
          <h1 className="font-headline-lg text-headline-lg text-primary">Salud del catálogo</h1>
          <p className="font-body-md text-body-md mt-2 max-w-prose text-on-surface-variant">
            Qué de tu catálogo está frenando la venta. No mide tráfico ni facturación: mide qué
            productos están incompletos y a cuáles no los ve nadie.
          </p>
        </div>
        <Link
          to="/catalogo/admin/productos"
          className="font-label-md text-label-md inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-5 py-3 uppercase tracking-widest text-on-surface-variant hover:border-outline"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Productos
        </Link>
      </div>

      {error ? (
        <div className="mb-6 flex flex-col items-start gap-3 rounded-lg bg-error-container px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-body-md text-body-md text-on-error-container">{error}</p>
          <button
            type="button"
            onClick={() => setReintento((n) => n + 1)}
            className="font-label-md text-label-md shrink-0 rounded-lg border border-on-error-container px-4 py-2 uppercase tracking-widest text-on-error-container hover:bg-error-container"
          >
            Reintentar
          </button>
        </div>
      ) : null}

      {cargando ? (
        <div className="flex w-full flex-col items-center justify-center gap-4 px-4 py-24 text-center">
          <Spinner className="h-8 w-8 text-on-surface-variant" />
          <p className="font-body-md text-body-md text-on-surface-variant">Revisando el catálogo…</p>
        </div>
      ) : error ? null : (
        <>
          <p
            role="status"
            className="font-body-md text-body-md mb-6 rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 text-on-surface"
          >
            {problemas === 0
              ? `Los ${salud.total} productos del catálogo pasan todos los chequeos.`
              : `${problemas} ${problemas === 1 ? "chequeo pide" : "chequeos piden"} atención sobre ${salud.total} productos.`}
          </p>

          {chequeos.map((seccion) => (
            <SeccionAdmin
              key={seccion.titulo}
              titulo={seccion.titulo}
              descripcion={seccion.descripcion}
            >
              <ul className="w-full">
                {seccion.filas.map((fila) => (
                  <Fila key={fila.clave} fila={fila} />
                ))}
              </ul>
            </SeccionAdmin>
          ))}
        </>
      )}
    </main>
  );
}

export default AdminSaludCatalogo;
