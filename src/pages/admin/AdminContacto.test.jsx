import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminContacto from "./AdminContacto.jsx";
import { ToastProvider } from "../../context/ToastContext.jsx";
import { getConfigContactoAdmin, putConfigContacto } from "../../api/config.js";

vi.mock("../../api/config.js");

const CRUDO_VACIO = {
  whatsappNumero: null,
  whatsappHoraDesde: null,
  whatsappHoraHasta: null,
  whatsappDias: null,
  email: null,
  instagramUrl: null,
  facebookUrl: null,
  tiktokUrl: null,
  direccion: null,
};

const CRUDO_CARGADO = {
  whatsappNumero: "5491199998888",
  whatsappHoraDesde: 9,
  whatsappHoraHasta: 18,
  whatsappDias: "1,2,3,4,5",
  email: "contacto@yima.com.ar",
  instagramUrl: "https://instagram.com/yima",
  facebookUrl: null,
  tiktokUrl: null,
  direccion: "Av. Ejemplo 1234, CABA",
};

function vistaAdmin(crudo) {
  return {
    whatsapp: { numero: crudo.whatsappNumero, dentroDeHorario: true, textoHorario: null },
    email: crudo.email,
    instagram: crudo.instagramUrl,
    facebook: crudo.facebookUrl,
    tiktok: crudo.tiktokUrl,
    direccion: crudo.direccion,
    crudo,
  };
}

function renderPantalla() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <AdminContacto />
      </ToastProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AdminContacto — carga", () => {
  it("muestra un estado de carga mientras pide la config", () => {
    let resolver;
    vi.mocked(getConfigContactoAdmin).mockReturnValue(new Promise((r) => (resolver = r)));

    renderPantalla();

    expect(screen.getByText(/cargando/i)).toBeInTheDocument();
    resolver(vistaAdmin(CRUDO_VACIO));
  });

  it("un error de carga muestra un estado distinto, con botón de reintentar", async () => {
    vi.mocked(getConfigContactoAdmin).mockRejectedValue(new Error("Revisá tu conexión e intentá de nuevo."));

    renderPantalla();

    expect(await screen.findByText("Revisá tu conexión e intentá de nuevo.")).toBeInTheDocument();
    const botonReintentar = screen.getByRole("button", { name: /reintentar/i });

    vi.mocked(getConfigContactoAdmin).mockResolvedValue(vistaAdmin(CRUDO_CARGADO));
    fireEvent.click(botonReintentar);

    await waitFor(() => {
      expect(screen.getByLabelText(/número/i)).toHaveValue("5491199998888");
    });
  });

  it("carga los campos del formulario desde `crudo`", async () => {
    vi.mocked(getConfigContactoAdmin).mockResolvedValue(vistaAdmin(CRUDO_CARGADO));

    renderPantalla();

    await waitFor(() => {
      expect(screen.getByLabelText(/número/i)).toHaveValue("5491199998888");
    });
    expect(screen.getByLabelText(/mail de contacto/i)).toHaveValue("contacto@yima.com.ar");
    expect(screen.getByLabelText(/instagram/i)).toHaveValue("https://instagram.com/yima");
    expect(screen.getByLabelText(/dirección/i)).toHaveValue("Av. Ejemplo 1234, CABA");

    // Los días de whatsappDias="1,2,3,4,5" (lunes a viernes) quedan marcados.
    expect(screen.getByRole("button", { name: "Lunes" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Sábado" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Domingo" })).toHaveAttribute("aria-pressed", "false");
  });

  it("con whatsappNumero null en crudo, muestra el aviso de fallback al servidor", async () => {
    vi.mocked(getConfigContactoAdmin).mockResolvedValue(vistaAdmin(CRUDO_VACIO));

    renderPantalla();

    expect(
      await screen.findByText(/sigue saliendo de la configuración del servidor/i),
    ).toBeInTheDocument();
  });

  it("con whatsappNumero ya guardado, NO muestra el aviso de fallback", async () => {
    vi.mocked(getConfigContactoAdmin).mockResolvedValue(vistaAdmin(CRUDO_CARGADO));

    renderPantalla();

    await waitFor(() => expect(screen.getByLabelText(/número/i)).toHaveValue("5491199998888"));
    expect(screen.queryByText(/sigue saliendo de la configuración del servidor/i)).not.toBeInTheDocument();
  });
});

