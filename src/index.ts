import { readFileSync, readdirSync, existsSync } from "node:fs";
import { basename, isAbsolute, join, } from "node:path";
import { assert, } from "./util";
import { Command } from "commander";
import { outputFileSync, } from "fs-extra";
const program = new Command();
const cwd = process.cwd();

program
  .argument("[inDir]")
  .option("-d, --dir [type]", "output dir", ".")
  .option("-n, --name [type]", "output name")
  .action(async (inDir: string) => {
    const rootDir = isAbsolute(inDir) ? inDir : join(cwd, inDir);
    const options = program.opts();
    const fileList = readdirSync(rootDir);
    if (!fileList.length) {
      console.error("${rootDir} has no files");
      return;
    }
    // wasm
    const wasmName = fileList.find(file => file.endsWith("_bg.wasm"));
    assert(wasmName, "wasm file not found")

    const wasmPath = join(rootDir, wasmName);
    if (!existsSync(wasmPath)) {
      console.error(`${rootDir} has no wasm file ${wasmPath}`);
      return;
    }

    // js
    let jsName = wasmName.replace(/_bg\.wasm/gs, ".js");
    let jsPath = join(rootDir, jsName);
    const projectName = jsName.split('.')[0]
    const optName = options.name ?? projectName;

    if (!existsSync(jsPath)) {
      jsName = wasmName.replace(".wasm", ".js");
      jsPath = join(rootDir, jsName);
    }
    const dtsPath = jsPath.replace(".js", '.d.ts')

    if (!existsSync(jsPath)) {
      console.error(`${rootDir} has no js file ${jsPath}`);
      return;
    }

    const bufferData = readFileSync(wasmPath).toString("base64");
    // const base64Path = join(cwd, options.dir, "base64.js");
    // const base64dtsPath = join(cwd, options.dir, "base64.d.ts");
    // outputFileSync(base64Path, `export const base64 = "${bufferData}";`);
    // outputFileSync(base64dtsPath, "export const base64: string;");

    let dtsStr = readFileSync(dtsPath, 'utf-8')

    const delIndex = dtsStr.indexOf("export type InitInput")
    dtsStr = dtsStr.slice(0, delIndex)
    const dtsOutPath = join(cwd, options.dir, basename(dtsPath).replace(projectName, optName));
    outputFileSync(dtsOutPath, dtsStr)


    let jsOutStr = readFileSync(jsPath, "utf8");
    const decodeFnCode = `
const __lookup__ = new Uint8Array([
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 62, 0, 0, 0, 63, 52, 53,
  54, 55, 56, 57, 58, 59, 60, 61, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7,
  8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 0, 0, 0,
  0, 0, 0, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42,
  43, 44, 45, 46, 47, 48, 49, 50, 51, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
]);


function __decode_base64__(base64) {
  const len = base64.length;
  let bufferLength = (len >> 2) * 3;
  let p = 0;

  let fillZeros = 0;
  if (base64[len - 1] === "=") {
    bufferLength--;
    fillZeros = 1;
    if (base64[len - 2] === "=") {
      bufferLength--;
      fillZeros = 2;
    }
  }

  const bytes = new Uint8Array(bufferLength);

  const strLen = fillZeros ? len - 4 : len;

  for (let i = 0; i < strLen; i += 4) {
    const encoded1 = __lookup__[base64.charCodeAt(i)];
    const encoded2 = __lookup__[base64.charCodeAt(i + 1)];
    const encoded3 = __lookup__[base64.charCodeAt(i + 2)];
    const encoded4 = __lookup__[base64.charCodeAt(i + 3)];

    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
  }

  if (fillZeros === 1) {
    const encoded1 = __lookup__[base64.charCodeAt(strLen)];
    const encoded2 = __lookup__[base64.charCodeAt(strLen + 1)];
    const encoded3 = __lookup__[base64.charCodeAt(strLen + 2)];
    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
  } else if (fillZeros === 2) {
    const encoded1 = __lookup__[base64.charCodeAt(strLen)];
    const encoded2 = __lookup__[base64.charCodeAt(strLen + 1)];
    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
  }
  return bytes;
}

`.trim()
    jsOutStr = `
const __wasm_base64__ = "${bufferData}";

${decodeFnCode}

${jsOutStr}
`.trim()
    const jsStrOutPath = join(cwd, options.dir, basename(jsPath).replace(projectName, optName));

    const st = jsOutStr.indexOf('async function __wbg_load(')
    const end = jsOutStr.indexOf('function __wbg_get_imports() ')
    {
      const i = jsOutStr.indexOf('async function __wbg_init(')
      jsOutStr = jsOutStr.slice(0, i)

    }


    jsOutStr = jsOutStr.replace(`    if (typeof module !== 'undefined' && Object.getPrototypeOf(module) === Object.prototype)
    ({module} = module)
    else
    console.warn('using deprecated parameters for \`initSync()\`; pass a single object instead')`, `

const bytes = __decode_base64__(__wasm_base64__);
const module = new WebAssembly.Module(bytes);

`)

    jsOutStr = jsOutStr.replace(`    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }`, '')

    jsOutStr = jsOutStr.replace('function initSync(module)', 'function initSync()')
    jsOutStr = jsOutStr.slice(0, st) + jsOutStr.slice(end)

    jsOutStr = jsOutStr.replaceAll('__wbg_init.', 'initSync.')
    jsOutStr += "\ninitSync() "
    outputFileSync(jsStrOutPath, jsOutStr)
  });
program.parse();
