import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Deja cada página arrancando arriba de todo.
 *
 * **Existe porque la app no controlaba el scroll en absoluto**, y que hasta
 * ahora funcionara era un accidente: al navegar, React desmonta la página
 * vieja, el documento se achica y el navegador *clampea* el scroll a 0 solo.
 * En un celular real eso no alcanza — el navegador restaura la posición de
 * scroll de la visita anterior por su cuenta, y la página abre corrida hacia
 * abajo, sin la cinta de anuncios ni el encabezado a la vista (reportado el
 * 02/09/2026). El síntoma se agrava con listados largos, así que "Mostrar
 * más" lo empeoraba.
 *
 * Son DOS mitades y hacen falta las dos:
 *
 * 1. **`history.scrollRestoration = "manual"`** le saca al navegador la
 *    restauración automática. Sin esto, el navegador reposiciona DESPUÉS de
 *    que React montó y pisa cualquier scroll que hagamos nosotros — o sea, el
 *    punto 2 solo no arregla nada en el caso que motivó este componente.
 * 2. **`scrollTo(0, 0)` en cada cambio de `pathname`.**
 *
 * **Escucha `pathname`, NUNCA la querystring**, y esa distinción es de
 * producto: "Mostrar más" (`?paginas=`), los filtros y la búsqueda escriben
 * en la query sin cambiar de página. Saltar al tope ahí le arrancaría la
 * vista de las manos a quien acaba de pedir más productos — justo lo
 * contrario de lo que este componente busca.
 *
 * `useLayoutEffect` y no `useEffect`: reposiciona antes de que el navegador
 * pinte, así no se ve el salto desde la posición vieja.
 */
function ScrollAlTope() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    // `scrollRestoration` no existe en todos los navegadores y su setter puede
    // lanzar en entornos que lo exponen de solo lectura: no puede tumbar el
    // render de la app entera por una mejora de scroll.
    try {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "manual";
      }
    } catch {
      // Sin control manual, el punto 2 sigue haciendo lo suyo.
    }

    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export default ScrollAlTope;
