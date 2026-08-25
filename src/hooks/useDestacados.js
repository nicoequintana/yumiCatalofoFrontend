import { useEffect, useState } from "react";
import { getProducts } from "../api/products.js";

/**
 * Cuántos destacados se piden al backend.
 *
 * Es el techo del carrusel, no su medida exacta: cuantos más destacados haya,
 * más largo es el recorrido antes de repetirse. Está separado de
 * `MIN_DESTACADOS` a propósito — antes una sola constante (`SLOTS_BENTO = 4`)
 * hacía las dos cosas, así que pedir más productos para el carrusel habría
 * bajado también el umbral de visibilidad sin que nadie lo notara.
 */
const MAX_DESTACADOS = 12;

/**
 * Mínimo para mostrar la sección de destacados. Por debajo de esto el
 * carrusel se oculta entero: un carrusel de dos productos no tiene suficiente
 * contenido para justificar el movimiento y se lee como un error.
 */
export const MIN_DESTACADOS = 4;

/**
 * Trae los productos destacados que alimentan el carrusel de la home y de
 * `/coleccion`.
 *
 * Los pide filtrados en el backend (`destacado=1`) y acotados a
 * `MAX_DESTACADOS`. Antes se bajaba el catálogo completo y filtraba del lado
 * del cliente: con el listado paginado eso ya no puede funcionar, porque un
 * destacado puede caer en cualquier página y la sección se vaciaría sola.
 *
 * Vive separado del fetch reactivo a filtros de `Coleccion.jsx` a propósito:
 * es una vidriera fija que muestra siempre los destacados globales, no los
 * que coinciden con el filtro activo del grid (design doc
 * 2026-08-19-separacion-home-coleccion). Por eso `/coleccion` hace dos
 * llamadas con params distintos en vez de reusar una sola respuesta.
 */
function useDestacados() {
  const [productos, setProductos] = useState([]);

  useEffect(() => {
    let activo = true;

    getProducts({ destacado: true, pageSize: MAX_DESTACADOS })
      .then(({ data }) => {
        if (activo) setProductos(data);
      })
      .catch(() => {
        // Soft feature — la sección ya se oculta si no llega a
        // `MIN_DESTACADOS`, así que ante un fetch fallido preferimos degradar
        // a lista vacía (sección oculta) antes que romper la página.
        //
        // No hay estado de carga: ningún consumidor lo usaba (ambos
        // desestructuran solo `productos`) porque la sección no muestra
        // esqueleto — o hay destacados suficientes o no existe, así que un
        // flag de carga no cambiaba nada de lo que se renderiza.
      });

    return () => {
      activo = false;
    };
  }, []);

  return { productos };
}

export default useDestacados;
