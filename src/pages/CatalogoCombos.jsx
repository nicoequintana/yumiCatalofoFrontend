import { Link } from "react-router-dom";
import EstadoVacio from "../components/EstadoVacio.jsx";
import TarjetaCombo from "../components/TarjetaCombo.jsx";
import GrillaCombos from "../components/GrillaCombos.jsx";
import Migas from "../components/Migas.jsx";
import MetaSeo from "../components/MetaSeo.jsx";
import useCombosCatalogo from "../hooks/useCombosCatalogo.js";
import useResumenCombos from "../hooks/useResumenCombos.js";
import { urlAbsoluta } from "../constants/seo.js";
import { CLASE_SECCION_CATALOGO_COMBOS } from "../constants/combos.js";

/**
 * Franja teal del encabezado (rediseño del 15/09/2026, `.cat-hero`). Los dos
 * números llegan de `GET /combos/resumen`: la página no cuenta combos ni busca
 * el máximo. Sin resumen (falló), sin combos o con la LISTA en error, la línea
 * de datos no se muestra: no se afirma "N combos disponibles" arriba de un
 * "No se pudieron cargar los combos".
 * REGLA DE CLOAKING: `encabezadoCatalogoCombos` (`seo.controller.js`) repite
 * estos textos.
 */
function EncabezadoCombos({ resumen, ocultarDatos }) {
  const hayDatos = !ocultarDatos && resumen && resumen.cantidad > 0;

  return (
    <header className="relative isolate grid gap-2.5 overflow-hidden rounded-[26px] bg-primary p-6 text-on-primary md:p-10 lg:p-11">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-[120px] -right-[60px] -z-10 h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,rgb(var(--color-secondary-container)/0.35),transparent_65%)]"
      />
      <span className="inline-flex items-center gap-1.5 font-label-sm text-[12px] font-bold uppercase leading-none tracking-[0.12em] text-secondary-container">
        <span aria-hidden="true" className="material-symbols-outlined text-[17px]">
          redeem
        </span>
        Combos
      </span>
      <h1 className="max-w-[18ch] text-balance font-display-xl text-[clamp(30px,4.6vw,52px)] font-black leading-none tracking-[-0.04em]">
        Llevá el set completo y pagá menos
      </h1>
      <p className="max-w-[52ch] font-body-md text-[17px] leading-normal text-on-primary/[0.84]">
        Productos elegidos para usarse juntos, con un descuento que solo tenés comprando el combo.
      </p>
      {hayDatos ? (
        <div className="mt-1.5 flex flex-wrap gap-x-[18px] gap-y-2 font-label-md text-[14px] font-semibold tracking-normal text-on-primary-container">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
              sell
            </span>
            <span>Hasta {resumen.porcentajeMaximo}% off</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
              inventory_2
            </span>
            <span>
              {resumen.cantidad} {resumen.cantidad === 1 ? "combo disponible" : "combos disponibles"}
            </span>
          </span>
        </div>
      ) : null}
    </header>
  );
}

/** `/combos` — catálogo de combos, spec §7.4. Grilla doble; vacío y error
 * son DOS estados distintos y NUNCA se confunden: el vacío promete "muy
 * pronto", y afirmar eso ante un error de carga sería mentirle a quien tuvo
 * un problema de conexión.
 *
 * El contenedor (`CLASE_SECCION_CATALOGO_COMBOS`) lo comparte la vista previa
 * del editor; ahí está el porqué del `pb-32`. */
function CatalogoCombos() {
  const { combos, cargando, error } = useCombosCatalogo();
  const { resumen } = useResumenCombos();

  return (
    <>
      <MetaSeo
        titulo="Combos — YIMA"
        descripcion="Conjuntos de productos con un descuento que se aplica solo si los llevás juntos."
        canonical={urlAbsoluta("/combos")}
      />
      <div className="mx-auto w-full max-w-container-max px-margin-mobile md:px-margin-desktop">
        <Migas items={[{ label: "Inicio", to: "/" }, { label: "Combos" }]} />
      </div>

      <section className={CLASE_SECCION_CATALOGO_COMBOS}>
        <EncabezadoCombos resumen={resumen} ocultarDatos={Boolean(error)} />

        {cargando ? null : error ? (
          <EstadoVacio icono="cloud_off" titulo="No se pudieron cargar los combos" mensaje={error} />
        ) : combos.length === 0 ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <EstadoVacio
              icono="redeem"
              titulo="Upss, nos agarraste, estamos preparando nuevos combos para vos!"
              mensaje="Muy pronto los vas a ver acá!"
            />
            <Link
              to="/coleccion"
              className="-mt-8 inline-flex min-h-11 items-center rounded-full bg-primary px-8 py-3 font-label-lg text-label-lg uppercase tracking-widest text-on-primary hover:bg-primary-container"
            >
              Mientras tanto, mirá los productos
            </Link>
          </div>
        ) : (
          <GrillaCombos>
            {combos.map((combo) => (
              <TarjetaCombo key={combo.id} combo={combo} />
            ))}
          </GrillaCombos>
        )}
      </section>
    </>
  );
}

export default CatalogoCombos;
