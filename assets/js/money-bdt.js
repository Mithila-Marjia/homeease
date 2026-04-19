/**
 * Bangladesh Taka (BDT) formatting. Amounts in DB are still minor units (poisha / "cents" per taka).
 */
(function () {
  "use strict";

  function fromCents(c) {
    var taka = (Number(c) || 0) / 100;
    return (
      "৳\u00A0" +
      taka.toLocaleString("en-BD", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  /** Whole taka from a decimal amount (e.g. price_cents/100 already applied). */
  function fromTakaAmount(n) {
    var t = Number(n) || 0;
    return (
      "৳\u00A0" +
      t.toLocaleString("en-BD", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
    );
  }

  window.homeEaseMoney = {
    fromCents: fromCents,
    fromTakaAmount: fromTakaAmount,
  };
})();
