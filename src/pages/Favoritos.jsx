import { useEffect, useState } from "react";
import ProductCard from "../components/ProductCard.jsx";
import EstadoVacio from "../components/EstadoVacio.jsx";
import BotonVolver from "../components/BotonVolver.jsx";
import BotonWhatsapp from "../components/BotonWhatsapp.jsx";
import useFavoritos from "../hooks/useFavoritos.js";
import { getProductsByIds } from "../api/products.js";

/**
 * `/favoritos` — every product currently saved as a favorite (design item:
 * Feature 4 of the 6-feature batch). Reuses Coleccion.jsx's fetch/grid
 * pattern, just pre-filtered against the ids in localStorage.
 *
 * If a favorited id no longer matches any real product (e.g. the admin
 * deleted it), it's silently dropped from the displayed list AND cleaned
 * out of localStorage — no "unavailable" placeholder, per the finalized
 * design decision.
 */
function Favoritos() {
  const { favoritos, establecerFavoritos } = useFavoritos();
  // Productos traídos al montar, para los ids que estaban en favoritos en ese
  // momento. La grilla que se muestra se deriva de esto + el estado `favoritos`
  // en vivo en cada render (ver abajo), no de un snapshot ya filtrado: guardar
  // el filtrado dejaría una card visible después de sacarla de favoritos desde
  // esta misma página.
  const [productosGuardados, setProductosGuardados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);

  useEffect(() => {
    let activo = true;

    getProductsByIds(favoritos)
      .then((data) => {
        if (!activo) return;

        const idsExistentes = new Set(data.map((p) => p.id));

        // Limpieza silenciosa de ids obsoletos (decisión de diseño cerrada).
        //
        // Pedir por `ids` NO cambia el significado de esta reconciliación: el
        // backend compone `ids` con las mismas guardas públicas que ya aplicaba
        // al listado completo, así que "vino en la respuesta" sigue queriendo
        // decir exactamente lo mismo que antes. Se pide un subconjunto de lo
        // que antes se pedía entero, y de ese subconjunto solo se conserva lo
        // que el backend confirmó.
        //
        // Un fallo de red no llega hasta acá (lo atrapa el `.catch` de abajo),
        // así que una caída del backend nunca puede vaciar los favoritos.
        const favoritosLimpios = favoritos.filter((id) => idsExistentes.has(id));
        if (favoritosLimpios.length !== favoritos.length) {
          establecerFavoritos(favoritosLimpios);
        }

        setProductosGuardados(data);
        setCargando(false);
      })
      // Sin este catch, un backend caído deja la promesa rechazada sin manejar
      // y el spinner girando para siempre. Además, sin productos la grilla
      // quedaría vacía y se leería como "no guardaste nada", que es mentira:
      // los favoritos siguen ahí, lo que falló es la conexión.
      .catch(() => {
        if (!activo) return;
        setErrorCarga("Revisá tu conexión e intentá de nuevo.");
        setCargando(false);
      });

    return () => {
      activo = false;
    };
    // Corre una sola vez al montar — lee `favoritos` por closure en ese
    // momento. NO debe re-ejecutarse ante cada cambio de `favoritos` (pasa en
    // cada toggle, incluida la propia limpieza de arriba): sería un bucle de
    // refetch. Por eso, a diferencia de `Carrito.jsx`, acá los ids se congelan
    // al montar en vez de ser la clave del efecto.
  }, []);

  const productos = productosGuardados.filter((p) => favoritos.includes(p.id));

  return (
    <section className="mx-auto w-full max-w-container-max px-margin-mobile py-16 md:px-margin-desktop md:py-24">
      <div className="mb-6">
        <BotonVolver />
      </div>

      <div className="mb-16 flex flex-col items-center">
        <span className="font-label-sm text-label-sm mb-4 uppercase tracking-[0.2em] text-secondary">
          Tu selección
        </span>
        <h2 className="font-headline-lg text-headline-lg text-primary md:text-[40px]">Favoritos</h2>
      </div>

      {cargando ? (
        <EstadoVacio icono="hourglass_empty" mensaje="Cargando favoritos…" />
      ) : errorCarga ? (
        <EstadoVacio
          icono="cloud_off"
          titulo="No pudimos cargar tus favoritos"
          mensaje={errorCarga}
        />
      ) : productos.length === 0 ? (
        <EstadoVacio
          icono="favorite_border"
          titulo="Todavía no guardaste favoritos"
          mensaje="Tocá el corazón en cualquier producto para guardarlo acá."
        />
      ) : (
        <div className="grid grid-cols-1 gap-gutter md:grid-cols-12">
          {productos.map((producto) => (
            <div key={producto.id} className="col-span-1 md:col-span-6 lg:col-span-4">
              <ProductCard producto={producto} variant="vertical" />
            </div>
          ))}
        </div>
      )}

      <BotonWhatsapp contexto={{ tipo: "favoritos", productos }} />
    </section>
  );
}

export default Favoritos;
