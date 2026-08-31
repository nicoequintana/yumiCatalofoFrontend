/**
 * Cinta fija que avisa que esto NO es el sitio real.
 *
 * Se ve en todo el sitio —catálogo público y panel— porque la confusión que
 * evita es la misma en los dos: tocar un producto, una orden o un precio
 * creyendo que se está en producción.
 *
 * ## Por qué nunca va a salir en producción
 *
 * `import.meta.env.DEV` **no es una variable de entorno que alguien pueda
 * olvidar de configurar**: es una constante que Vite reemplaza literalmente en
 * tiempo de build. En `npm run dev` vale `true`; en `npm run build` —lo que
 * corre el `Dockerfile` del frontend— vale `false`, el `if` se vuelve
 * `if (false)` y el minificador elimina el bloque entero.
 *
 * El resultado no es un cartel oculto con CSS ni un componente que devuelve
 * `null` en runtime: **el texto no existe en el bundle de producción**, y eso se
 * puede comprobar con un `grep` sobre `dist/`. Esa es la diferencia con las
 * alternativas que se descartaron:
 *
 * - Una variable propia (`VITE_AMBIENTE=testing`) dependería de que nadie la
 *   defina por error en EasyPanel — disciplina, no garantía.
 * - Un chequeo de `window.location.hostname` corre en el navegador, así que el
 *   texto viajaría igual en el bundle público y bastaría un host inesperado
 *   para que aparezca.
 *
 * Ninguna de las dos se puede verificar con un grep. Esta sí.
 */
function CintaAmbiente() {
  if (!import.meta.env.DEV) return null;

  return (
    <div
      data-testid="cinta-ambiente"
      // `fixed`, no `sticky`: flota sobre el contenido en vez de correrlo hacia
      // abajo. Correrlo cambiaría el layout que se está probando, que es
      // justamente lo que no puede pasar en un ambiente de prueba.
      //
      // `z-[200]` queda por encima del techo actual de la app (el `z-[100]` del
      // Lightbox). Es a propósito: si el cartel quedara por debajo de un modal,
      // desaparecería exactamente en las pantallas donde más importa saber
      // dónde se está parado.
      //
      // `pointer-events-none` para que no bloquee lo que tapa. La cinta es
      // finita, pero igual se superpone al borde superior del navbar sticky, y
      // un cartel de aviso no puede robarle un click a la navegación.
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] flex justify-center bg-error px-3 py-1 text-center"
    >
      <span className="font-label-sm text-label-sm uppercase tracking-[0.2em] text-on-error">
        YIMA — Ambiente de testing
      </span>
    </div>
  );
}

export default CintaAmbiente;
