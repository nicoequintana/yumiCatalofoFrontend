import { Outlet } from "react-router-dom";
import BarraAnuncios from "./BarraAnuncios.jsx";
import Navbar from "./Navbar.jsx";
import Footer from "./Footer.jsx";

/**
 * Shared page shell: Navbar + routed page content + Footer.
 *
 * No `pb-*` bottom padding is added here — the mockups' `pb-32 md:pb-16`
 * on detalle-producto.html existed only to clear the now-removed
 * `fixed bottom-0` BottomNav (dropped per the finalized design decision).
 */
function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* La cinta va ARRIBA del navbar y no es sticky: scrollea y se va, así el
          único elemento pegado al tope sigue siendo el header. Se esconde sola
          en rutas de admin (`/catalogo/admin/login` usa este mismo Layout). */}
      <BarraAnuncios />
      <Navbar />
      <main className="flex-grow w-full">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default Layout;
