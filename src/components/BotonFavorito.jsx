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
 * `textoGuardar` is optional label text shown next to the icon (e.g.
 * "Guardar" in the ProductoDetalle hero's outline button) — omitted, it
 * stays the icon-only toggle used everywhere else (ProductCard, etc.).
 */
function BotonFavorito({ productoId, className = "", textoGuardar }) {
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
      className={`inline-flex items-center justify-center gap-2 text-on-surface-variant ${AREA_TACTIL} ${
        // Con texto el ancho ya sobra: solo hace falta estirar el ALTO, y el
        // pseudo copia el ancho del botón para no invadir lo que tenga al lado.
        textoGuardar ? "h-10 px-3 before:w-full" : "p-1.5 before:w-11"
      } ${className}`}
    >
      <span
        className={`material-symbols-outlined text-[22px] ${favorito ? "text-error" : ""}`}
        style={favorito ? { fontVariationSettings: "'FILL' 1" } : undefined}
      >
        favorite
      </span>
      {textoGuardar ? (
        <span className="font-label-md text-label-md uppercase tracking-wide">
          {favorito ? "Guardado" : textoGuardar}
        </span>
      ) : null}
    </button>
  );
}

export default BotonFavorito;
