import useFavoritos from "../hooks/useFavoritos.js";
// La incantación del pseudo-elemento vivía acá y se mudó a `utils/areaTactil.js`
// el 07/09/2026, cuando la auditoría de área efectiva le encontró una veintena
// de consumidores más entre el público y el panel. El motivo por el que este
// control la usa sigue siendo el mismo, y está anotado abajo.
import { AREA_TACTIL } from "../utils/areaTactil.js";

/**
 * Heart toggle for a product — outline when not favorited, filled when it
 * is. Used by ProductCard (where it is a SIBLING of the card's <Link>, never
 * a child: un <button> dentro de un <a> es HTML inválido y ensucia el nombre
 * accesible del enlace) and by the product detail page. `event.stopPropagation()`
 * + `preventDefault()` se conservan igual: el corazón se superpone al enlace y
 * un click sobre él no tiene que navegar.
 *
 * `circular` es la variante del bloque de compra de la ficha (13/09/2026): un
 * círculo de 36px con borde y el corazón solo, del mismo alto que el selector
 * y el botón de agregar compactos. Reemplazó a la píldora "Guardar"/"Guardado",
 * que bajaba a un segundo renglón. Sin `circular` es el corazón suelto de
 * `ProductCard`.
 */
function BotonFavorito({ productoId, className = "", circular = false }) {
  const { esFavorito, toggleFavorito } = useFavoritos();
  const favorito = esFavorito(productoId);

  function handleClick(event) {
    event.preventDefault();
    event.stopPropagation();
    toggleFavorito(productoId);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={favorito ? "Quitar de favoritos" : "Agregar a favoritos"}
      aria-pressed={favorito}
      // Medido en navegador: el corazón sin texto daba **34×34** (`p-1.5`
      // sobre un glifo de 22px) y con texto **40 de alto**. Agrandar el padding
      // era la salida evidente y rompía el diseño: sobre una tarjeta de ~190px
      // de ancho, el disco claro del corazón pasaba de 34 a 44px y se comía la
      // foto del producto. El pseudo-elemento crece el blanco de click y deja
      // el dibujo donde estaba.
      // Las dos variantes estiran el área a 44×44 con `before:w-11`: el
      // círculo mide 36 y el corazón suelto 34, los dos más angostos que 44.
      className={`inline-flex items-center justify-center text-on-surface-variant ${AREA_TACTIL} before:w-11 ${
        circular
          ? "h-9 w-9 rounded-full border border-outline-variant bg-surface-container-lowest transition-colors hover:bg-surface-container"
          : "p-1.5"
      } ${className}`}
    >
      <span
        aria-hidden="true"
        className={`material-symbols-outlined ${circular ? "text-[20px]" : "text-[22px]"} ${favorito ? "text-error" : ""}`}
        style={favorito ? { fontVariationSettings: "'FILL' 1" } : undefined}
      >
        favorite
      </span>
    </button>
  );
}

export default BotonFavorito;
