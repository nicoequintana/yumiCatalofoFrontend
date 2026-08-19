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

// Bottom nav (desktop): mismos colores que linkActivo/linkInactivo, pero
// apilado ícono-arriba/texto-abajo en vez de en fila, y sin mayúsculas
// forzadas por tracking-widest (no entra en el ancho chico de cada tab).
const tabBase =
  "flex flex-col items-center gap-1 rounded-lg px-3 py-2 font-label-sm text-label-sm transition-colors";
const tabInactivo = "text-on-surface-variant hover:bg-surface-container hover:text-on-surface";
const tabActivo = "bg-primary text-on-primary";

function claseTab({ isActive }) {
  return `${tabBase} ${isActive ? tabActivo : tabInactivo}`;
}

const ITEMS_NAV = [
  { to: "/catalogo/admin/productos", icono: "inventory_2", label: "Productos" },
  { to: "/catalogo/admin/ordenes", icono: "receipt_long", label: "Órdenes" },
  { to: "/catalogo/admin/metricas", icono: "query_stats", label: "Métricas" },
  { to: "/catalogo/admin/logs", icono: "history", label: "Logs" },
];

const ITEMS_CONFIGURACION = [
  { to: "/catalogo/admin/configuracion/categorias", label: "Categorías" },
  { to: "/catalogo/admin/configuracion/usuarios", label: "Usuarios" },
];

/**
 * Navegación del panel admin. Dos presentaciones completamente distintas
 * según el tamaño de pantalla — no es la misma barra reposicionada:
 *
 * - Mobile (< md): sidebar lateral fixed, colapsada por defecto, se abre
 *   con el botón hamburguesa de AdminLayout.jsx y flota con overlay.
 * - Desktop (md+): bottom nav horizontal fijo abajo (`fixed inset-x-0
 *   bottom-0`), siempre visible, sin colapsar — logo a la izquierda,
 *   tabs ícono+label centradas, "Cerrar sesión" a la derecha.
 *
 * "Configuración" (submenu Categorías/Usuarios) es un dropdown hacia
 * arriba en el bottom nav (el submenu no tiene lugar hacia abajo, la
 * barra ya está pegada al borde inferior de la pantalla).
 */
function AdminSidebar({ colapsada, onCerrar }) {
  const location = useLocation();
  const navigate = useNavigate();
  const enConfiguracion = location.pathname.startsWith("/catalogo/admin/configuracion");
  const [configuracionAbierta, setConfiguracionAbierta] = useState(enConfiguracion);
  const [menuConfigDesktopAbierto, setMenuConfigDesktopAbierto] = useState(false);

  useEffect(() => {
    if (enConfiguracion) {
      setConfiguracionAbierta(true);
    } else {
      setMenuConfigDesktopAbierto(false);
    }
  }, [enConfiguracion]);

  function handleCerrarSesion() {
    clearToken();
    navigate("/catalogo/admin/login");
  }

  return (
    <>
      {/* Mobile: sidebar lateral colapsable con overlay */}
      {!colapsada && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={onCerrar}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col justify-between border-r border-outline-variant bg-surface-container-lowest px-4 py-6 shadow-ambient transition-transform md:hidden ${
          colapsada ? "-translate-x-full" : "translate-x-0"
        }`}
      >
        <div>
          <span className="font-headline-md text-headline-md mb-8 block px-2 text-primary">
            YIMA ADMIN
          </span>
          <nav className="flex flex-col gap-1">
            {ITEMS_NAV.map((item) => (
              <NavLink key={item.to} to={item.to} className={claseLink} onClick={onCerrar}>
                <span className="material-symbols-outlined text-[18px]">{item.icono}</span>
                {item.label}
              </NavLink>
            ))}
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
                {ITEMS_CONFIGURACION.map((item) => (
                  <NavLink key={item.to} to={item.to} className={claseLink} onClick={onCerrar}>
                    {item.label}
                  </NavLink>
                ))}
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

      {/* Desktop: bottom nav horizontal fijo, siempre visible */}
      <nav className="fixed inset-x-0 bottom-0 z-40 hidden items-center justify-between border-t border-outline-variant bg-surface-container-lowest px-6 py-2 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] md:flex">
        <span className="font-headline-md text-headline-md shrink-0 text-primary">YIMA</span>

        <div className="flex items-center gap-2">
          {ITEMS_NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={claseTab}>
              <span className="material-symbols-outlined text-[20px]">{item.icono}</span>
              {item.label}
            </NavLink>
          ))}

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuConfigDesktopAbierto((abierto) => !abierto)}
              className={`${tabBase} ${enConfiguracion ? tabActivo : tabInactivo}`}
              aria-expanded={menuConfigDesktopAbierto}
            >
              <span className="material-symbols-outlined text-[20px]">settings</span>
              <span className="flex items-center gap-1">
                Configuración
                <span className="material-symbols-outlined text-[16px]">
                  {menuConfigDesktopAbierto ? "expand_more" : "expand_less"}
                </span>
              </span>
            </button>
            {menuConfigDesktopAbierto && (
              <div className="absolute bottom-full left-1/2 mb-2 flex w-44 -translate-x-1/2 flex-col gap-1 rounded-lg border border-outline-variant bg-surface-container-lowest p-2 shadow-ambient">
                {ITEMS_CONFIGURACION.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={claseLink}
                    onClick={() => setMenuConfigDesktopAbierto(false)}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleCerrarSesion}
          className={`${linkBase} ${linkInactivo} shrink-0`}
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          Cerrar sesión
        </button>
      </nav>
    </>
  );
}

export default AdminSidebar;
