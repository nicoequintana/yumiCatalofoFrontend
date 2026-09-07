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
      // `min-h-screen`, y el alto COMPLETO no es exageración: es lo que
      // mantiene el pie fuera del viewport mientras el velo está puesto.
      //
      // El CLS solo cuenta lo que se desplaza ESTANDO VISIBLE. Con el velo
      // corto la página también es corta, así que el pie queda arriba del
      // fold y su viaje al levantarse computa entero — el velo eliminaba el
      // salto del hero y creaba uno propio, más chico, en el pie.
      //
      // Medido en producción el 07/09/2026, a 1280x720: con `min-h-[70vh]` el
      // velo medía 504 px, el pie caía en y=634 y saltaba 634 px, valiendo
      // 0,086 de un CLS de 0,122 — el 70% de lo que quedaba. Con el alto
      // completo, todo lo que haya arriba (navbar, cinta de anuncios) SUMA,
      // así que el pie queda siempre debajo del fold y deja de computar.
      className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-background px-margin-mobile text-center md:px-margin-desktop"
    >
      {/* `motion-reduce:animate-none` desactiva el giro para quien pidió menos
          movimiento. El indicador no se pierde: queda el anillo quieto y, sobre
          todo, el mensaje de abajo, que es el que realmente informa. */}
      <Spinner className="h-10 w-10 text-primary motion-reduce:animate-none" decorativo />
      <p className="font-body-md text-body-md text-on-surface-variant">{mensaje}</p>
    </div>
  );
}
