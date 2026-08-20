import { useEffect, useState } from "react";
import { getProducts } from "../api/products.js";

/**
 * Trae la lista completa de productos sin filtros, para alimentar el bento
 * de destacados (`BentoDestacados` filtra client-side por `destacado: true`).
 *
 * Vive separado del fetch reactivo a filtros de `Coleccion.jsx` a propósito:
 * el bento es una vidriera fija que muestra siempre los destacados globales,
 * no los que coinciden con el filtro activo del grid (design doc
 * 2026-08-19-separacion-home-coleccion). Por eso `/coleccion` hace dos
 * llamadas con params distintos en vez de reusar una sola respuesta.
 */
function useDestacados() {
  const [productos, setProductos] = useState([]);

  useEffect(() => {
    let activo = true;

    getProducts({})
      .then((data) => {
        if (activo) setProductos(data);
      })
      .catch(() => {
        // Soft feature — el bento ya se oculta si no hay al menos 4
        // destacados, así que ante un fetch fallido preferimos degradar a
        // lista vacía (bento oculto) antes que romper la página.
        //
        // No hay estado de carga: ningún consumidor lo usaba (ambos
        // desestructuran solo `productos`) porque el bento no muestra
        // esqueleto — o hay 4 destacados o la sección no existe, así que un
        // flag de carga no cambiaba nada de lo que se renderiza.
      });

    return () => {
      activo = false;
    };
  }, []);

  return { productos };
}

export default useDestacados;
