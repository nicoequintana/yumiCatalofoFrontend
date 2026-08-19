import { useState } from "react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "./AdminSidebar.jsx";

/**
 * Shell propio del panel admin — navegación + contenido, sin Navbar/Footer
 * público (ver docs/superpowers/specs/2026-08-16-admin-sidebar-design.md).
 *
 * La navegación tiene dos formas totalmente distintas según el tamaño de
 * pantalla (ver AdminSidebar.jsx): mobile usa un sidebar lateral colapsable
 * (el botón hamburguesa de acá solo existe para abrirlo, por eso es
 * `md:hidden`); desktop usa una bottom nav horizontal siempre visible, sin
 * necesidad de ningún botón para desplegarla. El `<main>` lleva
 * `pb-20 md:pb-0` para que esa bottom nav fija nunca tape el contenido en
 * desktop (en mobile no hace falta, ahí no hay barra inferior).
 */
function AdminLayout() {
  const [sidebarColapsada, setSidebarColapsada] = useState(true);

  return (
    <div className="min-h-screen bg-background">
      <button
        type="button"
        onClick={() => setSidebarColapsada(false)}
        className="fixed left-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container-lowest text-on-surface shadow-ambient md:hidden"
        aria-label="Abrir menú"
      >
        <span className="material-symbols-outlined">menu</span>
      </button>

      <AdminSidebar colapsada={sidebarColapsada} onCerrar={() => setSidebarColapsada(true)} />

      <main className="w-full overflow-x-auto md:pb-20">
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;