describe("AdminContacto — días de atención", () => {
  it("togglear un día lo activa y desactiva", async () => {
    vi.mocked(getConfigContactoAdmin).mockResolvedValue(vistaAdmin(CRUDO_CARGADO));

    renderPantalla();
    await waitFor(() => expect(screen.getByLabelText(/número/i)).toHaveValue("5491199998888"));

    const sabado = screen.getByRole("button", { name: "Sábado" });
    expect(sabado).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(sabado);
    expect(sabado).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(sabado);
    expect(sabado).toHaveAttribute("aria-pressed", "false");
  });
});

describe("AdminContacto — validación en el cliente", () => {
  it("un número con letras muestra un mensaje y no llama a guardar", async () => {
    vi.mocked(getConfigContactoAdmin).mockResolvedValue(vistaAdmin(CRUDO_CARGADO));

    renderPantalla();
    await waitFor(() => expect(screen.getByLabelText(/número/i)).toHaveValue("5491199998888"));

    fireEvent.change(screen.getByLabelText(/número/i), { target: { value: "54911abc8888" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/solo dígitos/i);
    expect(putConfigContacto).not.toHaveBeenCalled();
  });

  it("un email con formato inválido muestra un mensaje y no llama a guardar", async () => {
    vi.mocked(getConfigContactoAdmin).mockResolvedValue(vistaAdmin(CRUDO_CARGADO));

    renderPantalla();
    await waitFor(() => expect(screen.getByLabelText(/número/i)).toHaveValue("5491199998888"));

    fireEvent.change(screen.getByLabelText(/mail de contacto/i), { target: { value: "no-es-un-email" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));

    expect(await screen.findByText(/email.*válido/i)).toBeInTheDocument();
    expect(putConfigContacto).not.toHaveBeenCalled();
  });

  it("una red social con http:// muestra un mensaje y no llama a guardar", async () => {
    vi.mocked(getConfigContactoAdmin).mockResolvedValue(vistaAdmin(CRUDO_CARGADO));

    renderPantalla();
    await waitFor(() => expect(screen.getByLabelText(/número/i)).toHaveValue("5491199998888"));

    fireEvent.change(screen.getByLabelText(/instagram/i), { target: { value: "http://instagram.com/yima" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/https:\/\//);
    expect(putConfigContacto).not.toHaveBeenCalled();
  });

  it("desde >= hasta muestra un mensaje y no llama a guardar", async () => {
    vi.mocked(getConfigContactoAdmin).mockResolvedValue(vistaAdmin(CRUDO_CARGADO));

    renderPantalla();
    await waitFor(() => expect(screen.getByLabelText(/número/i)).toHaveValue("5491199998888"));

    fireEvent.change(screen.getByLabelText(/^desde/i), { target: { value: "18" } });
    fireEvent.change(screen.getByLabelText(/^hasta/i), { target: { value: "9" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));

    expect(await screen.findByText(/desde.*menor.*hasta/i)).toBeInTheDocument();
    expect(putConfigContacto).not.toHaveBeenCalled();
  });
});

describe("AdminContacto — guardar", () => {
  it("guarda con los valores del formulario y muestra un toast de éxito", async () => {
    vi.mocked(getConfigContactoAdmin).mockResolvedValue(vistaAdmin(CRUDO_CARGADO));
    vi.mocked(putConfigContacto).mockResolvedValue(vistaAdmin(CRUDO_CARGADO));

    renderPantalla();
    await waitFor(() => expect(screen.getByLabelText(/número/i)).toHaveValue("5491199998888"));

    fireEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));

    await waitFor(() => expect(putConfigContacto).toHaveBeenCalledTimes(1));
    const payload = vi.mocked(putConfigContacto).mock.calls[0][0];
    expect(payload.whatsappNumero).toBe("5491199998888");
    expect(payload.whatsappDias).toBe("1,2,3,4,5");
    expect(payload.email).toBe("contacto@yima.com.ar");

    expect(await screen.findByText(/contacto actualizado/i)).toBeInTheDocument();
  });

  it("un error al guardar muestra un toast de error, sin romper el formulario", async () => {
    vi.mocked(getConfigContactoAdmin).mockResolvedValue(vistaAdmin(CRUDO_CARGADO));
    vi.mocked(putConfigContacto).mockRejectedValue(new Error("No se pudo guardar."));

    renderPantalla();
    await waitFor(() => expect(screen.getByLabelText(/número/i)).toHaveValue("5491199998888"));

    fireEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));

    expect(await screen.findByText("No se pudo guardar.")).toBeInTheDocument();
    expect(screen.getByLabelText(/número/i)).toHaveValue("5491199998888");
  });
});
