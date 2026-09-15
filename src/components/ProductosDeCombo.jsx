/**
 * Los productos de una línea de combo de una orden: "2× Lámpara · Mesa".
 * Sin precio por producto (spec §3.6): el cliente ve el precio del combo, no
 * el reparto interno. Mismo formato que el mail (`plantillasEmail.js`).
 */
function ProductosDeCombo({ productos, className = "" }) {
  const texto = productos
    .map((producto) => `${producto.cantidad > 1 ? `${producto.cantidad}× ` : ""}${producto.nombreProducto}`)
    .join(" · ");
  return <span className={className}>{texto}</span>;
}

export default ProductosDeCombo;
