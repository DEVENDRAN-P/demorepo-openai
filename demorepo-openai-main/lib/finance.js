/**
 * Deterministic GST business logic used by the AI agent layer.
 *
 * IMPORTANT: All arithmetic, tax calculations, date math, and hard validation
 * rules live here in plain code. Gemini is used only for reasoning,
 * explanation, prioritization, and recommendations — never for critical math.
 */

const GSTIN_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]{1}[Z][0-9A-Z]{1}$/;

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toDateStr(bill) {
  const raw = bill.invoiceDate || bill.date;
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().split("T")[0];
}

function monthKey(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Compliance checks (hard rules)
// ---------------------------------------------------------------------------

function checkCompliance(bills) {
  const findings = [];
  const seenInvoiceNumbers = new Map();

  const list = (bills || []).map((b, i) => ({ ...b, __idx: i }));

  for (const bill of list) {
    const invoiceRef = bill.invoiceNumber || bill.invoiceId || bill.id;
    const invoiceId = bill.invoiceId || bill.id || invoiceRef;

    const amount = toNumber(bill.amount);
    const taxAmount = toNumber(bill.taxAmount);
    const totalAmount = toNumber(bill.totalAmount);

    const push = (type, severity, description) => {
      findings.push({
        type,
        invoiceId,
        invoiceNumber: bill.invoiceNumber || "INV-AUTO",
        supplierName: bill.supplierName || "Unknown supplier",
        description,
        severity,
      });
    };

    if (totalAmount > 0 && Math.abs(amount + taxAmount - totalAmount) > 2) {
      push(
        "tax_mismatch",
        "medium",
        `Invoice arithmetic does not add up: taxable (₹${amount}) + tax (₹${taxAmount}) ≠ total (₹${totalAmount}).`
      );
    }

    const gstin = String(bill.gstin || "").trim();
    if (!gstin || gstin.toUpperCase().includes("XXXXX")) {
      push(
        "missing_gstin",
        "high",
        "Supplier GSTIN is missing or invalid. ITC may be rejected for this invoice."
      );
    } else if (!GSTIN_REGEX.test(gstin.toUpperCase())) {
      push(
        "invalid_gstin",
        "high",
        `Supplier GSTIN "${gstin}" does not match the standard 15-character GSTIN format.`
      );
    }

    if (!bill.hsn && !bill.hsnCode) {
      push(
        "missing_hsn",
        "low",
        "HSN/SAC code is missing for this invoice, which may complicate return reporting."
      );
    }

    if (!bill.invoiceNumber && !bill.invoiceDate) {
      push(
        "missing_invoice_fields",
        "medium",
        "Invoice number and date are both missing — the invoice cannot be reliably recorded."
      );
    }

    const dateStr = toDateStr(bill);
    if (dateStr) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const d = new Date(dateStr);
      if (d > new Date(Date.now() + 24 * 60 * 60 * 1000)) {
        push(
          "future_dated_invoice",
          "medium",
          `Invoice is dated ${dateStr}, which is in the future. Verify the date before filing.`
        );
      }
    }

    if (bill.invoiceNumber) {
      const key = `${bill.invoiceNumber}|${bill.supplierName || ""}`.toUpperCase();
      if (seenInvoiceNumbers.has(key)) {
        push(
          "duplicate_invoice",
          "high",
          `Invoice #${bill.invoiceNumber} appears more than once. Duplicates can inflate ITC claims.`
        );
      }
      seenInvoiceNumbers.set(key, true);
    }
  }

  // Pattern-based checks (deterministic heuristics; Gemini explains/prioritizes)
  if (list.length > 0) {
    const taxValues = list.map((b) => toNumber(b.taxAmount)).filter((n) => n > 0);
    if (taxValues.length >= 4) {
      const sorted = [...taxValues].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const outliers = list.filter(
        (b) => toNumber(b.taxAmount) > 0 && toNumber(b.taxAmount) > median * 4
      );
      for (const bill of outliers) {
        findings.push({
          type: "unusual_invoice_size",
          invoiceId: bill.invoiceId || bill.id || bill.invoiceNumber,
          invoiceNumber: bill.invoiceNumber || "INV-AUTO",
          supplierName: bill.supplierName || "Unknown supplier",
          description: `Invoice is unusually large (tax ₹${toNumber(
            bill.taxAmount
          )}) compared to the median invoice (tax ₹${median}). Verify it is legitimate.`,
          severity: "medium",
        });
      }
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Forecast (deterministic)
// ---------------------------------------------------------------------------

function buildForecast(bills) {
  const valid = (bills || []).filter((b) => toNumber(b.taxAmount) > 0);

  // Model mirrors the rest of the app: uploaded bills are purchases (inward).
  // Liability is estimated at 1.5x the recorded GST to approximate outward supply.
  const monthMap = new Map();
  for (const bill of valid) {
    const key = monthKey(toDateStr(bill) || bill.createdAt);
    if (!key) continue;
    const entry = monthMap.get(key) || { tax: 0, total: 0 };
    entry.tax += toNumber(bill.taxAmount);
    entry.total += toNumber(bill.totalAmount);
    monthMap.set(key, entry);
  }

  const months = [...monthMap.keys()].sort();
  const lastMonth = months.length ? months[months.length - 1] : null;
  const prevMonth = months.length > 1 ? months[months.length - 2] : null;

  const currentLiability = lastMonth ? Math.round(monthMap.get(lastMonth).tax * 1.5) : 0;
  const itc = valid.reduce((s, b) => s + toNumber(b.taxAmount), 0);
  const netPayable = Math.max(0, currentLiability - itc);

  let growth = 0.1; // deterministic fallback when trend cannot be computed
  if (lastMonth && prevMonth) {
    const cur = monthMap.get(lastMonth).tax;
    const prev = monthMap.get(prevMonth).tax;
    if (prev > 0) {
      growth = (cur - prev) / prev;
      growth = Math.max(-0.3, Math.min(0.5, growth));
    }
  }

  const nextMonthLiability = Math.round(currentLiability * (1 + growth));
  const savings = Math.round(Math.max(0, nextMonthLiability) * 0.06);

  const confidence = valid.length >= 20 ? "high" : valid.length >= 8 ? "medium" : "low";

  const chart = [];
  const base = new Date();
  for (let i = 1; i <= 4; i++) {
    const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
    const label = d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
    chart.push({
      month: label,
      liability: Math.round((nextMonthLiability || currentLiability) * Math.pow(1 + growth, i - 1)),
      credit: Math.round(itc * (0.95 + i * 0.02)),
      savings: savings,
    });
  }

  return {
    months,
    invoiceCount: valid.length,
    currentLiability,
    nextMonthLiability,
    itc: Math.round(itc),
    netPayable,
    growth: Math.round(growth * 100),
    savings,
    confidence,
    chart,
  };
}

// ---------------------------------------------------------------------------
// Business metrics (deterministic)
// ---------------------------------------------------------------------------

function buildMetrics(bills) {
  const total = bills || [];
  const totalInvoiceAmount = total.reduce((s, b) => s + toNumber(b.totalAmount), 0);
  const totalGSTAmount = total.reduce((s, b) => s + toNumber(b.taxAmount), 0);
  const pendingFilings = total.filter((b) => !b.filed).length;

  const vendorMap = new Map();
  for (const bill of total) {
    const name = bill.supplierName || "Unknown";
    const entry = vendorMap.get(name) || { count: 0, amount: 0, gst: 0 };
    entry.count += 1;
    entry.amount += toNumber(bill.totalAmount);
    entry.gst += toNumber(bill.taxAmount);
    vendorMap.set(name, entry);
  }
  const topVendors = [...vendorMap.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const categoryMap = new Map();
  for (const bill of total) {
    const cat = bill.category || bill.expenseType || "Uncategorised";
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + toNumber(bill.totalAmount));
  }
  const topCategories = [...categoryMap.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return {
    invoiceCount: total.length,
    totalInvoiceAmount: Math.round(totalInvoiceAmount),
    totalGSTAmount: Math.round(totalGSTAmount),
    pendingFilings,
    revenueEstimate: Math.round(totalInvoiceAmount * 1.5),
    gstPayableEstimate: Math.round(totalGSTAmount * 1.5),
    itcAvailable: Math.round(totalGSTAmount),
    netPayable: Math.max(0, Math.round(totalGSTAmount * 1.5 - totalGSTAmount)),
    topVendors,
    topCategories,
  };
}

function summarizeBills(bills, limit = 40) {
  const rows = (bills || []).slice(0, limit).map((b) => {
    return [
      `#${b.invoiceNumber || "N/A"}`,
      `date=${toDateStr(b) || "?"}`,
      `supplier=${b.supplierName || "?"}`,
      `gstin=${b.gstin || "missing"}`,
      `taxable=₹${toNumber(b.amount)}`,
      `gst=₹${toNumber(b.taxAmount)} (${b.taxPercent || 0}%)`,
      `total=₹${toNumber(b.totalAmount)}`,
      `cat=${b.category || b.expenseType || "?"}`,
      `filed=${b.filed ? "yes" : "no"}`,
    ].join(" | ");
  });
  return rows.join("\n") || "No transactions recorded.";
}

// ---------------------------------------------------------------------------
// Computed facts for AI reasoning (all deterministic)
// ---------------------------------------------------------------------------

function computeFacts(bills) {
  const valid = bills || [];
  if (valid.length === 0) {
    return { hasData: false, facts: [] };
  }

  const facts = [];
  const metrics = buildMetrics(bills);
  const forecast = buildForecast(bills);

  // Invoice counts
  facts.push(`Total invoices: ${metrics.invoiceCount}`);
  facts.push(`Total spend: ₹${metrics.totalInvoiceAmount}`);
  facts.push(`Total GST: ₹${metrics.totalGSTAmount}`);

  // Vendor concentration
  if (metrics.topVendors.length > 0) {
    const topVendor = metrics.topVendors[0];
    const concentrationPct = metrics.totalInvoiceAmount > 0
      ? Math.round((topVendor.amount / metrics.totalInvoiceAmount) * 100)
      : 0;
    facts.push(`Top vendor: ${topVendor.name} (₹${topVendor.amount}, ${concentrationPct}% of total spend)`);
    if (concentrationPct > 40) {
      facts.push(`Vendor concentration risk: ${topVendor.name} represents ${concentrationPct}% of total spend`);
    }
  }

  // Category breakdown
  if (metrics.topCategories.length > 0) {
    const cats = metrics.topCategories.slice(0, 3).map(c => `${c.name}: ₹${c.amount}`).join(", ");
    facts.push(`Top spending categories: ${cats}`);
  }

  // Filing status
  facts.push(`Pending filings: ${metrics.pendingFilings}`);
  facts.push(`Filed invoices: ${metrics.invoiceCount - metrics.pendingFilings}`);

  // Month-over-month trend
  const monthMap = new Map();
  for (const bill of valid) {
    const key = monthKey(toDateStr(bill) || bill.createdAt);
    if (!key) continue;
    const entry = monthMap.get(key) || { count: 0, tax: 0, total: 0 };
    entry.count += 1;
    entry.tax += toNumber(bill.taxAmount);
    entry.total += toNumber(bill.totalAmount);
    monthMap.set(key, entry);
  }

  const months = [...monthMap.keys()].sort();
  if (months.length >= 2) {
    const currentMonth = monthMap.get(months[months.length - 1]);
    const previousMonth = monthMap.get(months[months.length - 2]);
    const monthChange = previousMonth.total > 0
      ? Math.round(((currentMonth.total - previousMonth.total) / previousMonth.total) * 100)
      : 0;
    facts.push(`Spend trend: ${monthChange > 0 ? "+" : ""}${monthChange}% month-over-month`);
    facts.push(`Current month spend: ₹${currentMonth.total}`);
    facts.push(`Previous month spend: ₹${previousMonth.total}`);
  }

  // GSTIN validation
  const validGstins = valid.filter(b => b.gstin && GSTIN_REGEX.test((b.gstin || "").toUpperCase()));
  const invalidGstins = valid.filter(b => b.gstin && !GSTIN_REGEX.test((b.gstin || "").toUpperCase()));
  const missingGstins = valid.filter(b => !b.gstin);
  facts.push(`Invoices with valid GSTIN: ${validGstins.length}`);
  if (invalidGstins.length > 0) {
    facts.push(`Invoices with invalid GSTIN: ${invalidGstins.length}`);
  }
  if (missingGstins.length > 0) {
    facts.push(`Invoices missing GSTIN: ${missingGstins.length}`);
  }

  // Forecast
  facts.push(`Projected next month liability: ₹${forecast.nextMonthLiability}`);
  facts.push(`ITC available: ₹${forecast.itc}`);
  facts.push(`Estimated net payable: ₹${forecast.netPayable}`);
  facts.push(`Forecast confidence: ${forecast.confidence}`);

  return {
    hasData: true,
    facts,
    metrics,
    forecast,
    monthCount: months.length,
  };
}

module.exports = {
  GSTIN_REGEX,
  checkCompliance,
  buildForecast,
  buildMetrics,
  summarizeBills,
  computeFacts,
  toNumber,
};
