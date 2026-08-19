import { useState } from "react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "./AdminSidebar.jsx";

/**
 * Shell propio del panel admin — sidebar + contenido, sin Navbar/Footer
 * público (ver docs/superpowers/specs/2026-08-16-admin-sidebar-design.md).
 * La sidebar arranca colapsada SIEMPRE (mobile y desktop) y, al abrirse,
 * flota sobre el contenido (position: fixed) en vez de ocupar espacio fijo
 * en el layout — así el `<main>` usa el 100% del ancho disponible y es el
 * único elemento con overflow horizontal propio (ver AdminProductos.jsx),
 * nunca la página completa.
 */
function AdminLayout() {
  const [sidebarColapsada, setSidebarColapsada] = useState(true);

  return (
    <div className="min-h-screen bg-background">
      <button
        type="button"
        onClick={() => setSidebarColapsada(false)}
        className="fixed left-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container-lowest text-on-surface shadow-ambient"
        aria-label="Abrir menú"
      >
        <span className="material-symbols-outlined">menu</span>
      </button>

      <AdminSidebar colapsada={sidebarColapsada} onCerrar={() => setSidebarColapsada(true)} />

      <main className="w-full overflow-x-auto">
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;
