import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import useBloquearScroll from "./useBloquearScroll.js";

afterEach(() => {
  document.body.style.overflow = "";
});

describe("useBloquearScroll", () => {
  it("bloquea el scroll del body cuando activo es true", () => {
    renderHook(() => useBloquearScroll(true));

    expect(document.body.style.overflow).toBe("hidden");
  });

  it("no toca el scroll del body cuando activo es false", () => {
    renderHook(() => useBloquearScroll(false));

    expect(document.body.style.overflow).toBe("");
  });

  it("restaura el valor anterior al pasar de activo a inactivo", () => {
    const { rerender } = renderHook(({ activo }) => useBloquearScroll(activo), {
      initialProps: { activo: true },
    });
    expect(document.body.style.overflow).toBe("hidden");

    rerender({ activo: false });

    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("restaura un valor previo distinto de vacío, no solo lo limpia", () => {
    document.body.style.overflow = "scroll";

    const { rerender } = renderHook(({ activo }) => useBloquearScroll(activo), {
      initialProps: { activo: true },
    });
    expect(document.body.style.overflow).toBe("hidden");

    rerender({ activo: false });

    expect(document.body.style.overflow).toBe("scroll");
  });

  it("restaura el valor previo al desmontar mientras estaba activo", () => {
    document.body.style.overflow = "auto";

    const { unmount } = renderHook(() => useBloquearScroll(true));
    expect(document.body.style.overflow).toBe("hidden");

    unmount();

    expect(document.body.style.overflow).toBe("auto");
  });
});
