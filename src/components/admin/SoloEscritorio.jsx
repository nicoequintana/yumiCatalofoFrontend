import { Link } from "react-router-dom";

/**
 * Envoltorio de los módulos del panel que NO existen para el celular.
 *
 * POR QUÉ HACE FALTA. Los módulos marcados `soloEscritorio` en `AdminSidebar`
 * ya no aparecen en el drawer de < lg, así que por navegación son inalcanzables
 * desde un teléfono. Pero la ruta sigue existiendo: un enlace guardado, un
 * historial o una URL pegada a mano llegan igual. Sin este guard, ahí se
 * renderizaría un calendario de siete columnas dentro de 412 px — ilegible, y
 * peor que un cartel honesto.
 *
 * CÓMO. Con CSS puro: el aviso es `lg:hidden` y el contenido `hidden lg:block`.
 * **No hay `matchMedia`** — el frontend no tiene ninguno y el plan del admin
 * responsive lo descarta a propósito. Mismo mecanismo que el `lg:hidden` de
 * `EditorTabs.jsx` y el `hidden lg:flex` de la bottom nav.
 *
 * RESIDUO ACEPTADO: los hijos se montan igual por debajo de `lg`, así que su
 * fetch inicial se dispara aunque nadie los vea. Es una request desperdiciada
 * en una pantalla que no está en la navegación; evitarla exigiría el primer
 * breakpoint en JavaScript del proyecto, que cuesta más de lo que ahorra.
 */
export default function SoloEscritorio({ titulo, children }) {
  return (
    <>
      <div
        role="status"
        className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center lg:hidden"
      >
        <span
          aria-hidden="true"
          className="material-symbols-outlined text-[48px] text-on-surface-variant"
        >
          desktop_windows
        </span>
        <h1 className="font-headline-sm text-headline-sm text-primary">
          {titulo} necesita una pantalla más grande
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Este módulo trabaja con un calendario y tablas anchas que no entran en un celular.
          Abrilo desde una computadora.
        </p>
        <Link
          to="/catalogo/admin/productos"
          className="font-label-md text-label-md mt-2 rounded-lg bg-primary px-5 py-3 uppercase tracking-widest text-on-primary transition-opacity hover:opacity-90"
        >
          Ir a Productos
        </Link>
      </div>

      <div className="hidden lg:block">{children}</div>
    </>
  );
}
