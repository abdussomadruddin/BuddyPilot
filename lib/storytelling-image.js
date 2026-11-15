// The optional photo for a Post Pilot post. The phone sends a resized JPEG; it
// is stored in Vercel Blob at an unguessable public address, because Facebook
// and Threads both fetch the picture from a URL when the post is published.
const MAX_BYTES = 4 * 1024 * 1024;
const IMAGE_URL = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/postpilot\/[A-Za-z0-9._-]+$/;

function fail(message, statusCode = 400, code = "invalid") {
  return Object.assign(new Error(message), { statusCode, code });
}

// Only pictures this app stored may be attached to a post.
function safeImageUrl(value) {
  const url = String(value || "").trim();
  return IMAGE_URL.test(url) ? url : "";
}

function decode(dataUrl) {
  const match = /^data:image\/(jpeg|png);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ""));
  if (!match) throw fail("Gambar tidak sah. Tangkap atau pilih gambar JPEG atau PNG.");
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length > MAX_BYTES) throw fail("Gambar terlalu besar (maksimum 4 MB).");
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (bytes.length < 1000 || (match[1] === "jpeg" ? !jpeg : !png)) throw fail("Fail itu bukan gambar yang sah.");
  return { bytes, type: `image/${match[1]}`, extension: match[1] === "jpeg" ? "jpg" : "png" };
}

function defaultPut() {
  return async (pathname, bytes, options) => require("@vercel/blob").put(pathname, bytes, options);
}

async function saveImage({ image } = {}, { put = defaultPut(), now = () => new Date() } = {}) {
  const { bytes, type, extension } = decode(image);
  let stored;
  try {
    stored = await put(`postpilot/${now().toISOString().slice(0, 10)}.${extension}`, bytes, { access: "public", addRandomSuffix: true, contentType: type });
  } catch (error) {
    console.error("storytelling_image_error", { message: String(error?.message || error).slice(0, 200) });
    throw fail("Gambar tidak dapat disimpan. Semak storan Blob pada server dan cuba lagi.", 503, "image_storage");
  }
  const url = safeImageUrl(stored?.url);
  if (!url) throw fail("Storan gambar memulangkan alamat yang tidak dijangka.", 503, "image_storage");
  return { image: url };
}

module.exports = { safeImageUrl, saveImage };
