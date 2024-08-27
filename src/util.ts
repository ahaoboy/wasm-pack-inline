
export function assert<T>(cond: T, msg: string): asserts  cond is NonNullable<T> {
  if (!cond) {
    throw new Error(msg)
  }
}

export const getCode = () => {
  return `
const decodeBase64 =
typeof atob === "function"? atob: function (input) {
    const keyStr =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    let output = "";
    let chr1, chr2, chr3;
    let enc1, enc2, enc3, enc4;
    let i = 0;
    input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
    do {
        enc1 = keyStr.indexOf(input.charAt(i++));
        enc2 = keyStr.indexOf(input.charAt(i++));
        enc3 = keyStr.indexOf(input.charAt(i++));
        enc4 = keyStr.indexOf(input.charAt(i++));
        chr1 = (enc1 << 2) | (enc2 >> 4);
        chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
        chr3 = ((enc3 & 3) << 6) | enc4;
        output = output + String.fromCharCode(chr1);
        if (enc3 !== 64) {
        output = output + String.fromCharCode(chr2);
        }
        if (enc4 !== 64) {
        output = output + String.fromCharCode(chr3);
        }
    } while (i < input.length);
    return output;
};

function intArrayFromBase64(s) {
  try {
    const decoded = decodeBase64(s);
    const bytes = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; ++i) {
      bytes[i] = decoded.charCodeAt(i);
    }
    return bytes;
  } catch (_) {
    throw new Error("Converting base64 string to bytes failed.");
  }
}
`;
};
