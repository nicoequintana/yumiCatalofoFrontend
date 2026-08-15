import { Outlet } from "react-router-dom";
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
      <Navbar />
      <main className="flex-grow w-full">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default Layout;
