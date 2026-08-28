import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import AdminLayout from "./components/AdminLayout.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import Spinner from "./components/Spinner.jsx";
import Catalogo from "./pages/Catalogo.jsx";
import Coleccion from "./pages/Coleccion.jsx";
import Favoritos from "./pages/Favoritos.jsx";
import Carrito from "./pages/Carrito.jsx";
import Checkout from "./pages/Checkout.jsx";
import OrdenConfirmada from "./pages/OrdenConfirmada.jsx";
import ProductoDetalle from "./pages/ProductoDetalle.jsx";
import NoEncontrado from "./pages/NoEncontrado.jsx";

// Las pantallas del admin se cargan bajo demanda (`React.lazy`): son casi la
// mitad del código fuente del frontend y ningún visitante público las
// necesita, así que mantenerlas en el bundle inicial hacía que cada comprador
// se descargara el panel entero antes de ver la home. Cada `lazy()` genera un
// chunk propio que solo se pide al entrar a esa ruta.
//
// Las páginas públicas siguen con import estático a propósito: son el camino
// crítico, dividirlas solo agregaría un round-trip antes del primer render.
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin.jsx"));
const AdminProductos = lazy(() => import("./pages/admin/AdminProductos.jsx"));
const AdminProductoForm = lazy(() => import("./pages/admin/AdminProductoForm.jsx"));
const AdminImportarProductos = lazy(() => import("./pages/admin/AdminImportarProductos.jsx"));
const AdminActualizarProductos = lazy(() => import("./pages/admin/AdminActualizarProductos.jsx"));
const AdminCategorias = lazy(() => import("./pages/admin/AdminCategorias.jsx"));
const AdminAnuncios = lazy(() => import("./pages/admin/AdminAnuncios.jsx"));
const AdminMetricas = lazy(() => import("./pages/admin/AdminMetricas.jsx"));
const AdminUsuarios = lazy(() => import("./pages/admin/AdminUsuarios.jsx"));
const AdminOrdenes = lazy(() => import("./pages/admin/AdminOrdenes.jsx"));
const AdminOrdenDetalle = lazy(() => import("./pages/admin/AdminOrdenDetalle.jsx"));
const AdminProductosSolicitados = lazy(
  () => import("./pages/admin/AdminProductosSolicitados.jsx"),
);
const AdminLogs = lazy(() => import("./pages/admin/AdminLogs.jsx"));
const AdminVentas = lazy(() => import("./pages/admin/AdminVentas.jsx"));
const AdminEmbudo = lazy(() => import("./pages/admin/AdminEmbudo.jsx"));
const AdminClientes = lazy(() => import("./pages/admin/AdminClientes.jsx"));
const AdminOperacion = lazy(() => import("./pages/admin/AdminOperacion.jsx"));

// Admin routes reestructuradas per
// docs/superpowers/specs/2026-08-16-admin-sidebar-design.md: dejan de
// compartir el `Layout` público (Navbar/Footer) y pasan a vivir bajo
// `AdminLayout` (sidebar propia). Siguen requiriendo sesión vía
// `RequireAuth`, excepto /catalogo/admin/login.
function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Catalogo />} />
        <Route path="/coleccion" element={<Coleccion />} />
        <Route path="/coleccion/categoria/:slugCategoria" element={<Coleccion />} />
        <Route path="/favoritos" element={<Favoritos />} />
        <Route path="/carrito" element={<Carrito />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/checkout/confirmacion" element={<OrdenConfirmada />} />
        <Route path="/producto/:idSlug" element={<ProductoDetalle />} />
        {/* El login vive en el `Layout` público (con Navbar/Footer) porque
            todavía no hay sesión, pero es una pantalla del admin y también se
            carga bajo demanda. Como el resto de ese branch es síncrono, lleva
            su propio `Suspense` en vez de apoyarse en el de `AdminLayout`. */}
        <Route
          path="/catalogo/admin/login"
          element={
            <Suspense
              fallback={
                <div className="flex min-h-[50vh] items-center justify-center text-on-surface-variant">
                  <Spinner className="h-8 w-8" />
                </div>
              }
            >
              <AdminLogin />
            </Suspense>
          }
        />
        {/* Catch-all DENTRO del `Layout` público, para conservar Navbar/Footer.
            Antes era `<Navigate to="/" replace />`: toda URL inventada
            respondía 200 con la home (soft 404), y Google la indexaba como
            página real. `NoEncontrado` lleva `noindex` — ver ese archivo. */}
        <Route path="*" element={<NoEncontrado />} />
      </Route>
      <Route element={<RequireAuth />}>
        <Route element={<AdminLayout />}>
          <Route path="/catalogo/admin" element={<Navigate to="/catalogo/admin/productos" replace />} />
          <Route path="/catalogo/admin/productos" element={<AdminProductos />} />
          <Route path="/catalogo/admin/productos/nuevo" element={<AdminProductoForm />} />
          <Route path="/catalogo/admin/productos/importar" element={<AdminImportarProductos />} />
          <Route path="/catalogo/admin/productos/actualizar-masivo" element={<AdminActualizarProductos />} />
          <Route path="/catalogo/admin/productos/:id/editar" element={<AdminProductoForm />} />
          <Route path="/catalogo/admin/ordenes" element={<AdminOrdenes />} />
          {/* Segmento literal dentro de `/ordenes/`: convive con `/:id` de
              abajo porque react-router resuelve por especificidad, no por
              orden de declaración. Hay un test que lo fija. */}
          <Route
            path="/catalogo/admin/ordenes/productos-solicitados"
            element={<AdminProductosSolicitados />}
          />
          <Route path="/catalogo/admin/ordenes/:id" element={<AdminOrdenDetalle />} />
          <Route path="/catalogo/admin/ventas" element={<AdminVentas />} />
          <Route path="/catalogo/admin/embudo" element={<AdminEmbudo />} />
          <Route path="/catalogo/admin/clientes" element={<AdminClientes />} />
          <Route path="/catalogo/admin/operacion" element={<AdminOperacion />} />
          <Route path="/catalogo/admin/metricas" element={<AdminMetricas />} />
          <Route path="/catalogo/admin/logs" element={<AdminLogs />} />
          <Route path="/catalogo/admin/configuracion/categorias" element={<AdminCategorias />} />
          <Route path="/catalogo/admin/configuracion/anuncios" element={<AdminAnuncios />} />
          <Route path="/catalogo/admin/configuracion/usuarios" element={<AdminUsuarios />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
