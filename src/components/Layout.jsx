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

      {/* El zócalo de la isla se mudó a `Footer.jsx`, como padding inferior del
          propio pie. Acá era un `<div>` suelto sin fondo, así que el espacio que
          reservaba se leía como una franja vacía debajo del pie. Adentro del
          pie reserva lo mismo y queda cubierto por su fondo y su borde. */}

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
