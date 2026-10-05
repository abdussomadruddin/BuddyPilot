function buildThreadsPromoteCaption(product, variation = 0) {
  const target = String(product.targetMarket || "").trim();
  const highlight = String(product.highlight || "").trim();
  if (!target) throw new Error("Isi target market produk dahulu.");
  if (target.length > 80 || highlight.length > 100) throw new Error("Target market maksimum 80 aksara; perkara menarik maksimum 100 aksara.");
  const openings = ["Untuk ", "Hey ", "Khas buat ", "Kepada "];
  const ctas = ["Komen NAK atau DM untuk details.", "Nak tahu lanjut? Komen NAK atau DM.", "Berminat? Komen NAK atau hantar DM.", "Komen INFO atau DM untuk tahu lanjut."];
  const index = Math.floor(Math.abs(Number(variation) || 0)) % openings.length;
  const interesting = highlight || "Kenali " + String(product.name || "produk ini").trim().slice(0, 100) + " melalui 5 gambar ni.";
  return openings[index] + target + ".\n\n" + interesting + "\n\n" + ctas[index];
}
module.exports = { buildThreadsPromoteCaption };
