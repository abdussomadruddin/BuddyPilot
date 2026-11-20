function billingSummaryPanel() {
  return `<section id="tab-billingpdf" class="tab-panel" data-tab-panel="billingpdf">
    <header class="section-heading"><h1><svg class="icon section-icon" aria-hidden="true"><use href="/icons.svg#file-text"></use></svg>Billing PDF</h1></header>
    <form id="billingSummaryForm" class="billing-summary-form">
      <section class="billing-fields" aria-label="Maklumat syarikat">
        <label>Nama syarikat<input name="company" maxlength="100" required autocomplete="organization"></label>
        <label>Ad account ID<input name="account" inputmode="numeric" pattern="[0-9]+" maxlength="40" required></label>
        <label>Alamat<textarea name="address" rows="4" maxlength="240" autocomplete="street-address"></textarea></label>
        <label>No. pendaftaran / VAT<input name="registration" maxlength="80"></label>
        <label>Tarikh mula<input name="start" type="date" required></label>
        <label>Tarikh akhir<input name="end" type="date" required></label>
        <label>Kaedah bayaran<input name="paymentMethod" value="Visa" maxlength="40" required></label>
        <label>4 digit akhir kad<input name="last4" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="off"></label>
        <label>Mata wang<select name="currency"><option>MYR</option><option>USD</option><option>SGD</option><option>EUR</option><option>GBP</option><option>AUD</option><option>IDR</option><option>THB</option></select></label>
        <label>Total funds added<input name="funds" type="number" min="0" max="999999999.99" step="0.01" value="0.00" required></label>
        <label>VAT rate (%)<input name="vatRate" type="number" min="0" max="100" step="0.01" value="0" required></label>
        <label>VAT amount<input name="vat" type="number" min="0" max="999999999.99" step="0.01" value="0.00" required></label>
      </section>
      <section class="billing-transactions" aria-label="Transaksi">
        <header><h2>Transaksi</h2><button type="button" id="billingAddRow" class="secondary" title="Tambah transaksi" aria-label="Tambah transaksi"><svg class="icon" aria-hidden="true"><use href="/icons.svg?v=billing1#plus"></use></svg>Tambah</button></header>
        <div id="billingTransactionRows"></div>
        <div class="billing-total"><span>Total Amount Billed</span><output id="billingTotal">MYR0.00</output></div>
      </section>
      <div class="billing-actions"><button type="submit" id="billingGenerate"><svg class="icon" aria-hidden="true"><use href="/icons.svg#file-text"></use></svg>Jana PDF</button><a id="billingDownload" class="button secondary" hidden>Muat turun PDF</a><a id="billingOpen" target="_blank" rel="noopener" hidden>Buka PDF</a></div>
      <p id="billingStatus" role="status" aria-live="polite"></p>
      <div id="billingPreview" hidden><iframe title="Preview billing PDF"></iframe></div>
    </form>
  </section>`;
}

module.exports = { billingSummaryPanel };
