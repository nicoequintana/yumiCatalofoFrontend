import { useEffect, useState } from "react";
import { getCategorias } from "../api/categorias.js";
import { rutaCategoria } from "../utils/slug.js";

/**
 * Cuántas categorías muestra la home. Espejo manual de `MAX_CATEGORIAS_HOME`
 * en `backend/src/controllers/categorias.controller.js`, que es donde el tope
 * se aplica de verdad (responde 400 al marcar una cuarta). Acá es sólo una
 * red: si alguna vez llegaran más —una escritura a mano en la base, un backend
 * viejo— la home muestra las primeras en vez de crecer sola.
 *
 * Sync manual entre repos, mismo criterio que `botDetector.js` ↔ `nginx.conf`.
 */
export const MAX_CATEGORIAS_HOME = 3;

/**
 * Las categorías que alimentan las cards de "Explorá por categoría" en la home.
 *
 * **Las elige una persona desde el panel, no un cálculo.** Hasta el 29/08/2026
 * el hook rankeaba solo por cantidad de productos publicados y las fotos salían
 * de un mapa estático en el bundle; ese mapa se desincronizaba en silencio
 * (renombrar una categoría le cambiaba el slug y su foto desaparecía). Ahora
 * `destacadaEnHome` y la foto vienen de la base, editables en Configuración ›
 * Categorías.
 *
 * Se descartan las categorías sin ruta posible (`rutaCategoria` devuelve `null`
 * cuando el nombre no produce ningún slug — sólo símbolos, o vacío): una card
 * cuyo botón no puede navegar a ningún lado es peor que no mostrar la card.
 */
function useCategoriasDestacadas() {
  const [categorias, setCategorias] = useState([]);

  useEffect(() => {
    let activo = true;

    getCategorias()
      .then((data) => {
        if (!activo) return;

        const elegidas = data
          .filter((categoria) => categoria.destacadaEnHome && rutaCategoria(categoria))
          .sort(
            (a, b) =>
              // Desempate por nombre, mismo criterio que el desempate por `id`
              // de los listados del backend: `ordenHome` lo reescribe entera la
              // operación de reordenar, así que no se asume sin repetidos, y
              // sin desempate dos categorías empatadas alternarían de posición
              // entre cargas sin ningún motivo.
              (a.ordenHome ?? 0) - (b.ordenHome ?? 0) || a.nombre.localeCompare(b.nombre, "es"),
          )
          .slice(0, MAX_CATEGORIAS_HOME);

        setCategorias(elegidas);
      })
      .catch(() => {
        // Falla blanda, mismo criterio que `useDestacados`: la sección se
        // oculta sola cuando la lista queda vacía. Un cartel de error por una
        // sección de descubrimiento sería más ruidoso que su ausencia, y la
        // home sigue teniendo hero, carrusel y manifiesto.
      });

    return () => {
      activo = false;
    };
  }, []);

  return { categorias };
}

export default useCategoriasDestacadas;
