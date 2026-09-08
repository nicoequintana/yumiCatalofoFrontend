import { render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigationType } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App.jsx";
import { getToken } from "./api/authClient.js";

// Mismo patrón que RequireAuth.test.jsx: se mockea el módulo de auth entero
// para no depender del localStorage roto de este entorno (ver el comentario
// de useTemaAdmin.test.jsx) y para poder simular una sesión vigente sin pasar
// por el login real.
vi.mock("./api/authClient.js");

// Las pantallas de analytics fetchean datos reales al montar y no son lo que
// este test verifica — acá solo importa a qué RUTA resuelve cada navegación,
// no qué pinta la pantalla de destino. Se reemplazan por una cáscara mínima
// que expone su propio nombre: así el test confirma, de paso, que la ruta
// nueva cae en la pantalla correcta y no en otra (la trampa de
// `/analytics/campanias` contra `/campanias`, el editor).
vi.mock("./pages/admin/AdminVentas.jsx", () => ({
  default: () => <p>pantalla: ventas</p>,
}));
vi.mock("./pages/admin/AdminEmbudo.jsx", () => ({
  default: () => <p>pantalla: embudo</p>,
}));
vi.mock("./pages/admin/AdminClientes.jsx", () => ({
  default: () => <p>pantalla: clientes</p>,
}));
vi.mock("./pages/admin/AdminOperacion.jsx", () => ({
  default: () => <p>pantalla: operación</p>,
}));
vi.mock("./pages/admin/AdminMetricas.jsx", () => ({
  default: () => <p>pantalla: métricas</p>,
}));
vi.mock("./pages/admin/AdminMetricasComerciales.jsx", () => ({
  default: () => <p>pantalla: métricas comerciales</p>,
}));
vi.mock("./pages/admin/AdminCampanias.jsx", () => ({
  default: () => <p>pantalla: editor de campañas</p>,
}));

/**
 * JWT de juguete con `exp` futuro, codificado en base64url real — mismo
 * helper que `RequireAuth.test.jsx` — así `RequireAuth` deja pasar sin tocar
 * el login de verdad.
 */
function tokenValido() {
  const payload = { id: 1, email: "admin@yima.com", exp: Math.floor(Date.now() / 1000) + 3600 };
  const base64url = btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `cabecera-falsa.${base64url}.firma-falsa`;
}

/**
 * Sonda que expone la ubicación y el tipo de navegación vigentes, montada
 * como HERMANA de `<App/>` dentro del mismo `MemoryRouter` (no adentro): la
 * ubicación cambia apenas corre el efecto de `Navigate`, mientras que la
 * pantalla de destino puede seguir un instante más detrás de su `Suspense`
 * (`lazy`). Leer la ubicación desde afuera evita que el assert dependa de que
 * ese chunk ya haya resuelto.
 */
function SondaDeRuta() {
  const location = useLocation();
  const tipoDeNavegacion = useNavigationType();
  return (
    <p data-testid="sonda-ruta">
      {location.pathname} · {tipoDeNavegacion}
    </p>
  );
}

function renderEnRuta(ruta) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <SondaDeRuta />
      <App />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(getToken).mockReturnValue(tokenValido());
});

describe("redirecciones de las pantallas de analytics", () => {
  // `replace` no es opcional: sin él el botón "atrás" del navegador rebota
  // entre la ruta vieja y la nueva. Por eso cada caso afirma también el tipo
  // de navegación, no solo el destino.
  it.each([
    ["/catalogo/admin/ventas", "/catalogo/admin/analytics/ventas", "pantalla: ventas"],
    ["/catalogo/admin/embudo", "/catalogo/admin/analytics/embudo", "pantalla: embudo"],
    ["/catalogo/admin/clientes", "/catalogo/admin/analytics/clientes", "pantalla: clientes"],
    ["/catalogo/admin/operacion", "/catalogo/admin/analytics/operacion", "pantalla: operación"],
    ["/catalogo/admin/metricas", "/catalogo/admin/analytics/metricas", "pantalla: métricas"],
  ])("%s redirige a %s", async (vieja, nueva, pantalla) => {
    renderEnRuta(vieja);

    expect(await screen.findByText(pantalla)).toBeInTheDocument();
    expect(screen.getByTestId("sonda-ruta")).toHaveTextContent(`${nueva} · REPLACE`);
  });

  it("/catalogo/admin/analytics sin sufijo cae en ventas", async () => {
    renderEnRuta("/catalogo/admin/analytics");

    expect(await screen.findByText("pantalla: ventas")).toBeInTheDocument();
    expect(screen.getByTestId("sonda-ruta")).toHaveTextContent(
      "/catalogo/admin/analytics/ventas · REPLACE",
    );
  });
});

describe("las seis rutas nuevas resuelven a su propia pantalla", () => {
  it.each([
    ["/catalogo/admin/analytics/ventas", "pantalla: ventas"],
    ["/catalogo/admin/analytics/embudo", "pantalla: embudo"],
    ["/catalogo/admin/analytics/clientes", "pantalla: clientes"],
    ["/catalogo/admin/analytics/operacion", "pantalla: operación"],
    ["/catalogo/admin/analytics/metricas", "pantalla: métricas"],
    ["/catalogo/admin/analytics/campanias", "pantalla: métricas comerciales"],
  ])("%s muestra %s", async (ruta, pantalla) => {
    renderEnRuta(ruta);

    expect(await screen.findByText(pantalla)).toBeInTheDocument();
  });
});

describe("la trampa: /analytics/campanias no le roba la ruta al editor", () => {
  it("/catalogo/admin/campanias sigue siendo el editor, no la métrica", async () => {
    renderEnRuta("/catalogo/admin/campanias");

    expect(await screen.findByText("pantalla: editor de campañas")).toBeInTheDocument();
    expect(screen.queryByText("pantalla: métricas comerciales")).toBeNull();
  });

  it("/catalogo/admin/analytics/campanias es la métrica, no el editor", async () => {
    renderEnRuta("/catalogo/admin/analytics/campanias");

    expect(await screen.findByText("pantalla: métricas comerciales")).toBeInTheDocument();
    expect(screen.queryByText("pantalla: editor de campañas")).toBeNull();
  });
});
