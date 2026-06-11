// ---------------------------------------------------------------------------
// Base64 look-up table used by the inline decoder.
// This is a standard base64 decoding table (indexed by ASCII char code).
// ---------------------------------------------------------------------------
export const BASE64_LOOKUP = new Uint8Array([
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
])

/**
 * Generate the source code for an inline base64 → Uint8Array decoder.
 *
 * We emit the function as a string with the lookup table embedded as a
 * literal so that the generated JS is fully self-contained — no `fetch`,
 * no `Buffer`, no runtime construction overhead for the table.
 */
export function generateBase64Decoder(): string {
  const lookupStr = `new Uint8Array([${Array.from(BASE64_LOOKUP).join(",")}])`
  return `
function __decode_base64__(base64) {
  const __lookup__ = ${lookupStr};
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
    const e1 = __lookup__[base64.charCodeAt(i)];
    const e2 = __lookup__[base64.charCodeAt(i + 1)];
    const e3 = __lookup__[base64.charCodeAt(i + 2)];
    const e4 = __lookup__[base64.charCodeAt(i + 3)];

    bytes[p++] = (e1 << 2) | (e2 >> 4);
    bytes[p++] = ((e2 & 15) << 4) | (e3 >> 2);
    bytes[p++] = ((e3 & 3) << 6) | (e4 & 63);
  }

  if (fillZeros === 1) {
    const e1 = __lookup__[base64.charCodeAt(strLen)];
    const e2 = __lookup__[base64.charCodeAt(strLen + 1)];
    const e3 = __lookup__[base64.charCodeAt(strLen + 2)];
    bytes[p++] = (e1 << 2) | (e2 >> 4);
    bytes[p++] = ((e2 & 15) << 4) | (e3 >> 2);
  } else if (fillZeros === 2) {
    const e1 = __lookup__[base64.charCodeAt(strLen)];
    const e2 = __lookup__[base64.charCodeAt(strLen + 1)];
    bytes[p++] = (e1 << 2) | (e2 >> 4);
  }
  return bytes;
}
`.trim()
}
