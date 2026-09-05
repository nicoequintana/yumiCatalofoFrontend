import { useEffect, useState } from "react";
import { getCategorias } from "../api/categorias.js";

/**
 * El cache CRUDO de `GET /categorias`, compartido por TODO consumidor público:
 * el dropdown de escritorio y la hoja del menú móvil (vía `useCategoriasNavbar`,
 * abajo) y la sección de categorías destacadas de la home
 * (`useCategoriasDestacadas`, que importa `useCategoriasCrudas` de este mismo
 * archivo). Mismo endpoint, mismo payload — lo único que cambia entre
 * consumidores es el FILTRO: `cantidadPublicados` acá, `destacadaEnHome` allá.
 * Antes cada uno tenía su propio fetch y la home pedía la lista dos veces por
 * carga.
 *
 * PATRÓN MODULE-LEVEL, como `useContextoComercial`: un valor cacheado a nivel de
 * módulo, un set de listeners y una única promesa en vuelo.
 *
 * Falla BLANDA y sin reintento, igual que la cinta de anuncios: sin categorías
 * el navbar sigue llevando a `/coleccion`, que es lo que hacía antes.
 */

let categoriasCrudas = [];
let resueltoActual = false;
let promesaEnVuelo = null;
const listeners = new Set();

function notificar(categorias) {
  categoriasCrudas = categorias;
  resueltoActual = true;
  listeners.forEach((listener) => listener({ categorias, resuelto: true }));
}

function cargar() {
  if (promesaEnVuelo) return promesaEnVuelo;

  promesaEnVuelo = getCategorias()
    .then((datos) => notificar(datos ?? []))
    .catch(() => notificar([]));

  return promesaEnVuelo;
}

/**
 * El cache crudo, sin filtrar. `activo` decide si ESTE montaje dispara la
 * carga: `Navbar` lo apaga en las rutas de admin, donde el dropdown de
 * categorías nunca se abre y la request no hace falta — antes se pedía en
 * cada página pública Y en el login del panel, porque el hook se invocaba
 * antes del guard `esAdmin`.
 */
export function useCategoriasCrudas({ activo = true } = {}) {
  const [estado, setEstado] = useState({
    categorias: categoriasCrudas,
    resuelto: resueltoActual,
  });

  useEffect(() => {
    listeners.add(setEstado);

    // Si el valor llegó mientras este componente no estaba montado, se toma del
    // cache: la notificación no vuelve a pasar.
    if (resueltoActual && !estado.resuelto) {
      setEstado({ categorias: categoriasCrudas, resuelto: true });
    }

    if (activo) cargar();

    return () => {
      listeners.delete(setEstado);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo]);

  return estado;
}

/**
 * Las categorías que el navbar y la hoja del menú ofrecen: el cache crudo,
 * filtrado por `cantidadPublicados` — NUNCA por `cantidadProductos`. El
 * segundo cuenta TODOS los productos —ocultos y agotados incluidos— y lo usa
 * el panel para el guard de borrado. Ofrecer una categoría cuyos productos
 * están todos ocultos manda al visitante a una grilla vacía: hoy en
 * producción "Art. Hogar" y "Tech" están justo en ese caso.
 */
export default function useCategoriasNavbar(opciones) {
  const { categorias, resuelto } = useCategoriasCrudas(opciones);

  const publicadas = categorias
    .filter((categoria) => (categoria.cantidadPublicados ?? 0) > 0)
    // De mayor a menor: la categoría con más para mostrar va primero.
    // Desempata el nombre, para que dos con la misma cantidad no cambien de
    // orden entre dos cargas.
    .sort(
      (a, b) => b.cantidadPublicados - a.cantidadPublicados || a.nombre.localeCompare(b.nombre, "es"),
    );

  return { categorias: publicadas, resuelto };
}

/** Vuelve el módulo a cero. **Helper de tests**, como `reiniciarContextoComercial`. */
export function reiniciarCategoriasNavbar() {
  categoriasCrudas = [];
  resueltoActual = false;
  promesaEnVuelo = null;
  listeners.clear();
}
