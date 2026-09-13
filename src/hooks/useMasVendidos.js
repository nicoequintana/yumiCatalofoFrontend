import { useEffect, useState } from "react";
import { getProductosMasVendidos } from "../api/products.js";
import { MENSAJE_ERROR_CARGA } from "./useOfertas.js";

/** Cuántos más vendidos se piden: dos filas de la grilla de 4 columnas. */
const MAS_VENDIDOS_POR_SECCION = 8;

/**
 * Mínimo para mostrar "Más vendidos". Con menos, la grilla de 4 columnas no
 * llena una fila y se lee como un error. Mismo valor que `MIN_DESTACADOS`, pero
 * otra pregunta: no se comparte la constante.
 */
export const MIN_MAS_VENDIDOS = 4;

/**
 * Los productos más vendidos (ranking del backend, T3).
 *
 * Contrato de error COMPLETO, como `useOfertas` y no como `useDestacados`: el
 * spec pide que la sección distinga "falló la carga" de "no hay suficientes".
 * `resuelto` pasa a `true` también cuando falla (loader de la home).
 */
export default function useMasVendidos() {
  const [productos, setProductos] = useState([]);
  const [error, setError] = useState(null);
  const [resuelto, setResuelto] = useState(false);

  useEffect(() => {
    let activo = true;

    getProductosMasVendidos({ pageSize: MAS_VENDIDOS_POR_SECCION })
      .then(({ data }) => {
        if (!activo) return;
        setProductos(data ?? []);
        setError(null);
        setResuelto(true);
      })
      .catch(() => {
        if (!activo) return;
        setProductos([]);
        setError(MENSAJE_ERROR_CARGA);
        setResuelto(true);
      });

    return () => {
      activo = false;
    };
  }, []);

  return { productos, error, resuelto };
}
