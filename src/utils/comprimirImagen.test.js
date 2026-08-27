import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { comprimirImagen } from "./comprimirImagen.js";

/**
 * `comprimirImagen` redimensiona y reencodea en el navegador antes de subir,
 * para el flujo de generación de imágenes por n8n (ver SeccionGenerarImagenes.jsx
 * y CLAUDE.md, "Generación de imágenes vía n8n").
 *
 * jsdom no decodifica imágenes de verdad (un `<img src="blob:...">` nunca
 * dispara `onload` ni `onerror` acá — se comprobó a mano) ni implementa un
 * canvas 2D real (`getContext("2d")` devuelve `undefined` sin el paquete
 * `canvas`, que este proyecto no instala). Por eso CADA test reemplaza
 * `Image` por una clase falsa que simula la decodificación, y los tests que
 * necesitan un resultado de compresión concreto mockean
 * `HTMLCanvasElement.prototype.getContext`/`.toBlob`.
 *
 * El caso "el canvas no da contexto" es la excepción: ese SÍ es el
 * comportamiento real de jsdom sin mockear nada de canvas, así que ese test
 * no lo simula — lo aprovecha.
 */

/** Fabrica una clase `Image` falsa con tamaño natural fijo y decodificación async. */
function fabricarImagenFalsa({ width, height, forzarError = false }) {
  return class ImagenFalsa {
    constructor() {
      this.naturalWidth = width;
      this.naturalHeight = height;
      this.onload = null;
      this.onerror = null;
    }

    set src(_valor) {
      // Decodificar una imagen real es async en cualquier navegador; se
      // simula con una microtask para que el código bajo prueba tenga que
      // esperar la promesa igual que en producción.
      queueMicrotask(() => {
        if (forzarError) this.onerror?.(new Error("formato no soportado"));
        else this.onload?.();
      });
    }
  };
}

function archivo(bytes, nombre = "foto.jpg", tipo = "image/jpeg") {
  return new File([new Uint8Array(bytes)], nombre, { type: tipo });
}

let createObjectURLMock;
let revokeObjectURLMock;

beforeEach(() => {
  createObjectURLMock = vi.fn(() => "blob:fake-url");
  revokeObjectURLMock = vi.fn();
  URL.createObjectURL = createObjectURLMock;
  URL.revokeObjectURL = revokeObjectURLMock;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("comprimirImagen", () => {
  it("redimensiona al lado máximo y devuelve un File JPEG cuando el resultado pesa menos", async () => {
    // 4000x3000 (una foto de celular típica) con ladoMaximo=1600 tiene que
    // escalar a 1600x1200 — mantiene la proporción 4:3 del original.
    vi.stubGlobal("Image", fabricarImagenFalsa({ width: 4000, height: 3000 }));
    const drawImageMock = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: drawImageMock,
    });
    const blobComprimido = new Blob([new Uint8Array(1000)], { type: "image/jpeg" });
    let dimensionesEnToBlob = null;
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (callback) {
      dimensionesEnToBlob = { width: this.width, height: this.height };
      callback(blobComprimido);
    });

    const original = archivo(5000, "vaso-de-celular.png", "image/png");
    const resultado = await comprimirImagen(original, { ladoMaximo: 1600, calidad: 0.85 });

    expect(dimensionesEnToBlob).toEqual({ width: 1600, height: 1200 });
    expect(drawImageMock).toHaveBeenCalledTimes(1);
    expect(drawImageMock.mock.calls[0].slice(1)).toEqual([0, 0, 1600, 1200]);

    expect(resultado).toBeInstanceOf(File);
    expect(resultado).not.toBe(original);
    expect(resultado.type).toBe("image/jpeg");
    expect(resultado.size).toBe(blobComprimido.size);
    expect(resultado.size).toBeLessThan(original.size);
  });

  it("no agranda una imagen ya más chica que el lado máximo", async () => {
    // 800x600 ya es menor que ladoMaximo=1600: agrandarla no ahorra peso y
    // degrada nitidez de gusto. El canvas tiene que quedar en el tamaño
    // original.
    vi.stubGlobal("Image", fabricarImagenFalsa({ width: 800, height: 600 }));
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: vi.fn() });
    let dimensionesEnToBlob = null;
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (callback) {
      dimensionesEnToBlob = { width: this.width, height: this.height };
      callback(new Blob([new Uint8Array(10)], { type: "image/jpeg" }));
    });

    await comprimirImagen(archivo(5000), { ladoMaximo: 1600 });

    expect(dimensionesEnToBlob).toEqual({ width: 800, height: 600 });
  });

  it("devuelve el original si el resultado comprimido pesa igual o más", async () => {
    // Puede pasar con una imagen ya optimizada o muy chica: "comprimir" para
    // terminar más pesado sería absurdo.
    vi.stubGlobal("Image", fabricarImagenFalsa({ width: 800, height: 600 }));
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: vi.fn() });
    const original = archivo(1000);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (callback) {
      callback(new Blob([new Uint8Array(original.size + 1)], { type: "image/jpeg" }));
    });

    const resultado = await comprimirImagen(original);

    expect(resultado).toBe(original);
  });

  it("devuelve el original sin lanzar si la imagen no se puede decodificar", async () => {
    // Formato raro o archivo corrupto: el navegador dispara `onerror` en vez
    // de `onload`. Comprimir es una optimización — nunca debe impedir el envío.
    vi.stubGlobal("Image", fabricarImagenFalsa({ width: 0, height: 0, forzarError: true }));
    const original = archivo(1234, "raro.webp", "image/webp");

    await expect(comprimirImagen(original)).resolves.toBe(original);
  });

  it("devuelve el original sin lanzar si el canvas no puede dar un contexto 2D", async () => {
    // Esto NO se mockea: es el comportamiento real de jsdom en este proyecto
    // (sin el paquete `canvas`, `getContext("2d")` devuelve `undefined`), así
    // que sirve para probar la rama de degradación de verdad.
    vi.stubGlobal("Image", fabricarImagenFalsa({ width: 2000, height: 2000 }));
    const original = archivo(1234);

    await expect(comprimirImagen(original)).resolves.toBe(original);
  });

  it("revoca el object URL creado, tanto si termina bien como si falla", async () => {
    vi.stubGlobal("Image", fabricarImagenFalsa({ width: 800, height: 600 }));
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: vi.fn() });
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (callback) {
      callback(new Blob([new Uint8Array(1)], { type: "image/jpeg" }));
    });

    await comprimirImagen(archivo(5000));

    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:fake-url");

    createObjectURLMock.mockClear();
    revokeObjectURLMock.mockClear();
    vi.stubGlobal("Image", fabricarImagenFalsa({ width: 0, height: 0, forzarError: true }));

    await comprimirImagen(archivo(5000));

    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:fake-url");
  });
});
