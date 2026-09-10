import type { HttpMethod, QueryParams } from "@/lib/api/transport";

export interface MockRequestContext {
  /** Path parameters extracted from the route pattern, e.g. `:id`. */
  params: Record<string, string>;
  query: QueryParams;
  body: unknown;
}

export type MockHandler = (context: MockRequestContext) => unknown | Promise<unknown>;

/** Route patterns look like `GET /companies/:id`. */
export type MockRoutes = Record<string, MockHandler>;

interface CompiledRoute {
  method: HttpMethod;
  segments: string[];
  handler: MockHandler;
}

function compile(pattern: string, handler: MockHandler): CompiledRoute {
  const [method, path] = pattern.split(" ");
  if (!method || !path) {
    throw new Error(`Invalid mock route pattern: "${pattern}"`);
  }
  return {
    method: method as HttpMethod,
    segments: path.split("/").filter(Boolean),
    handler,
  };
}

/**
 * A miniature path router.
 *
 * Handlers are registered against REST-shaped patterns so that mock modules
 * read like the API contract they stand in for, and so switching to the real
 * backend is a transport swap rather than a rewrite.
 */
export class MockRouter {
  private readonly routes: CompiledRoute[] = [];

  register(routes: MockRoutes): void {
    for (const [pattern, handler] of Object.entries(routes)) {
      this.routes.push(compile(pattern, handler));
    }
  }

  match(
    method: HttpMethod,
    path: string,
  ): { handler: MockHandler; params: Record<string, string> } | null {
    const segments = path.split("/").filter(Boolean);

    for (const route of this.routes) {
      if (route.method !== method || route.segments.length !== segments.length) continue;

      const params: Record<string, string> = {};
      let matched = true;

      for (let index = 0; index < route.segments.length; index += 1) {
        const pattern = route.segments[index] ?? "";
        const actual = segments[index] ?? "";

        if (pattern.startsWith(":")) {
          params[pattern.slice(1)] = decodeURIComponent(actual);
        } else if (pattern !== actual) {
          matched = false;
          break;
        }
      }

      if (matched) return { handler: route.handler, params };
    }

    return null;
  }
}
