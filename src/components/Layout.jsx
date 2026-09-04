import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import BarraAnuncios from "./BarraAnuncios.jsx";
import CampaniaModalMontado from "./CampaniaModalMontado.jsx";
import HojaMenu from "./HojaMenu.jsx";
import Navbar from "./Navbar.jsx";
import NavFlotante from "./NavFlotante.jsx";
import Footer from "./Footer.jsx";

/**
 * Shared page shell: BarraAnuncios + Navbar + routed page content + Footer,
 * más la isla flotante (`NavFlotante`) y su hoja (`HojaMenu`), que son la
 * navegación móvil y por eso se montan acá y no dentro de `Navbar`.
 */
function Layout() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const { pathname } = useLocation();
  const esAdmin = pathname.startsWith("/catalogo/admin");

  // Navegar cierra la hoja. Sin esto, tocar un destino cambia la página por
  // detrás de un menú que sigue tapándola.
  useEffect(() => {
    setMenuAbierto(false);
  }, [pathname]);

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

      {/* Zócalo para la isla, que es `fixed` y tapa el final del contenido: sin
          esto, la última fila de productos y el botón "Mostrar más" quedan
          debajo. El comentario que estaba acá decía que este padding se había
          sacado al retirarse un BottomNav anterior — vuelve, porque vuelve la
          barra que lo justificaba, ahora solo en móvil.

          Va detrás del guard `esAdmin`, igual que `NavFlotante` y `HojaMenu`:
          `/catalogo/admin/login` es la única ruta de admin que cuelga de este
          Layout público (el resto usa `AdminLayout`), y sin el guard pagaría
          un espacio muerto al pie que ninguna isla ocupa. */}
      {esAdmin ? null : <div aria-hidden="true" className="h-24 md:hidden" />}

      <NavFlotante
        menuAbierto={menuAbierto}
        onAlternarMenu={() => setMenuAbierto((abierto) => !abierto)}
      />
      <HojaMenu abierta={menuAbierto} onCerrar={() => setMenuAbierto(false)} />

      {/* El cartel estacional. Se monta acá y no en la home para alcanzar a
          quien entra directo a una ficha desde una búsqueda, que es por donde
          llega buena parte del tráfico. Sin campaña activa no renderiza nada. */}
      <CampaniaModalMontado />
    </div>
  );
}

export default Layout;
