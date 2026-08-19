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
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;

    getProducts({})
      .then((data) => {
        if (activo) setProductos(data);
      })
      .catch(() => {
        // Soft feature — el bento ya se oculta si no hay al menos 4
        // destacados, así que ante un fetch fallido preferimos degradar a
        // lista vacía (bento oculto) antes que romper la página o quedar
        // colgados en estado de carga.
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, []);

  return { productos, cargando };
}

export default useDestacados;
