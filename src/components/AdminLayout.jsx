import { Suspense, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AdminSidebar from "./AdminSidebar.jsx";
import LimiteDeError from "./LimiteDeError.jsx";
import Spinner from "./Spinner.jsx";

/**
 * Shell propio del panel admin — navegación + contenido, sin Navbar/Footer
 * público (ver docs/superpowers/specs/2026-08-16-admin-sidebar-design.md).
 *
 * La navegación tiene dos formas totalmente distintas según el tamaño de
 * pantalla (ver AdminSidebar.jsx): mobile usa un sidebar lateral colapsable
 * (el botón hamburguesa de acá solo existe para abrirlo, por eso es
 * `md:hidden`); desktop usa una bottom nav horizontal siempre visible, sin
 * necesidad de ningún botón para desplegarla. El `<main>` lleva `md:pb-20`
 * para que esa bottom nav fija (~73px de alto) nunca tape el final del
 * contenido al scrollear hasta abajo. El padding va SOLO en `md+`: la barra
 * inferior existe únicamente en desktop, en mobile la navegación es un
 * sidebar lateral y no hay nada abajo que pueda tapar.
 *
 * El `<Suspense>` alrededor del `<Outlet>` es la contraparte de los
 * `React.lazy` de App.jsx: las pantallas del admin llegan en chunks aparte, y
 * este es el único punto donde el estado de carga puede mostrarse sin tapar la
 * navegación — la sidebar queda montada y usable mientras baja el chunk.
 *
 * El `<LimiteDeError>` está adentro del `<main>` por el mismo motivo que el
 * `<Suspense>`: si una pantalla del admin rompe durante el render, el error se
 * contiene en el área de contenido y la sidebar sigue montada, así el admin
 * puede irse a otra pantalla en vez de quedar varado en una página en blanco.
 * Va por dentro del `<Suspense>` para que también atrape una falla de carga
 * del chunk (`React.lazy`), que se propaga como un error de render.
 */
function AdminLayout() {
  const [sidebarColapsada, setSidebarColapsada] = useState(true);
  const { pathname } = useLocation();

  return (
    <div className="relative min-h-screen bg-background">
      {/* Marca de agua del panel. Va `fixed` y no `absolute` para que se quede
          quieta mientras el contenido scrollea —una marca de agua que se
          desplaza con la tabla deja de leerse como fondo— y `overflow-hidden`
          contiene el desenfoque, que si no se derrama fuera del viewport y
          agranda el área que el navegador tiene que componer.

          `z-0` con el `<main>` en `z-10` es lo que la manda atrás: no alcanza
          con un z-index negativo, porque quedaría por detrás del `bg-background`
          de este mismo contenedor y no se vería nada. La sidebar ya vive en
          `z-40`/`z-50` y el botón del menú en `z-30`, así que ninguno la pisa.

          El estilo (tamaño, opacidad, desenfoque y el desvanecido de los
          bordes) está en `.marca-agua-admin`, en `index.css`. */}
      <div
        aria-hidden="true"
        className="marca-agua-admin pointer-events-none fixed inset-0 z-0 overflow-hidden"
      />

      <button
        type="button"
        onClick={() => setSidebarColapsada(false)}
        className="fixed left-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container-lowest text-on-surface shadow-ambient md:hidden"
        aria-label="Abrir menú"
      >
        <span className="material-symbols-outlined">menu</span>
      </button>

      <AdminSidebar colapsada={sidebarColapsada} onCerrar={() => setSidebarColapsada(true)} />

      <main className="relative z-10 w-full overflow-x-auto md:pb-20">
        <Suspense
          fallback={
            <div className="flex min-h-[60vh] items-center justify-center text-on-surface-variant">
              <Spinner className="h-8 w-8" />
            </div>
          }
        >
          <LimiteDeError claveDeReinicio={pathname} fallback={<ErrorDePantallaAdmin />}>
            <Outlet />
          </LimiteDeError>
        </Suspense>
      </main>
    </div>
  );
}

/**
 * Fallback del área de contenido del admin. A diferencia del público, no
 * ocupa la pantalla entera: la sidebar tiene que seguir a la vista, porque
 * navegar a otra pantalla es la salida más rápida (y `claveDeReinicio` hace
 * que esa navegación limpie el error sin recargar).
 */
function ErrorDePantallaAdmin() {
  return (
    <div
      role="alert"
      className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-margin-mobile text-center"
    >
      <span className="material-symbols-outlined text-[40px] text-error" aria-hidden="true">
        report
      </span>
      <h2 className="font-headline-md text-headline-md text-on-surface">
        Esta pantalla no se pudo mostrar
      </h2>
      <p className="font-body-md text-body-md text-on-surface-variant">
        Ocurrió un error inesperado al dibujarla. Podés elegir otra sección en el menú, o recargar
        para reintentar. El detalle técnico quedó en la consola del navegador.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="font-label-md text-label-md rounded-lg bg-primary px-4 py-2 uppercase tracking-widest text-on-primary"
      >
        Recargar
      </button>
    </div>
  );
}

export default AdminLayout;
