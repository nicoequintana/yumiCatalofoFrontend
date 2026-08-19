import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Spinner from "./Spinner";

describe("Spinner", () => {
  it("renders an accessible status indicator", () => {
    render(<Spinner />);

    const status = screen.getByRole("status", { name: "Cargando" });

    expect(status).toBeInTheDocument();
  });
});
