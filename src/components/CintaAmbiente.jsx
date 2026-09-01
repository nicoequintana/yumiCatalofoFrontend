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
      //
      // `cinta-ambiente` + `h-[var(--alto-cinta-ambiente)]`: sigue siendo
      // `fixed` (no corre el layout a mano), pero ahora DECLARA su alto en una
      // custom property en vez de solo ocuparlo. `index.css` le da valor a esa
      // variable con `:root:has(.cinta-ambiente)` — la clase es el gancho de
      // ese selector — y las barras sticky del sitio (Navbar, la barra del
      // admin, el header mobile de la ficha, y por transitividad EditorTabs y
      // FiltrosCatalogo) leen la MISMA variable en su `top`, así se anclan
      // debajo de la cinta en vez de quedar tapadas por ella. Sin `:has()` (un
      // navegador viejo) la variable queda en `0px` y se vuelve al
      // solapamiento de antes de este fix: degradación, no rotura — y no
      // afecta producción, que nunca tiene esta clase en el DOM. `py-1` se
      // reemplaza por `items-center`: con el alto ahora fijo por la variable,
      // un padding vertical fijo desalinearía el texto en vez de centrarlo.
      className="cinta-ambiente pointer-events-none fixed inset-x-0 top-0 z-[200] flex h-[var(--alto-cinta-ambiente)] items-center justify-center bg-error px-3 text-center"
    >
      <span className="font-label-sm text-label-sm uppercase tracking-[0.2em] text-on-error">
        YIMA — Ambiente de testing
      </span>
    </div>
  );
}

export default CintaAmbiente;
