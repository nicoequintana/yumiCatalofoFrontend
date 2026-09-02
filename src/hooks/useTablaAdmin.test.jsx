import { renderHook, act, waitFor } from "@testing-library/react";
import { MemoryRouter, useSearchParams } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { useTablaAdmin, DEBOUNCE_BUSQUEDA_MS } from "./useTablaAdmin.js";

function envoltura(rutaInicial = "/") {
  return function Envoltura({ children }) {
    return <MemoryRouter initialEntries={[rutaInicial]}>{children}</MemoryRouter>;
  };
}

function montar(opciones = {}, ruta = "/") {
  return renderHook(() => useTablaAdmin(opciones), { wrapper: envoltura(ruta) });
}

describe("useTablaAdmin — lectura de la URL", () => {
  it("lee página, búsqueda y orden de la querystring", () => {
    const { result } = montar({}, "/?page=3&search=botella&orden=nombre");

    expect(result.current.pagina).toBe(3);
    expect(result.current.busqueda).toBe("botella");
    expect(result.current.orden).toBe("nombre");
  });

  it("cae a la página 1 con un valor inválido", () => {
    const { result } = montar({}, "/?page=abc");
    expect(result.current.pagina).toBe(1);
  });

  it("cae a la página 1 con un valor negativo", () => {
    const { result } = montar({}, "/?page=-5");
    expect(result.current.pagina).toBe(1);
  });

  it("usa el orden por defecto que le pasa la pantalla", () => {
    const { result } = montar({ ordenPorDefecto: "catalogo" });
    expect(result.current.orden).toBe("catalogo");
  });

  // El input arranca con lo que dice la URL: una caja vacía sobre una tabla
  // filtrada se lee como un bug.
  it("inicializa el input de búsqueda desde la URL", () => {
    const { result } = montar({}, "/?search=cuchillo");
    expect(result.current.busquedaInput).toBe("cuchillo");
  });
});

describe("useTablaAdmin — debounce de la búsqueda", () => {
  it("no escribe en la URL en cada tecla", async () => {
    const { result } = montar();

    act(() => result.current.setBusquedaInput("bot"));

    expect(result.current.busqueda).toBe("");
  });

  it("commitea a la URL después del debounce", async () => {
    const { result } = montar();

    act(() => result.current.setBusquedaInput("botella"));

    await waitFor(() => expect(result.current.busqueda).toBe("botella"), {
      timeout: DEBOUNCE_BUSQUEDA_MS + 800,
    });
  });

  // LA REGRESIÓN QUE ESTE PATRÓN EVITA. Navegar a la misma ruta sin `?search=`
  // (un link del sidebar, el botón Atrás) NO desmonta el componente: sin la
  // guarda de `ultimoCommit`, el input conservaba el término y el debounce lo
  // reescribía en la URL 350 ms después, resucitando un filtro que la persona
  // acababa de limpiar.
  it("adopta la búsqueda cuando la URL cambia por navegación, sin reescribirla", async () => {
    const { result } = renderHook(
      () => {
        const [, setSearchParams] = useSearchParams();
        return { tabla: useTablaAdmin(), setSearchParams };
      },
      { wrapper: envoltura("/?search=viejo") },
    );

    expect(result.current.tabla.busquedaInput).toBe("viejo");

    act(() => result.current.setSearchParams(new URLSearchParams()));

    await waitFor(() => expect(result.current.tabla.busquedaInput).toBe(""));
    // Pasado el debounce, la URL sigue limpia: el input no la reescribió.
    await new Promise((r) => setTimeout(r, DEBOUNCE_BUSQUEDA_MS + 150));
    expect(result.current.tabla.busqueda).toBe("");
  });
});

describe("useTablaAdmin — selección", () => {
  it("alterna la selección de una fila", () => {
    const { result } = montar();

    act(() => result.current.alternarSeleccion(7));
    expect(result.current.seleccionados.has(7)).toBe(true);

    act(() => result.current.alternarSeleccion(7));
    expect(result.current.seleccionados.has(7)).toBe(false);
  });

  it("selecciona y limpia un conjunto completo", () => {
    const { result } = montar();

    act(() => result.current.seleccionarTodos([1, 2, 3]));
    expect(result.current.seleccionados.size).toBe(3);

    act(() => result.current.limpiarSeleccion());
    expect(result.current.seleccionados.size).toBe(0);
  });

  // Ejecutar una acción masiva sobre filas que ya no se ven es exactamente el
  // accidente que un checkbox puede causar.
  it("limpia la selección al cambiar de página", async () => {
    const { result } = montar();

    act(() => result.current.seleccionarTodos([1, 2]));
    act(() => result.current.irAPagina(2));

    await waitFor(() => expect(result.current.seleccionados.size).toBe(0));
  });

  it("limpia la selección al cambiar la búsqueda", async () => {
    const { result } = montar();

    act(() => result.current.seleccionarTodos([1, 2]));
    act(() => result.current.setBusquedaInput("otra cosa"));

    await waitFor(() => expect(result.current.seleccionados.size).toBe(0), {
      timeout: DEBOUNCE_BUSQUEDA_MS + 800,
    });
  });
});

describe("useTablaAdmin — navegación", () => {
  it("cambiar de página escribe page en la URL", async () => {
    const { result } = montar();

    act(() => result.current.irAPagina(4));

    await waitFor(() => expect(result.current.pagina).toBe(4));
  });

  // La página 4 del resultado anterior puede no existir en el nuevo: quedarse
  // ahí mostraría una grilla vacía como si el filtro no encontrara nada.
  it("cambiar el orden vuelve a la página 1", async () => {
    const { result } = montar({}, "/?page=5");

    act(() => result.current.cambiarOrden("precio-asc"));

    await waitFor(() => expect(result.current.orden).toBe("precio-asc"));
    expect(result.current.pagina).toBe(1);
  });

  it("buscar vuelve a la página 1", async () => {
    const { result } = montar({}, "/?page=5");

    act(() => result.current.setBusquedaInput("algo"));

    await waitFor(() => expect(result.current.busqueda).toBe("algo"), {
      timeout: DEBOUNCE_BUSQUEDA_MS + 800,
    });
    expect(result.current.pagina).toBe(1);
  });
});
