import { useEffect, useState } from "react";
import { getCategorias } from "../api/categorias.js";

/**
 * Las categorías que el navbar ofrece.
 *
 * PATRÓN MODULE-LEVEL, como `useContextoComercial`: un valor cacheado a nivel de
 * módulo, un set de listeners y una única promesa en vuelo. Los consumidores son
 * dos —el dropdown de escritorio y la hoja del menú móvil— y preguntan lo mismo;
 * un fetch por instancia serían dos requests idénticas por carga de página.
 *
 * ⚠️ **FILTRA POR `cantidadPublicados`, NUNCA POR `cantidadProductos`.** El
 * segundo cuenta TODOS los productos —ocultos y agotados incluidos— y lo usa el
 * panel para el guard de borrado. Ofrecer una categoría cuyos productos están
 * todos ocultos manda al visitante a una grilla vacía: hoy en producción "Art.
 * Hogar" y "Tech" están justo en ese caso.
 *
 * Falla BLANDA y sin reintento, igual que la cinta de anuncios: sin categorías
 * el navbar sigue llevando a `/coleccion`, que es lo que hacía antes.
 */

let categoriasActuales = [];
let resueltoActual = false;
let promesaEnVuelo = null;
const listeners = new Set();

function notificar(categorias) {
  categoriasActuales = categorias;
  resueltoActual = true;
  listeners.forEach((listener) => listener({ categorias, resuelto: true }));
}

function cargar() {
  if (promesaEnVuelo) return promesaEnVuelo;

  promesaEnVuelo = getCategorias()
    .then((datos) => {
      const publicadas = (datos ?? [])
        .filter((categoria) => (categoria.cantidadPublicados ?? 0) > 0)
        // De mayor a menor: la categoría con más para mostrar va primero.
        // Desempata el nombre, para que dos con la misma cantidad no cambien de
        // orden entre dos cargas.
        .sort(
          (a, b) =>
            b.cantidadPublicados - a.cantidadPublicados || a.nombre.localeCompare(b.nombre, "es"),
        );
      notificar(publicadas);
    })
    .catch(() => {
      notificar([]);
    });

  return promesaEnVuelo;
}

export default function useCategoriasNavbar() {
  const [estado, setEstado] = useState({
    categorias: categoriasActuales,
    resuelto: resueltoActual,
  });

  useEffect(() => {
    listeners.add(setEstado);

    // Si el valor llegó mientras este componente no estaba montado, se toma del
    // cache: la notificación no vuelve a pasar.
    if (resueltoActual && !estado.resuelto) {
      setEstado({ categorias: categoriasActuales, resuelto: true });
    }

    cargar();

    return () => {
      listeners.delete(setEstado);
    };
    // Solo al montar, mismo criterio que `useContextoComercial`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return estado;
}

/** Vuelve el módulo a cero. **Helper de tests**, como `reiniciarContextoComercial`. */
export function reiniciarCategoriasNavbar() {
  categoriasActuales = [];
  resueltoActual = false;
  promesaEnVuelo = null;
  listeners.clear();
}
