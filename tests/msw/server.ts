/**
 * MSW server instance — shared across all test files.
 * Import this (not setup.ts) when you need server.use() to override handlers in a test.
 */

import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
