import { beforeEach, describe, expect, it, vi } from "vitest";
import * as clienteAuth from "./clienteAuth.js";
import {
  actualizarPerfil,
  cambiarEmail,
  cambiarPassword,
  confirmarEmail,
  getPedidoPorId,
  getPedidos,
  getPerfil,
  loginCodigo,
  loginCuenta,
  loginGoogle,
  olvidePassword,
  reenviarCodigo,
  reenviarVerificacion,
  registrarCuenta,
  restablecerPassword,
  salirCuenta,
  verificarCuenta,
} from "./cuenta.js";

vi.mock("./clienteAuth.js", () => ({ pedirCliente: vi.fn() }));

const BASE = "http://localhost:4000/api/cuenta";

function ultimaLlamada() {
  return clienteAuth.pedirCliente.mock.calls.at(-1);
}

beforeEach(() => {
  vi.mocked(clienteAuth.pedirCliente).mockReset();
  vi.mocked(clienteAuth.pedirCliente).mockResolvedValue({});
});

describe("api/cuenta.js — un endpoint por función", () => {
  it("registrarCuenta postea a /registro con los cinco campos", async () => {
    await registrarCuenta({ email: "a@gmail.com", password: "x", nombre: "A", telefono: "1", dni: "111" });
    const [url, options] = ultimaLlamada();
    expect(url).toBe(`${BASE}/registro`);
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({
      email: "a@gmail.com",
      password: "x",
      nombre: "A",
      telefono: "1",
      dni: "111",
    });
  });

  it("verificarCuenta postea el token a /verificar", async () => {
    await verificarCuenta("tok-1");
    const [url, options] = ultimaLlamada();
    expect(url).toBe(`${BASE}/verificar`);
    expect(JSON.parse(options.body)).toEqual({ token: "tok-1" });
  });

  it("reenviarVerificacion postea el email a /reenviar-verificacion", async () => {
    await reenviarVerificacion("a@gmail.com");
    const [url, options] = ultimaLlamada();
    expect(url).toBe(`${BASE}/reenviar-verificacion`);
    expect(JSON.parse(options.body)).toEqual({ email: "a@gmail.com" });
  });

  it("loginCuenta postea a /login", async () => {
    await loginCuenta({ email: "a@gmail.com", password: "x" });
    const [url, options] = ultimaLlamada();
    expect(url).toBe(`${BASE}/login`);
    expect(JSON.parse(options.body)).toEqual({ email: "a@gmail.com", password: "x" });
  });

  it("loginCodigo postea a /login/codigo", async () => {
    await loginCodigo({ email: "a@gmail.com", codigo: "123456" });
    const [url, options] = ultimaLlamada();
    expect(url).toBe(`${BASE}/login/codigo`);
    expect(JSON.parse(options.body)).toEqual({ email: "a@gmail.com", codigo: "123456" });
  });

  it("reenviarCodigo postea a /login/codigo/reenviar", async () => {
    await reenviarCodigo("a@gmail.com");
    const [url, options] = ultimaLlamada();
    expect(url).toBe(`${BASE}/login/codigo/reenviar`);
    expect(JSON.parse(options.body)).toEqual({ email: "a@gmail.com" });
  });

  it("loginGoogle postea el credential a /google", async () => {
    await loginGoogle("cred-abc");
    const [url, options] = ultimaLlamada();
    expect(url).toBe(`${BASE}/google`);
    expect(JSON.parse(options.body)).toEqual({ credential: "cred-abc" });
  });

  it("salirCuenta postea a /salir sin body", async () => {
    await salirCuenta();
    const [url, options] = ultimaLlamada();
    expect(url).toBe(`${BASE}/salir`);
    expect(options.method).toBe("POST");
    expect(options.body).toBeUndefined();
  });

  it("salirCuenta devuelve el null del 204 sin inventarle un objeto", async () => {
    // El backend contesta 204 y `pedirCliente` devuelve `null`. Si esta capa
    // lo envolviera, la pantalla de "Cerrar sesión" leería un objeto fantasma.
    vi.mocked(clienteAuth.pedirCliente).mockResolvedValue(null);
    await expect(salirCuenta()).resolves.toBeNull();
  });

  it("getPerfil pide GET a la base", async () => {
    await getPerfil();
    const [url, options] = ultimaLlamada();
    expect(url).toBe(BASE);
    expect(options.method).toBe("GET");
  });

  it("actualizarPerfil hace PUT a la base con los tres campos opcionales", async () => {
    await actualizarPerfil({ nombre: "A", telefono: undefined, dni: undefined });
    const [url, options] = ultimaLlamada();
    expect(url).toBe(BASE);
    expect(options.method).toBe("PUT");
    expect(JSON.parse(options.body)).toEqual({ nombre: "A" });
  });

  it("olvidePassword postea a /olvide", async () => {
    await olvidePassword("a@gmail.com");
    const [url, options] = ultimaLlamada();
    expect(url).toBe(`${BASE}/olvide`);
    expect(JSON.parse(options.body)).toEqual({ email: "a@gmail.com" });
  });

  it("restablecerPassword postea a /restablecer y devuelve el { ok: true } del backend", async () => {
    // El backend contesta `{ ok: true }` (cuentaRecuperacion.controller.js), NO
    // `{ mensaje }` como dice la tabla del plan: la pantalla lee `ok`.
    vi.mocked(clienteAuth.pedirCliente).mockResolvedValue({ ok: true });
    const respuesta = await restablecerPassword({ token: "tok-1", password: "x" });
    const [url, options] = ultimaLlamada();
    expect(url).toBe(`${BASE}/restablecer`);
    expect(JSON.parse(options.body)).toEqual({ token: "tok-1", password: "x" });
    expect(respuesta).toEqual({ ok: true });
  });

  it("cambiarEmail hace PUT a /email", async () => {
    await cambiarEmail({ emailNuevo: "b@gmail.com", password: "x" });
    const [url, options] = ultimaLlamada();
    expect(url).toBe(`${BASE}/email`);
    expect(options.method).toBe("PUT");
    expect(JSON.parse(options.body)).toEqual({ emailNuevo: "b@gmail.com", password: "x" });
  });

  it("confirmarEmail postea a /email/confirmar", async () => {
    await confirmarEmail("tok-1");
    const [url, options] = ultimaLlamada();
    expect(url).toBe(`${BASE}/email/confirmar`);
    expect(JSON.parse(options.body)).toEqual({ token: "tok-1" });
  });

  it("cambiarPassword hace PUT a /password", async () => {
    await cambiarPassword({ actual: "x", nueva: "y" });
    const [url, options] = ultimaLlamada();
    expect(url).toBe(`${BASE}/password`);
    expect(options.method).toBe("PUT");
    expect(JSON.parse(options.body)).toEqual({ actual: "x", nueva: "y" });
  });

  it("getPedidos pide GET a /ordenes sin query cuando no hay filtros", async () => {
    await getPedidos();
    expect(ultimaLlamada()[0]).toBe(`${BASE}/ordenes`);
  });

  it("getPedidos manda page y pageSize cuando vienen", async () => {
    await getPedidos({ page: 2, pageSize: 10 });
    expect(ultimaLlamada()[0]).toBe(`${BASE}/ordenes?page=2&pageSize=10`);
  });

  it("getPedidoPorId pide GET a /ordenes/:id", async () => {
    await getPedidoPorId(42);
    expect(ultimaLlamada()[0]).toBe(`${BASE}/ordenes/42`);
  });

  it("devuelve tal cual el cuerpo que dio pedirCliente, sin reenvolverlo", async () => {
    // Las 13 pantallas ramifican sobre el cuerpo del backend (`requiereCodigo`,
    // `completar`, el sobre paginado). Cualquier envoltorio acá las rompería.
    const perfil = { id: 1, email: "a@gmail.com", tieneGoogle: false };
    vi.mocked(clienteAuth.pedirCliente).mockResolvedValue(perfil);
    await expect(getPerfil()).resolves.toBe(perfil);
  });

  it("deja pasar el error de pedirCliente con status, codigo y motivo intactos", async () => {
    // Esta capa NO traduce ni atrapa: `clienteAuth.js` es el único que decide
    // sobre SESION_INVALIDA, y cada pantalla ramifica sobre `err.motivo`.
    const err = new Error("El link venció.");
    err.status = 400;
    err.motivo = "VENCIDO";
    vi.mocked(clienteAuth.pedirCliente).mockRejectedValue(err);
    await expect(verificarCuenta("tok-viejo")).rejects.toBe(err);
  });
});
