/**
 * MSW setup for Vitest (Node/jsdom environment).
 * This file is loaded as a setupFile in vitest.config.ts.
 */

import { server } from "./server";
import "@testing-library/jest-dom";

// Start server before all tests, stop after all tests
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
