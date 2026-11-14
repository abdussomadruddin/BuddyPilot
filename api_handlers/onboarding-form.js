// Public onboarding form (no sign-in). GET shows the form, POST saves it for
// the owner to review. Only someone with the secret link can open or submit it.
const { readJsonBody } = require("../lib/http-body");
const { FIELDS, submitIntake, validToken } = require("../lib/onboarding-intake");

const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

function page(body) {
  return `<!doctype html><html lang="ms"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="robots" content="noindex, nofollow"><title>Borang Onboarding</title>
<style>
:root{--ink:#18232d;--muted:#61717f;--line:#dce5ea;--bg:#f3f6f8;--blue:#1464da;--red:#bd3455;--green:#087b5e}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}
main{max-width:620px;margin:0 auto;padding:28px 16px calc(40px + env(safe-area-inset-bottom))}
h1{margin:0 0 6px;font-size:26px;letter-spacing:-.01em}p.lead{margin:0 0 20px;color:var(--muted)}
form,.card{background:#fff;border:1px solid var(--line);border-radius:18px;padding:20px}
label{display:block;margin:0 0 6px;font-weight:700;font-size:14px}label small{font-weight:500;color:var(--muted)}
.field{margin-bottom:16px}input,textarea{width:100%;min-height:48px;padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:#fff;color:var(--ink);font:inherit;font-size:16px}
textarea{min-height:96px;resize:vertical}input:focus,textarea:focus{outline:2px solid var(--blue);outline-offset:1px;border-color:transparent}
.hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
button{width:100%;min-height:52px;border:0;border-radius:14px;background:var(--blue);color:#fff;font:inherit;font-weight:700;font-size:16px;cursor:pointer}button:disabled{opacity:.6}
.msg{margin:12px 0 0;font-size:14px}.msg.err{color:var(--red)}.done{text-align:center}.done h2{margin:0 0 8px;color:var(--green)}
.note{font-size:13px;color:var(--muted);margin:14px 0 0}
@media (prefers-reduced-motion:no-preference){form,.card{animation:rise .4s cubic-bezier(.22,1,.36,1) both}@keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}}
</style></head><body><main>${body}</main></body></html>`;
}

function formPage(token) {
  const fields = FIELDS.map((field) => {
    const id = `f-${field.key}`;
    const attrs = `id="${id}" name="${field.key}" maxlength="${field.max}"${field.required ? " required" : ""}${field.type === "email" ? ' autocomplete="email" inputmode="email"' : ""}${field.type === "tel" ? ' autocomplete="tel" inputmode="tel"' : ""}${field.key === "contactName" ? ' autocomplete="name"' : ""}`;
    const control = field.multiline ? `<textarea ${attrs}></textarea>` : `<input ${attrs} type="${field.type === "number" ? "text" : field.type || "text"}"${field.type === "number" ? ' inputmode="decimal"' : ""}>`;
    return `<div class="field"><label for="${id}">${esc(field.label)}${field.required ? "" : " <small>(pilihan)</small>"}</label>${control}</div>`;
  }).join("");
  return page(`<h1>Borang Onboarding</h1><p class="lead">Isi maklumat bisnes anda. Kami akan semak dan hubungi anda selepas ini.</p>
<form id="intake" novalidate>${fields}<div class="hp" aria-hidden="true"><label for="f-website">Website</label><input id="f-website" name="website" tabindex="-1" autocomplete="off"></div>
<button type="submit">Hantar maklumat</button><p id="msg" class="msg" role="status"></p><p class="note">Maklumat ini hanya digunakan untuk urusan servis dan billing anda.</p></form>
<script>
(function(){var form=document.getElementById("intake"),msg=document.getElementById("msg"),button=form.querySelector("button");
form.addEventListener("submit",function(event){event.preventDefault();var data={};new FormData(form).forEach(function(value,key){data[key]=value});
var missing=[].slice.call(form.querySelectorAll("[required]")).filter(function(el){return !el.value.trim()})[0];
if(missing){msg.className="msg err";msg.textContent="Sila isi semua ruangan wajib.";missing.focus();return}
button.disabled=true;button.textContent="Menghantar...";msg.textContent="";
fetch("/api/onboarding-form?t=${encodeURIComponent(token)}",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(data)}).then(function(r){return r.json().then(function(j){return{ok:r.ok&&j.ok,error:j.error}})}).then(function(res){
if(!res.ok)throw new Error(res.error||"Gagal dihantar.");form.outerHTML='<div class="card done"><h2>Terima kasih!</h2><p>Maklumat anda dah diterima. Kami akan hubungi anda tidak lama lagi.</p></div>';window.scrollTo(0,0)
}).catch(function(error){msg.className="msg err";msg.textContent=error.message+" Cuba semula.";button.disabled=false;button.textContent="Hantar maklumat"})})})();
</script>`);
}

module.exports = async function handler(req, res) {
  const url = new URL(req.url || "/", "http://localhost");
  const token = url.searchParams.get("t") || "";
  res.setHeader("cache-control", "no-store");
  res.setHeader("x-robots-tag", "noindex, nofollow");
  if (req.method === "GET") {
    res.setHeader("content-type", "text/html; charset=utf-8");
    if (!validToken(token)) {
      res.statusCode = 404;
      return res.end(page('<div class="card"><h1>Link tidak sah</h1><p class="lead">Link borang ini tidak sah atau sudah ditukar. Minta link baru daripada kami.</p></div>'));
    }
    return res.end(formPage(token));
  }
  res.setHeader("content-type", "application/json; charset=utf-8");
  if (req.method !== "POST") {
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false, error: "Method not allowed." }));
  }
  try {
    const result = await submitIntake({ token, body: await readJsonBody(req) });
    res.end(JSON.stringify({ ok: true, id: result.id }));
  } catch (error) {
    res.statusCode = error.statusCode || 500;
    res.end(JSON.stringify({ ok: false, error: error.statusCode ? error.message : "Borang gagal disimpan. Cuba semula sebentar lagi." }));
  }
};
