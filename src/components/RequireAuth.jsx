import { Navigate, Outlet } from "react-router-dom";
import { clearToken, getToken } from "../api/authClient.js";

/**
 * Decodifica el payload de un JWT y responde si ya venció.
 *
 * Es SOLO UX — no se verifica la firma: la autoridad sigue siendo el backend
 * (ver `fetchAutenticado`, que ante un 401 limpia el token y redirige). Sin
 * este chequeo, un token vencido pasaba el guard de presencia y el admin
 * navegaba pantallas de lectura que fallaban una por una hasta el primer 401.
 *
 * Un token que no se puede decodificar (no tiene tres partes, el base64url no
 * decodifica, el payload no es JSON o no trae `exp` numérico) se trata como
 * vencido: no hay forma de saber si sigue vivo y el backend lo va a rechazar
 * igual.
 */
function tokenVencido(token) {
  const partes = token.split(".");
  if (partes.length !== 3) return true;

  try {
    // El payload viene en base64url: `atob` solo entiende base64 clásico, así
    // que hay que devolver `-`/`_` a `+`/`/` y restaurar el padding.
    const base64 = partes[1].replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(base64 + padding));

    if (typeof payload?.exp !== "number") return true;
    return payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

/**
 * Guard de las rutas del panel admin. Chequea presencia del token y, además,
 * su `exp` (decodificado sin verificar firma — solo UX): un token vencido se
 * limpia y manda a login de una, en vez de dejar entrar a un panel donde cada
 * request va a morir en 401.
 */
function RequireAuth() {
  const token = getToken();

  if (!token) {
    return <Navigate to="/catalogo/admin/login" replace />;
  }

  if (tokenVencido(token)) {
    clearToken();
    return <Navigate to="/catalogo/admin/login" replace />;
  }

  return <Outlet />;
}

export default RequireAuth;
