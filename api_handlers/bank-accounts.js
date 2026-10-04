const { requireAuth } = require("../lib/auth");
const {
  createBankAccount,
  deleteBankAccount,
  listBankAccounts,
  recordActivity,
  updateBankAccount,
} = require("../lib/supabase-db");
const { readJsonBody } = require("../lib/postpilot");

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");

  try {
    requireAuth(req);

    if (req.method === "GET") {
      const accounts = await listBankAccounts();
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, accounts, count: accounts.length }));
      return;
    }

    if (req.method === "POST") {
      const body = await readJsonBody(req);
      const account = await createBankAccount(body);
      await recordActivity({
        type: "bank_created",
        title: `Akaun bank ditambah: ${account.label}`,
        description: `${account.bankName} - ${account.accountNumber}`,
        entityType: "bank_account",
        entityId: account.id,
      });
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, account }));
      return;
    }

    if (req.method === "PUT" || req.method === "PATCH") {
      const body = await readJsonBody(req);
      const account = await updateBankAccount(body.id, body);
      await recordActivity({
        type: "bank_updated",
        title: `Akaun bank dikemaskini: ${account.label}`,
        description: account.isDefault ? "Akaun ini menjadi default invoice." : `${account.bankName} dikemaskini.`,
        entityType: "bank_account",
        entityId: account.id,
      });
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, account }));
      return;
    }

    if (req.method === "DELETE") {
      const body = await readJsonBody(req);
      const result = await deleteBankAccount(body.id);
      await recordActivity({
        type: "bank_deleted",
        title: `Akaun bank dipadam: ${result.deleted.label}`,
        description: result.defaultAccount ? `Default sekarang: ${result.defaultAccount.label}` : "Tiada akaun bank default aktif.",
        entityType: "bank_account",
        entityId: result.deleted.id,
      });
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, ...result }));
      return;
    }

    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: "Method not allowed." }));
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
