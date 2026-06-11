import { readFileSync, readdirSync, existsSync } from "node:fs"
import { basename, isAbsolute, join } from "node:path"
import fsExtra from "fs-extra"

import { assert } from "./util.js"
import { generateBase64Decoder } from "./base64.js"
import {
  removeWbgInit,
  removeWbgLoad,
  patchInitSync,
  finalizeOutput,
} from "./transform.js"

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Options for {@link inlineWasmPack}. */
export interface InlineWasmPackOptions {
  /** Path to the wasm-pack output directory (containing .wasm + .js + .d.ts). */
  inputDir: string
  /** Output directory for the generated files (default: `"."`). */
  outputDir?: string
  /** Custom base name for the output files (default: derived from the .wasm file). */
  outputName?: string
}

/**
 * Inline a wasm-pack output directory into a **self-contained** JS bundle.
 *
 * Reads the `.wasm`, `.js` glue, and `.d.ts` from `inputDir`, base64-encodes
 * the WASM binary directly into the JS, and writes the resulting stand-alone
 * `.js` + `.d.ts` pair into `outputDir`.
 *
 * @example
 * ```ts
 * import { inlineWasmPack } from "wasm-pack-inline"
 * inlineWasmPack({ inputDir: "./pkg", outputDir: "./dist", outputName: "my-lib" })
 * ```
 */
export function inlineWasmPack(options: InlineWasmPackOptions): void {
  const {
    inputDir,
    outputDir: outDir = ".",
    outputName: optName,
  } = options

  const rootDir = isAbsolute(inputDir) ? inputDir : join(process.cwd(), inputDir)

  const fileList = readdirSync(rootDir)
  if (!fileList.length) {
    throw new Error(`"${rootDir}" has no files`)
  }

  // --- locate .wasm ----------------------------------------------------
  const wasmName = fileList.find((f) => f.endsWith("_bg.wasm"))
  assert(wasmName, `wasm file not found in "${rootDir}"`)
  const wasmPath = join(rootDir, wasmName)
  assert(existsSync(wasmPath), `wasm file not found: ${wasmPath}`)

  // --- locate .js / .d.ts ----------------------------------------------
  let jsName = wasmName.replace(/_bg\.wasm$/gs, ".js")
  let jsPath = join(rootDir, jsName)
  if (!existsSync(jsPath)) {
    jsName = wasmName.replace(/\.wasm$/, ".js")
    jsPath = join(rootDir, jsName)
  }
  assert(existsSync(jsPath), `JS glue not found: ${jsPath}`)

  const dtsPath = jsPath.replace(/\.js$/, ".d.ts")
  const projectName = jsName.split(".")[0]!
  const outputName = optName ?? projectName

  // --- process .d.ts (strip InitInput type that references Request) ----
  let dtsStr = readFileSync(dtsPath, "utf-8")
  const delIdx = dtsStr.indexOf("export type InitInput")
  if (delIdx !== -1) {
    dtsStr = dtsStr.slice(0, delIdx)
  }
  const dtsOutPath = join(outDir, basename(dtsPath).replace(projectName, outputName))
  fsExtra.outputFileSync(dtsOutPath, dtsStr)

  // --- process .js -----------------------------------------------------
  const wasmBase64 = readFileSync(wasmPath).toString("base64")

  let js = [
    `const __wasm_base64__ = "${wasmBase64}";`,
    "",
    generateBase64Decoder(),
    "",
    readFileSync(jsPath, "utf-8"),
  ].join("\n")

  js = removeWbgInit(js)
  js = removeWbgLoad(js)
  js = patchInitSync(js)
  js = finalizeOutput(js)

  const jsOutPath = join(outDir, basename(jsPath).replace(projectName, outputName))
  fsExtra.outputFileSync(jsOutPath, js)
}

