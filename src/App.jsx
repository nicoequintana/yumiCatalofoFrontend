import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import Catalogo from "./pages/Catalogo.jsx";
import Favoritos from "./pages/Favoritos.jsx";
import ProductoDetalle from "./pages/ProductoDetalle.jsx";
import AdminLogin from "./pages/admin/AdminLogin.jsx";
import AdminProductos from "./pages/admin/AdminProductos.jsx";
import AdminProductoForm from "./pages/admin/AdminProductoForm.jsx";
import AdminCategorias from "./pages/admin/AdminCategorias.jsx";
import AdminMetricas from "./pages/admin/AdminMetricas.jsx";
import AdminUsuarios from "./pages/admin/AdminUsuarios.jsx";

// Admin routes wired per PR 4 (Phase 5), reusing the same public `Layout`
// (Navbar + Outlet + Footer) — nothing in design.md calls for distinct admin
// chrome. They now require a logged-in admin session (see
// docs/superpowers/specs/2026-08-15-auth-admin-design.md): every admin route
// except /catalogo/admin/login is nested under `RequireAuth`, which redirects
// to login when there's no token in localStorage.
function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Catalogo />} />
        <Route path="/favoritos" element={<Favoritos />} />
        <Route path="/producto/:id" element={<ProductoDetalle />} />
        <Route path="/catalogo/admin/login" element={<AdminLogin />} />
        <Route element={<RequireAuth />}>
          <Route path="/catalogo/admin" element={<AdminProductos />} />
          <Route path="/catalogo/admin/nuevo" element={<AdminProductoForm />} />
          <Route path="/catalogo/admin/:id/editar" element={<AdminProductoForm />} />
          <Route path="/catalogo/admin/categorias" element={<AdminCategorias />} />
          <Route path="/catalogo/admin/metricas" element={<AdminMetricas />} />
          <Route path="/catalogo/admin/usuarios" element={<AdminUsuarios />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
