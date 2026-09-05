import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import FichaProducto from "../components/FichaProducto.jsx";
import EstadoVacio from "../components/EstadoVacio.jsx";
import BotonVolver from "../components/BotonVolver.jsx";
import MetaSeo from "../components/MetaSeo.jsx";
import { getProductById } from "../api/products.js";
import { useToast } from "../context/useToast.js";
import { parsearIdDeRuta, rutaProducto } from "../utils/slug.js";
import { urlAbsoluta } from "../constants/seo.js";

/**
 * `/producto/:idSlug` — container for the public product detail view.
 *
 * Owns only page concerns: fetching by route param, redirecting when the
 * product is gone, and the back link. All of the actual product markup lives
 * in `FichaProducto`, which the admin editor renders too — so the preview an
 * admin sees while editing cannot drift from this page.
 */
function ProductoDetalle() {
  const { idSlug } = useParams();
  // El param trae "123-nombre-del-producto": la clave real es el prefijo
  // numérico. `null` significa una URL que no nombra ningún producto — se
  // trata igual que un producto inexistente.
  const id = parsearIdDeRuta(idSlug);
  const navigate = useNavigate();
  const { mostrarToast } = useToast();
  const [producto, setProducto] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);

  useEffect(() => {
    if (id === null) {
      navigate("/", { replace: true });
      return undefined;
    }

    let activo = true;
    setCargando(true);
    setErrorCarga(null);

    getProductById(id)
      .then((data) => {
        if (!activo) return;

        // Producto inexistente, eliminado u oculto (`visibleEnCatalogo:
        // false`) — los únicos casos en que el backend responde 404 y `data`
        // llega vacío. Un producto SIN STOCK no cae acá: el detalle devuelve
        // 200 a propósito (un link compartido a un producto agotado no se
        // rompe) y la ficha se muestra con el badge "Agotado" y el CTA
        // deshabilitado. En vez de una página "no encontrado" en un link
        // roto, mandamos al usuario de vuelta al catálogo con un aviso, así
        // puede seguir navegando.
        if (!data) {
          navigate("/", { replace: true });
          mostrarToast("Este producto ya no está disponible.", { tipo: "error" });
          return;
        }

        setProducto(data);
        setCargando(false);
      })
      // Sin este catch, un backend caído deja la promesa rechazada sin manejar
      // y el spinner girando para siempre. No se redirige al catálogo: eso es
      // la respuesta a "este producto ya no existe", y acá no sabemos nada del
      // producto — lo que falló es la conexión.
      .catch(() => {
        if (!activo) return;
        setErrorCarga("Revisá tu conexión e intentá de nuevo.");
        setCargando(false);
      });

    return () => {
      activo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (cargando) {
    return <EstadoVacio icono="hourglass_empty" mensaje="Cargando producto…" />;
  }

  if (errorCarga) {
    return (
      <EstadoVacio icono="cloud_off" titulo="No pudimos cargar el producto" mensaje={errorCarga} />
    );
  }

  if (!producto) {
    return (
      <EstadoVacio
        icono="search_off"
        titulo="Producto no encontrado"
        mensaje="El producto que buscás no existe o fue eliminado."
      />
    );
  }

  // Los bloques JSON-LD viajan EN la respuesta del detalle: los arma el
  // backend con las MISMAS funciones y la MISMA URL con que arma el HTML de
  // crawler, así el dato que ve un bot desviado por nginx y el que ve un
  // navegador ejecutando esta SPA no pueden divergir. Antes se construían acá
  // con `utils/jsonLd.js`, un espejo manual de `lib/jsonLd.js` del backend que
  // había que mantener sincronizado a mano. `?? []` cubre una respuesta vieja
  // cacheada sin el campo: la ficha se ve igual, solo sin datos estructurados.
  const bloquesJsonLd = producto.jsonLd ?? [];

  return (
    <>
      <MetaSeo
        titulo={`${producto.nombre} — YIMA`}
        descripcion={producto.fraseComercial ?? producto.descripcion ?? ""}
        canonical={urlAbsoluta(rutaProducto(producto))}
        imagen={producto.fotos[0]?.url}
        tipoOg="product"
        jsonLd={bloquesJsonLd}
      />

      {/* Esta pantalla NO tiene encabezado propio: el que manda es el `Navbar`
          público, en móvil y en escritorio. Hubo uno acá —una barra sticky con
          una flecha y la palabra "Producto"— y se retiró el 05/09/2026: era una
          SEGUNDA barra pegada al tope con el mismo `top` que la del sitio, así
          que al scrollear se metían una debajo de la otra, y su título genérico
          no decía nada que el nombre del producto no dijera mejor unos píxeles
          más abajo.

          Lo único que hacía falta rescatar de ahí era el "volver", y para eso
          ya existe `BotonVolver` — el mismo control en los dos breakpoints, en
          flujo con el contenido en vez de pegado al borde. */}
      <main className="mx-auto w-full max-w-container-max px-margin-mobile py-6 pb-24 md:px-margin-desktop md:py-16 md:pb-16">
        <div className="mb-4 md:mb-6">
          <BotonVolver />
        </div>

        <FichaProducto producto={producto} />
      </main>
    </>
  );
}

export default ProductoDetalle;
