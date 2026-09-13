/**
 * Iniciales para el avatar de la cuenta de cliente (`MiCuenta.jsx` y el
 * `Navbar`). Quien llama pasa el MISMO valor que pinta como nombre visible
 * (`perfil.apodo || perfil.nombre`): si las dos cosas salieran de fuentes
 * distintas, alguien con apodo vería "NQ" al lado de "Tito".
 *
 * El `filter(Boolean)` no es defensa de más: un nombre que queda VACÍO al
 * recortarlo es alcanzable. `cuentaLogin.controller.js` guarda el nombre que
 * manda Google con un check `!== ""` y **sin `trim()`**, así que `" "` entra
 * tal cual. Sin filtrar, `" ".split(/\s+/)` devuelve `[""]` y
 * `undefined.toUpperCase()` tira en render. Degrada a cadena vacía.
 */
export function iniciales(nombre) {
  return (nombre ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((palabra) => palabra[0].toUpperCase())
    .join("");
}
