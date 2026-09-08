import { Link, useLocation } from "react-router-dom";

/**
 * 404 del panel, para toda URL que empiece con `/catalogo/admin/` y no
 * matchee ninguna pantalla real.
 *
 * POR QUÉ EXISTE. El catch-all público (`path="*"`, dentro del `Layout` de la
 * tienda) atrapaba también las URLs del panel, y varias son plausibles de
 * tipear mal: `/catalogo/admin/categorias` parece la ruta de Categorías, pero
 * la real es `/catalogo/admin/configuracion/categorias`. El resultado era que
 * un error de tipeo TRABAJANDO en el panel expulsaba al catálogo público —con
 * Navbar, Footer y un único CTA "Ver todos los productos" hacia la tienda—, y
 * había que volver a entrar por la puerta de adelante.
 *
 * NO vive en `pages/admin/` como el resto de las pantallas: no es una pantalla
 * del panel, es el fallback del shell, mismo criterio que el
 * `ErrorDePantallaAdmin` de `AdminLayout.jsx`. Tampoco emite `MetaSeo`: el
 * `noindex` del panel entero ya lo pone `AdminLayout`, que es su padre.
 *
 * `role="alert"` y no un `<h1>` a secas: para un lector de pantalla, llegar a
 * una pantalla que no existe es una condición a anunciar, no contenido a leer.
 */
function NoEncontradoAdmin() {
  const { pathname } = useLocation();

  return (
    <div
      role="alert"
      className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-margin-mobile text-center"
    >
      <span className="material-symbols-outlined text-[40px] text-on-surface-variant" aria-hidden="true">
        search_off
      </span>
      <h1 className="font-headline-md text-headline-md text-on-surface">
        No encontramos esa pantalla
      </h1>
      <p className="font-body-md text-body-md text-on-surface-variant">
        La dirección <code className="break-all text-on-surface">{pathname}</code> no corresponde a
        ninguna sección del panel. Puede estar mal escrita, o la sección puede haber cambiado de
        lugar — Categorías, Etiquetas, Anuncios y Usuarios viven dentro de Configuración.
      </p>
      <Link
        to="/catalogo/admin/productos"
        className="font-label-md text-label-md inline-flex min-h-11 items-center rounded-lg bg-primary px-5 uppercase tracking-widest text-on-primary transition-opacity hover:opacity-90"
      >
        Ir a Productos
      </Link>
    </div>
  );
}

export default NoEncontradoAdmin;
