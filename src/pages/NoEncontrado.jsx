import { Link } from "react-router-dom";
import MetaSeo from "../components/MetaSeo.jsx";
import { urlAbsoluta } from "../constants/seo.js";

/**
 * Página de "no encontrado" para cualquier ruta que no matchea.
 *
 * Antes la ruta `*` era un `<Navigate to="/" replace />`, y eso hacía que toda
 * URL inventada respondiera 200 con la home: un soft 404. Google indexa esas
 * URLs como páginas reales y diluye la autoridad del dominio.
 *
 * Nginx sirve `index.html` con 200 para cualquier ruta —es una SPA, no hay
 * forma de que devuelva un 404 HTTP acá—, así que el `noindex` es lo que
 * efectivamente le dice a Google que la descarte. Un producto inexistente NO
 * cae acá: eso sigue redirigiendo a `/` con un toast (decisión de producto
 * documentada en CLAUDE.md), y su 404 real lo emite el HTML server-side de
 * `/og/producto/:idSlug`, que es lo que ve el crawler.
 */
function NoEncontrado() {
  return (
    <>
      <MetaSeo
        titulo="Página no encontrada — YIMA"
        descripcion="El contenido que buscás no está disponible."
        canonical={urlAbsoluta("/")}
        noindex
      />
      <div className="mx-auto flex max-w-container-max flex-col items-center px-margin-mobile py-16 text-center lg:px-margin-desktop">
        <span className="material-symbols-outlined mb-4 text-[48px] text-on-surface-variant">
          search_off
        </span>
        <h1 className="font-headline-lg text-headline-lg-mobile lg:text-headline-lg mb-3 text-on-background">
          No encontramos esta página
        </h1>
        <p className="font-body-md text-body-md mb-8 max-w-prose text-on-surface-variant">
          Puede que el link esté mal escrito o que el contenido ya no exista.
        </p>
        <Link
          to="/coleccion"
          className="font-label-md text-label-md rounded-full bg-primary px-6 py-3 uppercase tracking-wide text-on-primary"
        >
          Ver todos los productos
        </Link>
      </div>
    </>
  );
}

export default NoEncontrado;
