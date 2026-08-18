import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// This project's vitest.config.js does not set `test.globals: true`, so
// Testing Library's usual automatic afterEach(cleanup) registration (which
// relies on detecting a global test framework) never kicks in. Without this,
// every test file that renders more than one component leaks DOM nodes and
// mocks across its own tests (each file already gets a fresh module registry
// between files, so this was invisible until a file had 2+ rendering tests).
afterEach(() => {
  cleanup();
});
