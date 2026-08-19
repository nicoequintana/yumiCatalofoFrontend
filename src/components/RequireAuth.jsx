import { Navigate, Outlet } from "react-router-dom";
import { getToken } from "../api/authClient.js";

/**
 * Chequeo básico de presencia de token en localStorage — la validación real
 * de firma/expiración la hace el backend en cada request (ver
 * fetchAutenticado, que redirige a login ante un 401).
 */
function RequireAuth() {
  if (!getToken()) {
    return <Navigate to="/catalogo/admin/login" replace />;
  }
  return <Outlet />;
}

export default RequireAuth;
