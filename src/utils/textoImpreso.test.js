import { describe, expect, it } from "vitest";
import { textoQueSeImprime } from "./textoImpreso.js";

/**
 * Espejo de la lógica del flujo de n8n (spec §6.1). Si esto y el flujo
 * divergen, el panel le muestra al admin algo distinto de lo que va a salir
 * impreso — que es peor que no mostrar nada, porque da confianza falsa justo
 * antes de gastar.
 */
const especificacion = (nombre, valor) => ({ nombre, valor });
const item = (texto) => ({ texto });

describe("textoQueSeImprime", () => {
  it("toma hasta 3 beneficios", () => {
    const salida = textoQueSeImprime({
      beneficios: [item("A"), item("B"), item("C"), item("D")],
      caracteristicas: [],
      especificaciones: [],
    });
    expect(salida.beneficios).toEqual(["A", "B", "C"]);
  });

  it("cae a características cuando no hay beneficios", () => {
    const salida = textoQueSeImprime({
      beneficios: [],
      caracteristicas: [item("Acero inoxidable")],
      especificaciones: [],
    });
    expect(salida.beneficios).toEqual(["Acero inoxidable"]);
  });

  it("separa cotas de callouts por NOMBRE y valor, no solo por el valor", () => {
    // Los tres casos de abajo son reales del catálogo: con solo el valor,
    // "Caudal de aire" y "Alcance Bluetooth" se dibujaban como cotas.
    const salida = textoQueSeImprime({
      beneficios: [],
      caracteristicas: [],
      especificaciones: [
        especificacion("Medidas", "27 cm x 10 cm x 10 cm"),
        especificacion("Caudal de aire", "88,35 m³/h"),
        especificacion("Alcance Bluetooth", "Hasta 10 m"),
      ],
    });

    expect(salida.cotas.map((c) => c.nombre)).toEqual(["Medidas"]);
    expect(salida.callouts.map((c) => c.nombre)).toEqual(
      expect.arrayContaining(["Caudal de aire", "Alcance Bluetooth"]),
    );
  });

  it("compara el nombre por igualdad exacta, no por inclusión", () => {
    // Con inclusión, "Largo del cable" volvía a entrar como cota por "largo".
    const salida = textoQueSeImprime({
      beneficios: [],
      caracteristicas: [],
      especificaciones: [especificacion("Largo del cable", "1,2 m")],
    });
    expect(salida.cotas).toEqual([]);
    expect(salida.callouts.map((c) => c.nombre)).toEqual(["Largo del cable"]);
  });

  it("reconoce el nombre sin acentos y en cualquier caja", () => {
    const salida = textoQueSeImprime({
      beneficios: [],
      caracteristicas: [],
      especificaciones: [especificacion("Diámetro", "20 cm")],
    });
    expect(salida.cotas.map((c) => c.nombre)).toEqual(["Diámetro"]);
  });

  it("exige unidad de longitud en el valor para que sea cota", () => {
    const salida = textoQueSeImprime({
      beneficios: [],
      caracteristicas: [],
      especificaciones: [especificacion("Largo de pelaje", "Todos")],
    });
    expect(salida.cotas).toEqual([]);
  });

  it("las cotas conservan el orden del array; los callouts van por longitud", () => {
    // El orden de las cotas es semántico (alto, ancho, profundidad). Los
    // callouts se ordenan por largo y se toman los más cortos: un texto largo
    // no se trunca, se desprioriza entero.
    const salida = textoQueSeImprime({
      beneficios: [],
      caracteristicas: [],
      especificaciones: [
        especificacion("Altura", "30 cm"),
        especificacion("Ancho", "15 cm"),
        especificacion("Material", "Acero inoxidable aislado al vacío"),
        especificacion("Peso", "400 g"),
        especificacion("Carga", "USB-C"),
      ],
    });

    // "Peso: 400 g" son 11 caracteres y "Carga: USB-C" son 12, así que Peso va
    // primero. "Material: Acero inoxidable aislado al vacío" (43) queda afuera:
    // desprioriza por largo, no se trunca.
    expect(salida.cotas.map((c) => c.nombre)).toEqual(["Altura", "Ancho"]);
    expect(salida.callouts.map((c) => c.nombre)).toEqual(["Peso", "Carga"]);
  });

  it("con cotas presentes toma 2 callouts; sin cotas, 3", () => {
    const specs = [
      especificacion("Peso", "400 g"),
      especificacion("Carga", "USB-C"),
      especificacion("Voltaje", "5V"),
      especificacion("Material", "ABS"),
    ];

    const sinCotas = textoQueSeImprime({ beneficios: [], caracteristicas: [], especificaciones: specs });
    expect(sinCotas.callouts).toHaveLength(3);

    const conCotas = textoQueSeImprime({
      beneficios: [],
      caracteristicas: [],
      especificaciones: [especificacion("Altura", "30 cm"), ...specs],
    });
    expect(conCotas.callouts).toHaveLength(2);
  });

  it("cae a características cuando no hay especificaciones", () => {
    const salida = textoQueSeImprime({
      beneficios: [item("B")],
      caracteristicas: [item("Antideslizante"), item("Recargable")],
      especificaciones: [],
    });
    // También acá manda el sort por longitud: "Recargable" (12 con el prefijo)
    // va antes que "Antideslizante" (16). El fallback no cambia la regla.
    expect(salida.cotas).toEqual([]);
    expect(salida.callouts.map((c) => c.valor)).toEqual(["Recargable", "Antideslizante"]);
  });

  it("una ficha vacía no rompe", () => {
    expect(textoQueSeImprime({})).toEqual({ beneficios: [], cotas: [], callouts: [] });
  });
});
