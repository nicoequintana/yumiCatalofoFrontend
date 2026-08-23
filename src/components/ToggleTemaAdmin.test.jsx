import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ToggleTemaAdmin from "./ToggleTemaAdmin.jsx";
import { limpiarTema } from "../hooks/useTemaAdmin.js";

// Same environment quirk as useTemaAdmin.test.jsx: `globalThis.localStorage`
// is a plain empty object here, so a fake Storage is installed per test.
const localStorageOriginal = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

function instalarStorage() {
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    },
    configurable: true,
    writable: true,
  });
}

describe("ToggleTemaAdmin", () => {
  beforeEach(() => {
    limpiarTema();
    instalarStorage();
  });

  afterEach(() => {
    limpiarTema();
    if (localStorageOriginal) {
      Object.defineProperty(globalThis, "localStorage", localStorageOriginal);
    }
    vi.restoreAllMocks();
  });

  it("expone el estado del tema como switch accesible", () => {
    render(<ToggleTemaAdmin />);

    const boton = screen.getByRole("switch");
    expect(boton).toHaveAttribute("aria-checked", "false");
    expect(boton).toHaveAccessibleName(/oscuro/i);
  });

  it("alterna a oscuro al hacer click y lo refleja en aria-checked", async () => {
    const user = userEvent.setup();
    render(<ToggleTemaAdmin />);

    const boton = screen.getByRole("switch");
    await user.click(boton);

    expect(boton).toHaveAttribute("aria-checked", "true");
    expect(document.documentElement.dataset.temaAdmin).toBe("oscuro");
  });

  it("vuelve a claro en el segundo click", async () => {
    const user = userEvent.setup();
    render(<ToggleTemaAdmin />);

    const boton = screen.getByRole("switch");
    await user.click(boton);
    await user.click(boton);

    expect(boton).toHaveAttribute("aria-checked", "false");
    expect(document.documentElement.dataset.temaAdmin).toBeUndefined();
  });

  it("muestra el icono acorde al tema activo", async () => {
    const user = userEvent.setup();
    render(<ToggleTemaAdmin />);

    expect(screen.getByText("dark_mode")).toBeInTheDocument();

    await user.click(screen.getByRole("switch"));

    expect(screen.getByText("light_mode")).toBeInTheDocument();
  });

  it("oculta el texto del label cuando se pide la variante compacta", () => {
    render(<ToggleTemaAdmin compacto />);

    const boton = screen.getByRole("switch");
    expect(boton).toHaveAccessibleName(/oscuro/i);
    expect(screen.queryByText("Modo oscuro")).not.toBeInTheDocument();
  });
});
