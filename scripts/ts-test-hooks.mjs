/**
 * Resolution hooks for `npm test`.
 *
 * Node 24 strips TypeScript types natively, so tests need no build step or
 * test framework - only help resolving the extensionless relative imports and
 * the `@/` alias that the app source uses.
 */
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = resolvePath(fileURLToPath(new URL(".", import.meta.url)), "..", "src");
const EXTENSIONS = [".ts", ".tsx", "/index.ts", "/index.tsx"];

function firstExisting(basePath) {
  for (const extension of EXTENSIONS) {
    const candidate = basePath + extension;
    if (existsSync(candidate)) return pathToFileURL(candidate).href;
  }
  return null;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const url = firstExisting(resolvePath(SRC, specifier.slice(2)));
      if (url) return { url, shortCircuit: true };
    }
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
      const base = resolvePath(dirname(fileURLToPath(context.parentURL)), specifier);
      const url = firstExisting(base);
      if (url) return { url, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
