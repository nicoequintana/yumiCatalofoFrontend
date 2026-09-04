/**
 * La identidad de un producto en las listas del panel: portada, nombre y SKU.
 *
 * Estaba inline en `TablaComercial` y la vitrina de una campaña necesitaba
 * exactamente lo mismo. Duplicar el markup habría dejado dos celdas divergiendo
 * en silencio — el mismo producto se vería distinto según la pantalla, sin que
 * nada falle.
 *
 * La foto va `alt=""` a propósito: el nombre está al lado como texto, así que
 * un alt con el mismo nombre haría que un lector de pantalla lo anuncie dos
 * veces sin agregar información. Cuando no hay portada se pinta un marcador del
 * mismo tamaño, para que la lista no se desalinee fila por fila.
 *
 * "· oculto" no es decoración: un producto fuera del catálogo se puede elegir
 * igual desde el panel, y sin la marca el admin arma una vitrina que el
 * visitante ve vacía.
 */
export default function CeldaProducto({ nombre, sku, fotoPortada, visibleEnCatalogo }) {
  return (
    <span className="flex items-center gap-3">
      {fotoPortada ? (
        <img src={fotoPortada} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
      ) : (
        <span
          aria-hidden="true"
          className="material-symbols-outlined flex h-10 w-10 shrink-0 items-center justify-center rounded bg-surface-container text-on-surface-variant"
        >
          image
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate">{nombre}</span>
        <span className="font-body-sm text-body-sm block text-on-surface-variant">
          {sku}
          {visibleEnCatalogo ? "" : " · oculto"}
        </span>
      </span>
    </span>
  );
}
