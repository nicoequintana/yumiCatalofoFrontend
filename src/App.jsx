import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import AdminLayout from "./components/AdminLayout.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import Catalogo from "./pages/Catalogo.jsx";
import Coleccion from "./pages/Coleccion.jsx";
import Favoritos from "./pages/Favoritos.jsx";
import Carrito from "./pages/Carrito.jsx";
import Checkout from "./pages/Checkout.jsx";
import OrdenConfirmada from "./pages/OrdenConfirmada.jsx";
import ProductoDetalle from "./pages/ProductoDetalle.jsx";
import AdminLogin from "./pages/admin/AdminLogin.jsx";
import AdminProductos from "./pages/admin/AdminProductos.jsx";
import AdminProductoForm from "./pages/admin/AdminProductoForm.jsx";
import AdminCategorias from "./pages/admin/AdminCategorias.jsx";
import AdminMetricas from "./pages/admin/AdminMetricas.jsx";
import AdminUsuarios from "./pages/admin/AdminUsuarios.jsx";
import AdminOrdenes from "./pages/admin/AdminOrdenes.jsx";
import AdminOrdenDetalle from "./pages/admin/AdminOrdenDetalle.jsx";
import AdminLogs from "./pages/admin/AdminLogs.jsx";
import AdminVentas from "./pages/admin/AdminVentas.jsx";

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
        <Route path="/favoritos" element={<Favoritos />} />
        <Route path="/carrito" element={<Carrito />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/checkout/confirmacion" element={<OrdenConfirmada />} />
        <Route path="/producto/:id" element={<ProductoDetalle />} />
        <Route path="/catalogo/admin/login" element={<AdminLogin />} />
      </Route>
      <Route element={<RequireAuth />}>
        <Route element={<AdminLayout />}>
          <Route path="/catalogo/admin" element={<Navigate to="/catalogo/admin/productos" replace />} />
          <Route path="/catalogo/admin/productos" element={<AdminProductos />} />
          <Route path="/catalogo/admin/productos/nuevo" element={<AdminProductoForm />} />
          <Route path="/catalogo/admin/productos/:id/editar" element={<AdminProductoForm />} />
          <Route path="/catalogo/admin/ordenes" element={<AdminOrdenes />} />
          <Route path="/catalogo/admin/ordenes/:id" element={<AdminOrdenDetalle />} />
          <Route path="/catalogo/admin/ventas" element={<AdminVentas />} />
          <Route path="/catalogo/admin/metricas" element={<AdminMetricas />} />
          <Route path="/catalogo/admin/logs" element={<AdminLogs />} />
          <Route path="/catalogo/admin/configuracion/categorias" element={<AdminCategorias />} />
          <Route path="/catalogo/admin/configuracion/usuarios" element={<AdminUsuarios />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
