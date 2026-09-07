import Spinner from "./Spinner.jsx";

/**
 * El velo de carga de una pantalla completa.
 *
 * ⚠️ **ESTO ESCONDE UN PROBLEMA, NO LO ARREGLA.** Nació el 07/09/2026 para la
 * home (`pages/Catalogo.jsx`), donde el hero va al PIE del render a propósito
 * ("la home abre con mercadería, no con marca") y las cuatro secciones que van
 * arriba devuelven `null` hasta tener datos: cuando los fetch aterrizan, el
 * hero se va para abajo de golpe. Medido en producción con Playwright contra
 * `https://yima-productos.com/`: **el hero salta 792 px y el CLS da 0,407** —
 * Google considera "malo" todo lo que pase de 0,25.
 *
 * Tapar la pantalla hasta que las fuentes contesten hace que ese salto ocurra
 * con nadie mirando, así que la métrica mejora y **la causa sigue intacta**: el
 * día que alguien sume una quinta sección que también empieza en `null`, el
 * salto crece y esto lo va a seguir tapando. La solución de fondo es reservar
 * el espacio de cada sección (esqueletos con la altura final) o subir el hero;
 * las dos se evaluaron y se descartaron por decisión de producto.
 *
 * Un `<div>` girando y nada más sería invisible para un lector de pantalla, así
 * que la semántica va acá y no en el `Spinner`:
 * - `role="status"` + `aria-live="polite"` anuncian el cambio sin interrumpir.
 * - `aria-busy` dice que la región está trabajando.
 * - el mensaje es TEXTO VISIBLE, que sirve a todo el mundo por igual.
 *
 * Por eso el `Spinner` va `decorativo`: sin eso el nodo se anunciaría dos veces
 * ("Cargando" del spinner + el mensaje de acá).
 *
 * @param {string} [mensaje] qué se está esperando, en texto legible
 */
export default function CargandoPagina({ mensaje = "Cargando la tienda…" }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      // `min-h-[70vh]`: el velo tiene que ocupar aproximadamente lo que ocupará
      // el contenido, o al levantarse produce su PROPIO salto — que es
      // exactamente lo que vinimos a evitar.
      className="flex min-h-[70vh] w-full flex-col items-center justify-center gap-4 bg-background px-margin-mobile text-center md:px-margin-desktop"
    >
      {/* `motion-reduce:animate-none` desactiva el giro para quien pidió menos
          movimiento. El indicador no se pierde: queda el anillo quieto y, sobre
          todo, el mensaje de abajo, que es el que realmente informa. */}
      <Spinner className="h-10 w-10 text-primary motion-reduce:animate-none" decorativo />
      <p className="font-body-md text-body-md text-on-surface-variant">{mensaje}</p>
    </div>
  );
}
