import { Suspense, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AdminSidebar from "./AdminSidebar.jsx";
import LimiteDeError from "./LimiteDeError.jsx";
import LogoYima from "./LogoYima.jsx";
import Spinner from "./Spinner.jsx";
import ToggleTemaAdmin from "./ToggleTemaAdmin.jsx";
import MetaSeo from "./MetaSeo.jsx";
import { urlAbsoluta } from "../constants/seo.js";

/**
 * Shell propio del panel admin — navegación + contenido, sin Navbar/Footer
 * público (ver docs/superpowers/specs/2026-08-16-admin-sidebar-design.md).
 *
 * La navegación tiene dos formas totalmente distintas según el tamaño de
 * pantalla (ver AdminSidebar.jsx): por debajo de `lg` usa un drawer lateral
 * colapsable, abierto por la barra superior EN FLUJO de acá abajo (`sticky
 * top-0`, `h-topbar-admin`, `lg:hidden`) — ya no el botón `fixed` de antes,
 * que tapaba el `<h1>` de cada pantalla en mobile. El drawer es un diálogo
 * modal de verdad (`useDialogo` dentro de `AdminSidebar.jsx`: foco inicial,
 * trampa de foco, Escape, bloqueo de scroll del body) y se cierra solo al
 * cambiar de ruta —el `useEffect` de acá abajo, mismo patrón que el panel
 * móvil de `Navbar.jsx`—, además de por el `onClick={onCerrar}` de cada
 * `NavLink`. De `lg` en adelante la navegación es una bottom nav horizontal
 * siempre visible, sin necesidad de ningún botón para desplegarla — el
 * breakpoint del shell pasó de `md` a `lg` porque la bottom nav no entra
 * entre 768 y ~1100px; en ese rango (iPad portrait, por ejemplo) sigue
 * usándose el drawer. El `<main>` lleva `lg:pb-20` para que esa bottom nav
 * fija (~73px de alto) nunca tape el final del contenido al scrollear hasta
 * abajo; el padding va SOLO en `lg+` porque ahí es donde la bottom nav existe.
 *
 * `overflow-x-clip` en el `<main>` (reemplazó a `overflow-x-auto`) sigue
 * cortando el desborde horizontal SIN convertirlo en scroll container: con
 * el eje Y en su default `visible`, la spec de CSS Overflow 3 solo fuerza
 * `auto` cuando el otro eje no es `visible` ni `clip`. Es lo que permite que
 * cualquier `position: sticky` de las pantallas de adentro vuelva a
 * funcionar — con `overflow-x-auto` el `<main>` era scroll container de alto
 * no acotado y ningún sticky interno tenía contra qué anclarse.
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

  // Cierra el drawer al navegar. El `onClick={onCerrar}` de cada `NavLink` ya
  // cubre el click sobre un link del propio drawer, pero no una navegación
  // programática (redirect, botón "Volver" de una pantalla) ni el link del
  // outlet en sí — sin esto el drawer podía quedar abierto tapando la pantalla
  // nueva.
  useEffect(() => {
    setSidebarColapsada(true);
  }, [pathname]);

  return (
    <div className="relative min-h-screen bg-background">
      {/* `noindex` en TODO el panel — nunca tiene valor de búsqueda y nada
          ahí adentro debería rankear. Va acá, en el nivel más alto de
          `AdminLayout` (que NO es lazy, a diferencia de las pantallas que
          renderiza), para que se emita siempre: incluso mientras el chunk de
          la pantalla concreta todavía está bajando dentro del `<Suspense>`
          de más abajo, o si esa pantalla rompe y cae en el `<LimiteDeError>`. */}
      <MetaSeo
        titulo="Panel — YIMA"
        descripcion="Panel de administración."
        canonical={urlAbsoluta("/catalogo/admin")}
        noindex
      />

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

      {/* Barra superior EN FLUJO, solo `< lg`: reemplaza al botón `fixed` que
          tapaba el `<h1>` de cada pantalla. `sticky top-0` la deja pegada
          arriba al scrollear; `z-30` queda por debajo del overlay (`z-40`) y
          del drawer (`z-50`) del `AdminSidebar`, y por encima del `<main>`
          (`z-10`). El botón conserva el mismo `aria-label` de antes y suma
          `aria-expanded` porque ahora abre un diálogo modal de verdad. */}
      <header className="sticky top-0 z-30 flex h-topbar-admin items-center justify-between gap-2 border-b border-outline-variant bg-surface-container-lowest px-margin-mobile lg:hidden">
        <button
          type="button"
          aria-label="Abrir menú"
          aria-expanded={!sidebarColapsada}
          onClick={() => setSidebarColapsada(false)}
          className="-ml-2 inline-flex size-11 items-center justify-center rounded-lg text-on-surface"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        <span className="flex items-baseline gap-2">
          <LogoYima className="h-6 self-center" />
          <span className="font-label-md text-label-md uppercase tracking-widest text-on-surface-variant">
            Admin
          </span>
        </span>
        <ToggleTemaAdmin compacto />
      </header>

      <AdminSidebar colapsada={sidebarColapsada} onCerrar={() => setSidebarColapsada(true)} />

      <main className="relative z-10 w-full overflow-x-clip lg:pb-20">
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
