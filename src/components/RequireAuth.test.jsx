import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import RequireAuth from "./RequireAuth.jsx";
import { clearToken, getToken } from "../api/authClient.js";

// Mismo patrón que `products.test.js`: el módulo de auth se mockea entero.
// Además evita el `localStorage` roto de este entorno de test (ver el
// comentario de `useTemaAdmin.test.jsx`).
vi.mock("../api/authClient.js");

/**
 * Arma un JWT de juguete con el payload dado, codificado en base64url REAL
 * (sin padding, con `-`/`_` en lugar de `+`/`/`): si la decodificación usara
 * `atob` a secas sin restaurar el padding, estos tokens la harían explotar.
 * La firma es basura a propósito — RequireAuth no debe verificarla (solo UX;
 * la autoridad sigue siendo el backend).
 */
function tokenConPayload(payload) {
  const base64url = btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `cabecera-falsa.${base64url}.firma-falsa`;
}

function renderProtegido() {
  return render(
    <MemoryRouter initialEntries={["/catalogo/admin"]}>
      <Routes>
        <Route path="/catalogo/admin/login" element={<h1>Login</h1>} />
        <Route element={<RequireAuth />}>
          <Route path="/catalogo/admin" element={<h1>Panel</h1>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

const AHORA_SEGUNDOS = Math.floor(Date.now() / 1000);

describe("RequireAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sin token redirige a login (comportamiento preexistente)", () => {
    vi.mocked(getToken).mockReturnValue(null);

    renderProtegido();

    expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
  });

  it("con token de exp futuro renderiza la ruta protegida", () => {
    vi.mocked(getToken).mockReturnValue(
      tokenConPayload({ id: 1, email: "admin@yima.com", exp: AHORA_SEGUNDOS + 3600 }),
    );

    renderProtegido();

    expect(screen.getByRole("heading", { name: "Panel" })).toBeInTheDocument();
    expect(clearToken).not.toHaveBeenCalled();
  });

  it("con token vencido limpia el token y redirige a login", () => {
    vi.mocked(getToken).mockReturnValue(
      tokenConPayload({ id: 1, email: "admin@yima.com", exp: AHORA_SEGUNDOS - 60 }),
    );

    renderProtegido();

    expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
    expect(clearToken).toHaveBeenCalled();
  });

  it("con token malformado (no decodifica) limpia y redirige a login", () => {
    vi.mocked(getToken).mockReturnValue("esto-no-es-un-jwt");

    renderProtegido();

    expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
    expect(clearToken).toHaveBeenCalled();
  });

  it("con payload sin exp lo trata como vencido", () => {
    vi.mocked(getToken).mockReturnValue(
      tokenConPayload({ id: 1, email: "admin@yima.com" }),
    );

    renderProtegido();

    expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
    expect(clearToken).toHaveBeenCalled();
  });

  it("con payload que no es JSON limpia y redirige a login", () => {
    // Base64url válido pero cuyo contenido no es JSON.
    const noJson = btoa("hola mundo").replace(/=+$/, "");
    vi.mocked(getToken).mockReturnValue(`cabecera.${noJson}.firma`);

    renderProtegido();

    expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
    expect(clearToken).toHaveBeenCalled();
  });
});
