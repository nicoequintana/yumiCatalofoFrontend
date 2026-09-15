import { Link } from "react-router-dom";
import EstadoVacio from "../components/EstadoVacio.jsx";
import TarjetaCombo from "../components/TarjetaCombo.jsx";
import MetaSeo from "../components/MetaSeo.jsx";
import useCombosCatalogo from "../hooks/useCombosCatalogo.js";
import { urlAbsoluta } from "../constants/seo.js";

/** `/combos` — catálogo de combos, spec §7.4. Grilla doble; vacío y error
 * son DOS estados distintos y NUNCA se confunden: el vacío promete "muy
 * pronto", y afirmar eso ante un error de carga sería mentirle a quien tuvo
 * un problema de conexión. */
function CatalogoCombos() {
  const { combos, cargando, error } = useCombosCatalogo();

  return (
    <>
      <MetaSeo
        titulo="Combos — YIMA"
        descripcion="Conjuntos de productos con un descuento que se aplica solo si los llevás juntos."
        canonical={urlAbsoluta("/combos")}
      />
      <section className="mx-auto w-full max-w-container-max px-margin-mobile py-12 md:px-margin-desktop md:py-16">
        <h1 className="mb-8 font-headline-lg text-headline-lg text-primary">Combos</h1>

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
          <div className="grid grid-cols-1 auto-rows-fr gap-5 md:grid-cols-2">
            {combos.map((combo) => (
              <TarjetaCombo key={combo.id} combo={combo} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

export default CatalogoCombos;
