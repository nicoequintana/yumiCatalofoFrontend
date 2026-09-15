import { useLocation } from "react-router-dom";
import BotonWhatsapp from "./BotonWhatsapp.jsx";

/**
 * FAB de WhatsApp del catálogo público, montado UNA sola vez en
 * `Layout.jsx` (13/09/2026) en vez de que cada página pública repita su
 * propio `<BotonWhatsapp contexto={{tipo:"home"}} />` — `Catalogo.jsx` y
 * `Coleccion.jsx` lo tenían idéntico, cada uno con su propio import.
 *
 * Decide el contexto y si se muestra según la RUTA, no según qué página lo
 * monta (ya no hay una página que lo monte):
 *
 * - `/producto/*`: no se monta. La ficha ya tiene su propio CTA de WhatsApp
 *   en la barra de compra (`variant="inline"`, `FichaProducto.jsx`) y un FAB
 *   fijo encima le tapaba el botón "Agregar al carrito" — el mismo motivo por
 *   el que `NavFlotante` tampoco se monta ahí.
 * - `/combos/:idSlug`: no se monta, por el mismo motivo que la ficha —
 *   `PaginaCombo.jsx` tiene WhatsApp inline en el talón y una barra fija con
 *   "Agregar combo" que el FAB tapaba en celular (15/09/2026). El listado
 *   `/combos` (sin barra) lo sigue mostrando.
 * - `/catalogo/admin/*`: no se monta. El panel no vende nada.
 * - `/favoritos`: no se monta ACÁ, a propósito. `Favoritos.jsx` arma su
 *   mensaje con los NOMBRES de los productos favoritos que esa página ya
 *   tiene cargados (`contexto={{tipo:"favoritos", productos}}`); traer ese
 *   contexto hasta acá exigiría refetchear esos mismos productos en el
 *   Layout —duplicando el fetch y la reconciliación contra favoritos en
 *   localStorage que `Favoritos.jsx` ya hace— solo para nombrar el mensaje.
 *   Esa página sigue montando su propio `<BotonWhatsapp>`; este componente se
 *   aparta ahí para no montar dos FABs a la vez.
 * - Cualquier otra ruta pública: contexto genérico `{tipo:"home"}`, igual al
 *   que tenían `Catalogo.jsx` y `Coleccion.jsx`.
 *
 * El offset que lo levanta por encima de la isla flotante (`NavFlotante.jsx`)
 * en mobile vive en el propio `BotonWhatsapp.jsx` (variante `fab`): todo
 * consumidor de esa variante convive con la isla en algún momento (público,
 * bajo `Layout`), así que el offset es el default de la variante y no algo
 * que este componente tenga que pasar por `className`.
 */
function BotonWhatsappFlotante() {
  const { pathname } = useLocation();

  if (pathname.startsWith("/catalogo/admin")) return null;
  if (pathname.startsWith("/producto/")) return null;
  if (pathname.startsWith("/combos/")) return null;
  if (pathname === "/favoritos") return null;

  return <BotonWhatsapp contexto={{ tipo: "home" }} />;
}

export default BotonWhatsappFlotante;
