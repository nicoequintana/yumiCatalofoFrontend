import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { clearToken } from "../api/authClient.js";

const linkBase =
  "flex items-center gap-3 rounded-lg px-4 py-3 font-label-md text-label-md uppercase tracking-widest transition-colors";
const linkInactivo = "text-on-surface-variant hover:bg-surface-container hover:text-on-surface";
const linkActivo = "bg-primary text-on-primary";

function claseLink({ isActive }) {
  return `${linkBase} ${isActive ? linkActivo : linkInactivo}`;
}

/**
 * Sidebar del panel admin. Configuración es un submenu expandible (estado
 * local `configuracionAbierta`) que se auto-abre si la ruta actual ya está
 * dentro de /catalogo/admin/configuracion, para que no arranque colapsado
 * estando parado en Categorías o Usuarios.
 */
function AdminSidebar({ colapsada, onCerrar }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [configuracionAbierta, setConfiguracionAbierta] = useState(
    location.pathname.startsWith("/catalogo/admin/configuracion"),
  );

  useEffect(() => {
    if (location.pathname.startsWith("/catalogo/admin/configuracion")) {
      setConfiguracionAbierta(true);
    }
  }, [location.pathname]);

  function handleCerrarSesion() {
    clearToken();
    navigate("/catalogo/admin/login");
  }

  return (
    <>
      {!colapsada && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={onCerrar}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col justify-between border-r border-outline-variant bg-surface-container-lowest px-4 py-6 transition-transform md:static md:translate-x-0 ${
          colapsada ? "-translate-x-full" : "translate-x-0"
        }`}
      >
        <div>
          <span className="font-headline-md text-headline-md mb-8 block px-2 text-primary">
            Aura Admin
          </span>
          <nav className="flex flex-col gap-1">
            <NavLink to="/catalogo/admin/productos" className={claseLink} onClick={onCerrar}>
              <span className="material-symbols-outlined text-[18px]">inventory_2</span>
              Productos
            </NavLink>
            <NavLink to="/catalogo/admin/ordenes" className={claseLink} onClick={onCerrar}>
              <span className="material-symbols-outlined text-[18px]">receipt_long</span>
              Órdenes
            </NavLink>
            <NavLink to="/catalogo/admin/metricas" className={claseLink} onClick={onCerrar}>
              <span className="material-symbols-outlined text-[18px]">query_stats</span>
              Métricas
            </NavLink>
            <button
              type="button"
              onClick={() => setConfiguracionAbierta((abierta) => !abierta)}
              className={`${linkBase} ${linkInactivo} justify-between`}
              aria-expanded={configuracionAbierta}
            >
              <span className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[18px]">settings</span>
                Configuración
              </span>
              <span className="material-symbols-outlined text-[18px]">
                {configuracionAbierta ? "expand_less" : "expand_more"}
              </span>
            </button>
            {configuracionAbierta && (
              <div className="ml-4 flex flex-col gap-1 border-l border-outline-variant pl-4">
                <NavLink
                  to="/catalogo/admin/configuracion/categorias"
                  className={claseLink}
                  onClick={onCerrar}
                >
                  Categorías
                </NavLink>
                <NavLink
                  to="/catalogo/admin/configuracion/usuarios"
                  className={claseLink}
                  onClick={onCerrar}
                >
                  Usuarios
                </NavLink>
              </div>
            )}
          </nav>
        </div>

        <button
          type="button"
          onClick={handleCerrarSesion}
          className={`${linkBase} ${linkInactivo} border-t border-outline-variant pt-4`}
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          Cerrar sesión
        </button>
      </aside>
    </>
  );
}

export default AdminSidebar;
