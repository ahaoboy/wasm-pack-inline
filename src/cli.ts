import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { Command } from "commander"

import { inlineWasmPack } from "./index.js"
import type { InlineWasmPackOptions } from "./index.js"

// Resolve package.json relative to this source file (works in both src/ and dist/).
const __dirname = dirname(fileURLToPath(import.meta.url))
const pkgPath = join(__dirname, "..", "package.json")
const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version: string }

// ---------------------------------------------------------------------------
// CLI – parse arguments, build config, delegate to the library.
// ---------------------------------------------------------------------------
const program = new Command()

program
  .name("wasm-pack-inline")
  .version(pkg.version)
  .argument("[inDir]", "wasm-pack output directory")
  .option("-d, --dir <dir>", "output directory", ".")
  .option("-n, --name <name>", "output base name")
  .action((inDir: string | undefined) => {
    if (!inDir) {
      program.help()
      return
    }

    const { dir, name } = program.opts<{ dir: string; name?: string }>()

    const options: InlineWasmPackOptions = {
      inputDir: inDir,
      outputDir: dir,
      outputName: name,
    }
    console.log(`Inlining wasm-pack output from "${options.inputDir}"...`, options)
    inlineWasmPack(options)
  })

program.parse()

console.log(`wasm-pack-inline v${pkg.version} loaded`)