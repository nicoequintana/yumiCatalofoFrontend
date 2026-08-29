/**
 * Cálculo del precio de venta a partir del costo de adquisición.
 *
 *     precio = redondearACentenaArriba(costo × coeficiente)
 *
 * **`coeficiente` es un MULTIPLICADOR, no un porcentaje.** Un 2,05 significa
 * "×2,05" — el aumento real es del 105 %.
 *
 * ⚠️ **Espejo manual de `backend/src/lib/precios.js`.** Los dos repos se
 * publican por separado, así que no hay forma de compartir el módulo — mismo
 * caso que `utils/slug.js` ↔ `lib/slug.js`. Los dos tienen el MISMO set de casos
 * en sus tests. **Si divergen, esta pantalla le muestra al admin un precio
 * distinto del que el backend va a escribir al aplicar** — sin error, sin
 * warning y sin nada que lo delate hasta que alguien compare a mano.
 *
 * **Acá NO hay `Decimal`, así que la cuenta va en aritmética ENTERA.** No es
 * una optimización, es corrección: `14504 * 2.05` en punto flotante da
 * `29733.200000000004`, y el día que un producto caiga justo sobre un múltiplo
 * de 100 esa basura lo empuja a la centena siguiente y la pantalla anuncia $100
 * de más. El coeficiente se lleva a centésimos (un entero) y todo el resto se
 * resuelve con enteros y un módulo exacto.
 */

/** Estados posibles de un producto respecto de su precio calculado. */
export const ESTADOS_PRECIO = {
  SIN_COSTO: "SIN_COSTO",
  AL_DIA: "AL_DIA",
  DIFIERE: "DIFIERE",
};

export const ETIQUETA_ESTADO_PRECIO = {
  [ESTADOS_PRECIO.SIN_COSTO]: "Sin costo",
  [ESTADOS_PRECIO.AL_DIA]: "Al día",
  [ESTADOS_PRECIO.DIFIERE]: "Difiere",
};

/**
 * Normaliza a número un valor que puede llegar como string (API, input) o
 * number. La coma se acepta como separador decimal: es como se tipea acá.
 *
 * @returns {number|null} `null` si falta, no parsea o no es positivo
 */
function aNumeroPositivo(valor) {
  if (valor === null || valor === undefined || valor === "") return null;
  const numero = Number(String(valor).trim().replace(",", "."));
  if (!Number.isFinite(numero) || numero <= 0) return null;
  return numero;
}

/**
 * Redondea hacia arriba al múltiplo de 100 más cercano.
 *
 * **Hacia arriba y no al más cercano**: a la centena más cercana, un
 * coeficiente de 2,05 se convierte en un 2,0494 efectivo (`16.810 → 16.800`
 * pierde $10 por unidad) sin que nadie lo note.
 *
 * Un valor que YA es múltiplo de 100 se queda donde está.
 *
 * @param {number} valorEnCentesimos el precio exacto, expresado en centésimos
 * @returns {number} el precio redondeado, en pesos enteros
 */
function centenaArribaDesdeCentesimos(valorEnCentesimos) {
  // 10000 centésimos = $100. El módulo sobre enteros es exacto, así que no hay
  // ninguna división en punto flotante en el camino.
  const resto = valorEnCentesimos % 10000;
  const centenasEnteras = (valorEnCentesimos - resto) / 10000;
  return (resto > 0 ? centenasEnteras + 1 : centenasEnteras) * 100;
}

/**
 * Redondea un precio en pesos hacia arriba al múltiplo de 100.
 * Espejo de `redondearACentenaArriba` del backend.
 *
 * @param {number} pesos
 * @returns {number}
 */
export function redondearACentenaArriba(pesos) {
  return centenaArribaDesdeCentesimos(Math.round(pesos * 100));
}

/**
 * Precio de venta que corresponde a un costo y un coeficiente.
 *
 * Devuelve `null` —nunca 0— cuando falta alguno de los dos: un 0 se
 * escribiría como precio del producto.
 *
 * @param {string|number|null|undefined} costo
 * @param {string|number|null|undefined} coeficiente
 * @returns {number|null}
 */
export function calcularPrecio(costo, coeficiente) {
  const costoNumero = aNumeroPositivo(costo);
  const coeficienteNumero = aNumeroPositivo(coeficiente);
  if (costoNumero === null || coeficienteNumero === null) return null;

  // El coeficiente admite dos decimales (la columna es Decimal(5,2)), así que
  // llevarlo a centésimos lo vuelve un entero exacto y toda la cuenta de acá
  // en adelante es entera.
  const coeficienteEnCentesimos = Math.round(coeficienteNumero * 100);
  const productoEnCentesimos = Math.round(costoNumero) * coeficienteEnCentesimos;

  // Fuera del rango entero seguro la cuenta dejaría de ser exacta en silencio.
  // No es alcanzable con datos reales; devolver null es preferible a mentir.
  if (!Number.isSafeInteger(productoEnCentesimos)) return null;

  return centenaArribaDesdeCentesimos(productoEnCentesimos);
}

/**
 * En cuál de los tres estados está un producto respecto de su precio.
 *
 * `DIFIERE` cubre tres causas que no se pueden distinguir entre sí: subió el
 * costo, cambió el coeficiente, o alguien pisó el precio a mano. Por eso no se
 * llama "desactualizado" — un precio elegido a propósito es legítimo, y un
 * panel que lo marque como problema todos los días entrena a ignorar el aviso.
 *
 * @param {{ precio: unknown, costo: unknown, coeficiente: unknown }} producto
 * @returns {string} una clave de `ESTADOS_PRECIO`
 */
export function estadoDePrecio({ precio, costo, coeficiente }) {
  const calculado = calcularPrecio(costo, coeficiente);
  if (calculado === null) return ESTADOS_PRECIO.SIN_COSTO;

  const vigente = aNumeroPositivo(precio);
  if (vigente === null) return ESTADOS_PRECIO.DIFIERE;

  return vigente === calculado ? ESTADOS_PRECIO.AL_DIA : ESTADOS_PRECIO.DIFIERE;
}
