import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import CampoPassword from "./CampoPassword.jsx";

/**
 * Campo de contraseña con el ojito para verla.
 *
 * Las dos mitades que este componente resuelve —mostrar/ocultar y decirle al
 * navegador qué clase de campo es— van juntas a propósito: son las dos cosas
 * que hay que acertar en TODO campo de contraseña, y separarlas fue justo lo
 * que dejó el alta de usuarios autocompletándose con la credencial del admin
 * logueado.
 */
describe("CampoPassword", () => {
  it("arranca oculto", () => {
    render(<CampoPassword value="secreto" onChange={() => {}} etiqueta="Contraseña" />);

    expect(screen.getByLabelText("Contraseña")).toHaveAttribute("type", "password");
  });

  it("el ojito la muestra y la vuelve a ocultar", async () => {
    const usuario = userEvent.setup();
    render(<CampoPassword value="secreto" onChange={() => {}} etiqueta="Contraseña" />);

    await usuario.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect(screen.getByLabelText("Contraseña")).toHaveAttribute("type", "text");

    await usuario.click(screen.getByRole("button", { name: "Ocultar contraseña" }));
    expect(screen.getByLabelText("Contraseña")).toHaveAttribute("type", "password");
  });

  /**
   * El botón NO puede ser `type="submit"` implícito.
   *
   * Un `<button>` sin `type` dentro de un `<form>` es submit por default: tocar
   * el ojito para revisar lo que se tipeó enviaría el formulario. En el login
   * eso es un intento fallido contra un rate limit de 8 por 15 minutos.
   */
  it("no envía el formulario que lo contiene", async () => {
    const usuario = userEvent.setup();
    const onSubmit = vi.fn((e) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <CampoPassword value="secreto" onChange={() => {}} etiqueta="Contraseña" />
      </form>,
    );

    await usuario.click(screen.getByRole("button", { name: "Mostrar contraseña" }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("no roba el foco del tabulado", () => {
    // Tabular de la contraseña al botón de enviar no debería pasar por el
    // ojito: es una ayuda visual, y quien navega con teclado no la necesita en
    // el camino.
    render(<CampoPassword value="" onChange={() => {}} etiqueta="Contraseña" />);

    expect(screen.getByRole("button", { name: "Mostrar contraseña" })).toHaveAttribute(
      "tabindex",
      "-1",
    );
  });

  it("avisa lo tipeado", async () => {
    const usuario = userEvent.setup();
    const onChange = vi.fn();
    render(<CampoPassword value="" onChange={onChange} etiqueta="Contraseña" />);

    await usuario.type(screen.getByLabelText("Contraseña"), "a");

    expect(onChange).toHaveBeenCalledWith("a");
  });

  /**
   * `autoComplete` es obligatorio y sin default, y esa es la decisión central
   * del componente.
   *
   * Un campo de contraseña sin declarar su rol hace que el navegador adivine, y
   * adivina que es un login: en el alta de usuarios rellenaba el formulario con
   * la credencial del admin que estaba logueado. Que la prop no tenga valor por
   * defecto obliga a elegir en cada uso — `current-password` donde se ingresa
   * una existente, `new-password` donde se define una nueva.
   */
  it("declara el autoComplete que le pasan", () => {
    const { rerender } = render(
      <CampoPassword value="" onChange={() => {}} etiqueta="Contraseña" autoComplete="current-password" />,
    );
    expect(screen.getByLabelText("Contraseña")).toHaveAttribute(
      "autocomplete",
      "current-password",
    );

    rerender(
      <CampoPassword value="" onChange={() => {}} etiqueta="Contraseña" autoComplete="new-password" />,
    );
    expect(screen.getByLabelText("Contraseña")).toHaveAttribute("autocomplete", "new-password");
  });

  it("cada instancia abre y cierra por su cuenta", async () => {
    // Dos campos en la misma pantalla (el alta y la edición de una fila) no
    // pueden compartir el estado: revelar uno mostraría el otro.
    const usuario = userEvent.setup();
    render(
      <>
        <CampoPassword value="a" onChange={() => {}} etiqueta="Nueva" autoComplete="new-password" />
        <CampoPassword value="b" onChange={() => {}} etiqueta="Otra" autoComplete="new-password" />
      </>,
    );

    // El nombre del botón sale de la etiqueta del campo, así que dos ojitos en
    // la misma pantalla se distinguen entre sí. Con un "Mostrar contraseña"
    // repetido no habría forma de decir cuál es cuál.
    await usuario.click(screen.getByRole("button", { name: "Mostrar nueva" }));

    expect(screen.getByLabelText("Nueva")).toHaveAttribute("type", "text");
    expect(screen.getByLabelText("Otra")).toHaveAttribute("type", "password");
  });
});
