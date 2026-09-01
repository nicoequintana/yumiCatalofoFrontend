import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import FichaProducto from "../components/FichaProducto.jsx";
import EstadoVacio from "../components/EstadoVacio.jsx";
import BotonVolver from "../components/BotonVolver.jsx";
import MetaSeo from "../components/MetaSeo.jsx";
import { useVolver } from "../hooks/useVolver.js";
import { getProductById } from "../api/products.js";
import { useToast } from "../context/useToast.js";
import { parsearIdDeRuta, rutaProducto } from "../utils/slug.js";
import { jsonLdProducto, jsonLdBreadcrumb } from "../utils/jsonLd.js";
import { SITIO, urlAbsoluta } from "../constants/seo.js";

/**
 * `/producto/:idSlug` — container for the public product detail view.
 *
 * Owns only page concerns: fetching by route param, redirecting when the
 * product is gone, and the mobile back header. All of the actual product
 * markup lives in `FichaProducto`, which the admin editor renders too — so
 * the preview an admin sees while editing cannot drift from this page.
 */
/**
 * Resuelve la URL de una foto a ABSOLUTA para el `image` del JSON-LD —
 * `schema.org/Product` exige URL absoluta, igual que `og:image`.
 *
 * Espeja lo que hace `resolverImagenOg` (`backend/src/lib/ogMeta.js`) del
 * lado del servidor, pero con una pista distinta: acá el producto ya pasó
 * por `mapProducto`, que resuelve el storage de cada foto en `foto.url` y NO
 * expone `cloudinaryPublicId`/`driveFileId` (ver `products.mapper.js`) — no
 * hay flag para decidir. Una foto de Cloudinary ya es una URL absoluta (CDN);
 * una foto legado de Drive es una ruta relativa al proxy propio del backend
 * (`/api/products/:id/fotos/:fotoId`) que hay que volver absoluta. Se
 * distingue por FORMA (¿ya empieza con `http`?) en vez de por flag, que es
 * lo único que esta forma del producto deja disponible.
 */
function urlAbsolutaDeFoto(url) {
  if (/^https?:\/\//.test(url)) return url;
  const backendUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";
  return `${backendUrl}${url}`;
}

function ProductoDetalle() {
  const { idSlug } = useParams();
  // El param trae "123-nombre-del-producto": la clave real es el prefijo
  // numérico. `null` significa una URL que no nombra ningún producto — se
  // trata igual que un producto inexistente.
  const id = parsearIdDeRuta(idSlug);
  const navigate = useNavigate();
  const { mostrarToast } = useToast();
  const volver = useVolver();
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

  // Mismos dos bloques que arma `seo.controller.js` (`servirSeoProducto`)
  // del lado del servidor, con las mismas dos funciones — para que el
  // JSON-LD que ve un bot desviado por nginx y el que ve un navegador que
  // ejecuta esta SPA sean el mismo dato.
  const imagenesJsonLd = producto.fotos.map((foto) => urlAbsolutaDeFoto(foto.url));
  const bloquesJsonLd = [
    jsonLdProducto(producto, { frontendUrl: SITIO.url, imagenes: imagenesJsonLd }),
    jsonLdBreadcrumb(producto, { frontendUrl: SITIO.url }),
  ];

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

      {/* Mobile header — the one page-specific mobile-nav exception.
          `top-[var(--alto-cinta-ambiente)]`, no `top-0`: la variable la
          declara `CintaAmbiente.jsx` (ver `index.css`) y vale el alto real de
          la cinta de dev mientras existe en el DOM, `0px` en producción — el
          mismo `top-0` de antes, así que el sitio publicado no cambia. Sin
          esto la cinta (`fixed`, no empuja el layout) se pintaba encima de
          este header. */}
      <header className="sticky top-[var(--alto-cinta-ambiente)] z-40 flex w-full items-center justify-between bg-background px-margin-mobile py-4 md:hidden">
        <button type="button" className="p-2 text-on-surface" onClick={volver}>
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        {/* Título genérico, no el nombre del producto: ese ya se muestra en
            `FichaProducto`, debajo de la galería. Repetirlo acá arriba hacía
            que el nombre apareciera dos veces en mobile. */}
        <div className="font-headline-lg-mobile text-headline-lg-mobile tracking-tighter text-primary">
          Producto
        </div>
        <span className="w-10" aria-hidden="true" />
      </header>

      <main className="mx-auto w-full max-w-container-max px-margin-mobile py-8 pb-24 md:px-margin-desktop md:py-16 md:pb-16">
        <div className="mb-6 hidden md:block">
          <BotonVolver />
        </div>

        <FichaProducto producto={producto} />
      </main>
    </>
  );
}

export default ProductoDetalle;
