import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Catalogo from "./pages/Catalogo.jsx";
import Favoritos from "./pages/Favoritos.jsx";
import ProductoDetalle from "./pages/ProductoDetalle.jsx";
import AdminProductos from "./pages/admin/AdminProductos.jsx";
import AdminProductoForm from "./pages/admin/AdminProductoForm.jsx";
import AdminCategorias from "./pages/admin/AdminCategorias.jsx";
import AdminMetricas from "./pages/admin/AdminMetricas.jsx";

// Admin routes wired per PR 4 (Phase 5). They reuse the same public `Layout`
// (Navbar + Outlet + Footer) — nothing in design.md calls for distinct admin
// chrome — and stay unlinked from public nav (CLAUDE.md: hidden route, no
// auth by client decision).
function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Catalogo />} />
        <Route path="/favoritos" element={<Favoritos />} />
        <Route path="/producto/:id" element={<ProductoDetalle />} />
        <Route path="/catalogo/admin" element={<AdminProductos />} />
        <Route path="/catalogo/admin/nuevo" element={<AdminProductoForm />} />
        <Route path="/catalogo/admin/:id/editar" element={<AdminProductoForm />} />
        <Route path="/catalogo/admin/categorias" element={<AdminCategorias />} />
        <Route path="/catalogo/admin/metricas" element={<AdminMetricas />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
