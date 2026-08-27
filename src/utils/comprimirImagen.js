/**
 * Comprime una imagen en el navegador ANTES de subirla, para el flujo de
 * generación de imágenes por n8n (`SeccionGenerarImagenes.jsx`).
 *
 * POR QUÉ existe: con 4 referencias (`MAX_REFERENCIAS`, `n8n.service.js`) y un
 * tope de `MAX_FOTO_BYTES` (15 MB) por archivo, el peor caso es un único
 * request de 60 MB contra un timeout de 15s hacia n8n. A 10 Mbps de subida
 * —una conexión hogareña normal, no un caso raro— esos 60 MB tardan ~48s: el
 * admin espera el doble del timeout por datos que el modelo va a escalar
 * igual a su propia resolución de trabajo. Los MB de más de una foto de
 * celular sin comprimir no compran ninguna calidad extra, así que se recortan
 * acá en vez de subir el timeout.
 *
 * Es una OPTIMIZACIÓN, nunca un requisito: cualquier falla (formato que el
 * navegador no decodifica, canvas sin soporte 2D, un resultado que termina
 * pesando más) devuelve el archivo original tal cual. Nunca lanza.
 */

/**
 * 1600px de lado mayor: el doble largo de una vista normal de la ficha
 * (~800px), suficiente margen para que gpt-image-1 no pierda detalle útil de
 * la referencia. Una foto de celular moderna mide 3000-4000px de lado, así
 * que bajar a 1600 ya recorta la mayor parte del peso.
 */
const LADO_MAXIMO_POR_DEFECTO = 1600;

/**
 * 0.85 de calidad JPEG: el punto donde la codificación empieza a perder
 * definición perceptible por debajo de ese valor, mientras que subir más
 * cerca de 1 ahorra cada vez menos peso por cada punto que se sube. Es un
 * punto medio estándar de codecs JPEG, no un número ajustado a mano acá.
 */
const CALIDAD_POR_DEFECTO = 0.85;

/**
 * Carga una imagen desde un object URL y espera a que el navegador la
 * decodifique. Rechaza si el formato es inválido o el navegador no puede
 * decodificarlo — el llamador decide qué hacer con eso (acá: devolver el
 * original en vez de propagar el error).
 */
function cargarImagen(url) {
  return new Promise((resolve, reject) => {
    const imagen = new Image();
    imagen.onload = () => resolve(imagen);
    imagen.onerror = () => reject(new Error("No se pudo decodificar la imagen."));
    imagen.src = url;
  });
}

/**
 * Nombre del archivo comprimido: mismo nombre base, extensión `.jpg` porque
 * el reencode siempre produce JPEG (aunque el original fuera PNG o WEBP). El
 * backend no valida por extensión —filtra por `mimetype` del propio `File`—
 * así que esto es solo para que el nombre no mienta sobre el contenido.
 */
function nombreComprimido(nombreOriginal) {
  const sinExtension = nombreOriginal.replace(/\.[^./\\]+$/, "");
  return `${sinExtension || nombreOriginal}.jpg`;
}

/**
 * Redimensiona `file` para que su lado mayor no supere `ladoMaximo` y lo
 * reencodea a JPEG con `calidad`. Si el resultado no achica el archivo, o
 * cualquier paso falla, devuelve `file` sin modificar.
 *
 * @param {File} file
 * @param {{ladoMaximo?: number, calidad?: number}} [opciones]
 * @returns {Promise<File>}
 */
export async function comprimirImagen(
  file,
  { ladoMaximo = LADO_MAXIMO_POR_DEFECTO, calidad = CALIDAD_POR_DEFECTO } = {},
) {
  let url;
  try {
    url = URL.createObjectURL(file);
    const imagen = await cargarImagen(url);

    const anchoOriginal = imagen.naturalWidth;
    const altoOriginal = imagen.naturalHeight;
    const ladoActual = Math.max(anchoOriginal, altoOriginal);
    // Nunca agranda: si ya es más chica que el tope, escalar de más solo
    // gastaría CPU del navegador sin ahorrar un solo byte.
    const escala = ladoActual > ladoMaximo ? ladoMaximo / ladoActual : 1;
    const anchoFinal = Math.round(anchoOriginal * escala);
    const altoFinal = Math.round(altoOriginal * escala);

    const canvas = document.createElement("canvas");
    canvas.width = anchoFinal;
    canvas.height = altoFinal;
    const contexto = canvas.getContext("2d");
    // jsdom (y algún navegador viejo/embebido) puede no dar un contexto 2D.
    // Sin él no hay forma de comprimir: se cae al original, no a un error.
    if (!contexto) return file;
    contexto.drawImage(imagen, 0, 0, anchoFinal, altoFinal);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", calidad));
    if (!blob) return file;

    // Comprimir para terminar MÁS pesado que el original sería absurdo: pasa
    // con imágenes ya optimizadas o muy chicas, donde el reencode agrega peso
    // en vez de sacarlo.
    if (blob.size >= file.size) return file;

    // Se renombra a `.jpg` a propósito: el archivo que sale de acá ES un
    // JPEG aunque el original fuera PNG/WEBP, y el nombre viaja en el
    // multipart hacia n8n. Conservar una extensión `.png` mentiría sobre el
    // contenido para quien mire esa ejecución del otro lado.
    return new File([blob], nombreComprimido(file.name), {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    // Formato raro, archivo corrupto, lo que sea: comprimir es una
    // optimización y nunca debe impedir que el admin mande su foto.
    return file;
  } finally {
    if (url) URL.revokeObjectURL(url);
  }
}
