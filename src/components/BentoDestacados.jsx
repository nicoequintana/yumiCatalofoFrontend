/**
 * Grid bento de hasta 4 productos con destacado:true, inspirado en el bloque
 * "Hallazgos del día" del mockup editorial. Se oculta por completo si hay
 * menos de 4 destacados — un bento con huecos se ve roto, así que preferimos
 * no mostrar la sección antes que mostrarla incompleta.
 */
function BentoDestacados({ productos }) {
  const destacados = productos.filter((p) => p.destacado).slice(0, 4);

  if (destacados.length < 4) return null;

  return null;
}

export default BentoDestacados;
