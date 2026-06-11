import { assert } from "./util.js"

/**
 * Strip `__wbg_init` (the async fetch-based initialiser) and everything
 * after it from the glue JS.  We replace it with a synchronous `initSync`
 * powered by the inlined base64 WASM blob.
 */
export function removeWbgInit(js: string): string {
  const idx = js.indexOf("async function __wbg_init(")
  assert(idx !== -1, "__wbg_init not found in JS glue")
  return js.slice(0, idx)
}

/**
 * Remove the `__wbg_load` helper (fetch + instantiate) because we inline
 * the WASM bytes and use `WebAssembly.Module` / `WebAssembly.Instance`
 * directly.
 *
 * NOTE: `__wbg_get_imports` appears **before** `__wbg_load` in the file,
 * so we must use `initSync` as the end-marker instead.
 */
export function removeWbgLoad(js: string): string {
  const startIdx = js.indexOf("async function __wbg_load(")
  assert(startIdx !== -1, "__wbg_load not found in JS glue")

  // __wbg_load is immediately followed by initSync – remove everything
  // between (and including) __wbg_load and the start of initSync.
  const endIdx = js.indexOf("function initSync(", startIdx)
  assert(endIdx !== -1, "initSync not found after __wbg_load")

  return js.slice(0, startIdx) + js.slice(endIdx)
}

/**
 * Patch `initSync` so that instead of accepting a raw WASM module/bytes
 * parameter it decodes the inlined base64 blob and creates the module
 * internally.
 */
export function patchInitSync(js: string): string {
  // Locate the guard at the top of initSync (handles both old and new
  // wasm-bindgen glue signatures).
  const guardIdx = js.includes("if (typeof module !== 'undefined') {")
    ? js.indexOf("if (typeof module !== 'undefined') {")
    : js.indexOf("if (wasm !== undefined) return wasm;")

  assert(guardIdx !== -1, "initSync guard not found")

  const importsIdx = js.indexOf("const imports = __wbg_get_imports();")
  assert(importsIdx !== -1, "__wbg_get_imports call not found in initSync")

  // Replace the guard + parameter handling with our inline decode logic.
  const before = js.slice(0, guardIdx)
  const after = js.slice(importsIdx)

  return `${before}
      const bytes = __decode_base64__(__wasm_base64__);
      const module = new WebAssembly.Module(bytes);

      ${after}`
}

/**
 * Clean up wasm-bindgen artefacts that are no longer needed after inlining.
 */
export function finalizeOutput(js: string): string {
  // Remove the `module instanceof WebAssembly.Module` guard since we
  // always create a fresh Module.
  js = js.replace(
    `    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }`,
    "",
  )

  // Strip the module parameter from initSync – it's now parameterless.
  js = js.replace(/function initSync\((.*?)\)/, "function initSync()")

  // Fix __wbg_init_memory call – with inlined WASM we don't need the
  // second "memory" argument.
  js = js.replace(
    "__wbg_init_memory(imports, memory);",
    "__wbg_init_memory(imports)",
  )

  // Replace leftover __wbg_init references.
  js = js.replaceAll("__wbg_init.", "initSync.")

  // Auto-invoke initSync so the module is ready immediately on import.
  js += "\ninitSync()\n"

  return js
}
