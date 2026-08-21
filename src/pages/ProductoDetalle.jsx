import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import FichaProducto from "../components/FichaProducto.jsx";
import EstadoVacio from "../components/EstadoVacio.jsx";
import BotonVolver from "../components/BotonVolver.jsx";
import { useVolver } from "../hooks/useVolver.js";
import { getProductById } from "../api/products.js";
import { useToast } from "../context/ToastContext.jsx";

/**
 * `/producto/:id` — container for the public product detail view.
 *
 * Owns only page concerns: fetching by route param, redirecting when the
 * product is gone, and the mobile back header. All of the actual product
 * markup lives in `FichaProducto`, which the admin editor renders too — so
 * the preview an admin sees while editing cannot drift from this page.
 */
function ProductoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { mostrarToast } = useToast();
  const volver = useVolver();
  const [producto, setProducto] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setErrorCarga(null);

    getProductById(id)
      .then((data) => {
        if (!activo) return;

        // Producto inexistente, eliminado, oculto o sin stock (el backend ya
        // excluye estos casos del catálogo público) — en vez de mostrar una
        // página "no encontrado" en un link roto, mandamos al usuario de
        // vuelta al catálogo con un aviso, así puede seguir navegando.
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

  return (
    <>
      {/* Mobile header — the one page-specific mobile-nav exception. */}
      <header className="sticky top-0 z-40 flex w-full items-center justify-between bg-background px-margin-mobile py-4 md:hidden">
        <button type="button" className="p-2 text-on-surface" onClick={volver}>
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="font-headline-lg-mobile text-headline-lg-mobile tracking-tighter text-primary">
          {producto.nombre}
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
