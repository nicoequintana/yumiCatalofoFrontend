import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// JSDOM doesn't implement IntersectionObserver — this stub lets components
// that use it (e.g. ProductoDetalle.jsx's "hide sticky CTA near the page
// end" logic) mount without crashing. It never fires callbacks on its own;
// tests that need to simulate an intersection call the captured callback
// directly (see IntersectionObserver.mock.calls in the relevant test file).
class IntersectionObserverStub {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.IntersectionObserver = IntersectionObserverStub;

// JSDOM tampoco implementa window.scrollTo: existe, pero cada llamada escupe
// "Not implemented: Window's scrollTo() method" por la consola virtual. Lo usa
// el paginador de `/coleccion` para volver arriba al cambiar de página, así
// que sin este stub cada test que pagina ensucia la salida con un error que no
// es un error. Tests que necesiten afirmar sobre el scroll pueden espiarlo.
window.scrollTo = () => {};

// This project's vitest.config.js does not set `test.globals: true`, so
// Testing Library's usual automatic afterEach(cleanup) registration (which
// relies on detecting a global test framework) never kicks in. Without this,
// every test file that renders more than one component leaks DOM nodes and
// mocks across its own tests (each file already gets a fresh module registry
// between files, so this was invisible until a file had 2+ rendering tests).
afterEach(() => {
  cleanup();
});
