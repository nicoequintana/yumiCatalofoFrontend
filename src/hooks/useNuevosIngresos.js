import { useEffect, useState } from "react";
import { getProducts } from "../api/products.js";

/** Cuántos nuevos ingresos se piden: dos filas de la grilla de escritorio. */
const NUEVOS_POR_SECCION = 8;

/**
 * Los últimos productos publicados (`orden: "recientes"`, el mismo criterio
 * del listado — sin backend nuevo). El badge NUEVO no se decide acá: lo pinta
 * `ProductCard` con el `esNuevo` que resuelve el backend.
 *
 * Falla blando, como `useDestacados`: una sección de novedades ausente no le
 * afirma nada falso al visitante. `resuelto` pasa a `true` también cuando
 * falla (loader de la home).
 */
function useNuevosIngresos() {
  const [productos, setProductos] = useState([]);
  const [resuelto, setResuelto] = useState(false);

  useEffect(() => {
    let activo = true;

    getProducts({ orden: "recientes", pageSize: NUEVOS_POR_SECCION })
      .then(({ data }) => {
        if (activo) setProductos(data ?? []);
      })
      .catch(() => {
        if (activo) setProductos([]);
      })
      .finally(() => {
        if (activo) setResuelto(true);
      });

    return () => {
      activo = false;
    };
  }, []);

  return { productos, resuelto };
}

export default useNuevosIngresos;
