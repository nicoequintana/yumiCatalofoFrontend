import { describe, expect, it, vi, beforeEach } from "vitest";
import { getAuditLogs, getErrorLogs } from "./adminLogs.js";
import { fetchAutenticado } from "./authClient.js";

vi.mock("./authClient.js");

const BASE = "http://localhost:4000/api";

function mockFetchAutenticadoOnce(body = {}, ok = true) {
  fetchAutenticado.mockResolvedValue({
    ok,
    text: async () => JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getAuditLogs", () => {
  it("sin filtros no agrega querystring", async () => {
    mockFetchAutenticadoOnce({ data: [], page: 1, pageSize: 20, total: 0 });

    await getAuditLogs();

    expect(fetchAutenticado).toHaveBeenCalledWith(`${BASE}/admin/audit-logs`, undefined);
  });

  it("manda page y entidad como query params", async () => {
    mockFetchAutenticadoOnce({ data: [], page: 2, pageSize: 20, total: 0 });

    await getAuditLogs({ page: 2, entidad: "Producto" });

    expect(fetchAutenticado).toHaveBeenCalledWith(
      `${BASE}/admin/audit-logs?entidad=Producto&page=2`,
      undefined,
    );
  });

  it("ignora una entidad vacía", async () => {
    mockFetchAutenticadoOnce({ data: [], page: 1, pageSize: 20, total: 0 });

    await getAuditLogs({ entidad: "" });

    expect(fetchAutenticado).toHaveBeenCalledWith(`${BASE}/admin/audit-logs`, undefined);
  });

  it("devuelve el body parseado", async () => {
    const body = { data: [{ id: 1 }], page: 1, pageSize: 20, total: 1 };
    mockFetchAutenticadoOnce(body);

    await expect(getAuditLogs()).resolves.toEqual(body);
  });

  it("lanza Error con el mensaje del backend ante un error", async () => {
    mockFetchAutenticadoOnce({ error: "No autorizado." }, false);

    await expect(getAuditLogs()).rejects.toThrow("No autorizado.");
  });
});

describe("getErrorLogs", () => {
  it("sin filtros no agrega querystring", async () => {
    mockFetchAutenticadoOnce({ data: [], page: 1, pageSize: 20, total: 0 });

    await getErrorLogs();

    expect(fetchAutenticado).toHaveBeenCalledWith(`${BASE}/admin/error-logs`, undefined);
  });

  it("manda page como query param", async () => {
    mockFetchAutenticadoOnce({ data: [], page: 3, pageSize: 20, total: 0 });

    await getErrorLogs({ page: 3 });

    expect(fetchAutenticado).toHaveBeenCalledWith(`${BASE}/admin/error-logs?page=3`, undefined);
  });

  it("lanza Error con el mensaje del backend ante un error", async () => {
    mockFetchAutenticadoOnce({ error: "No autorizado." }, false);

    await expect(getErrorLogs()).rejects.toThrow("No autorizado.");
  });
});
