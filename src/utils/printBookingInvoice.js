import { BRAND } from '../config/brand';

const STATUS_LABELS = {
  new: 'Submitted',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  pending: 'Pending'
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return String(value);
  }
}

function formatDateTime(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return String(value);
  }
}

function formatMoney(value) {
  if (value == null || value === '') return null;
  const amount = Number(value);
  if (Number.isNaN(amount)) return null;
  return `$${amount.toFixed(2)}`;
}

function guestFullName(booking) {
  const fromGuest = `${booking.guest?.firstName || ''} ${booking.guest?.lastName || ''}`.trim();
  if (fromGuest) return fromGuest;
  const primary = (booking.guests || []).find((g) => g.is_primary);
  return primary?.full_name || booking.guest?.email || 'Guest';
}

function buildInvoiceRows(booking) {
  const rows = [
    ['Confirmation #', `#${booking.id}`],
    ['Booking status', STATUS_LABELS[booking.status] || booking.status || '—'],
    ['Booked on', formatDateTime(booking.createdAt)],
    ['Property', booking.hotelName || '—'],
    ['Location', booking.city || '—'],
    ['Room type', booking.roomName || '—'],
    ['Check-in', formatDate(booking.checkIn)],
    ['Check-out', formatDate(booking.checkOut)],
    ['Nights', booking.nights != null ? String(booking.nights) : '—'],
    [
      'Guests',
      `${booking.adults ?? 0} adult${(booking.adults ?? 0) === 1 ? '' : 's'}` +
        ((booking.children ?? 0) > 0 ? `, ${booking.children} child${booking.children === 1 ? '' : 'ren'}` : '') +
        ((booking.infants ?? 0) > 0 ? `, ${booking.infants} infant${booking.infants === 1 ? '' : 's'}` : '')
    ]
  ];

  if (booking.extraBedNeeded) {
    rows.push(['Extra bed', `${booking.extraBedCount || 1} requested`]);
  }

  if (booking.payment) {
    rows.push(['Payment method', booking.payment]);
  }

  if (booking.breakfast) {
    rows.push(['Breakfast', booking.breakfast]);
  }

  return rows;
}

function buildPricingRows(booking) {
  const subtotal = formatMoney(booking.subtotal);
  const tax = formatMoney(booking.tax);
  const total = formatMoney(booking.total);

  if (!subtotal && !tax && !total) {
    return [{ label: 'Estimated total', value: 'Calculated at property', highlight: true }];
  }

  const rows = [];
  if (subtotal) rows.push({ label: 'Room subtotal', value: subtotal });
  if (tax) rows.push({ label: 'Taxes & fees', value: tax });
  rows.push({
    label: 'Total',
    value: total || subtotal || '—',
    highlight: true
  });
  return rows;
}

export function buildBookingInvoiceHtml(booking, { includeToolbar = true, autoPrint = true } = {}) {
  const guestName = guestFullName(booking);
  const guestEmail = booking.guest?.email || '';
  const guestPhone = booking.guest?.phone || '';
  const status = STATUS_LABELS[booking.status] || booking.status || '—';
  const invoiceRows = buildInvoiceRows(booking);
  const pricingRows = buildPricingRows(booking);
  const issuedAt = formatDateTime(new Date().toISOString());

  const detailsHtml = invoiceRows
    .map(
      ([label, value]) => `
        <tr>
          <th scope="row">${escapeHtml(label)}</th>
          <td>${escapeHtml(value)}</td>
        </tr>`
    )
    .join('');

  const pricingHtml = pricingRows
    .map(
      (row) => `
        <div class="price-row ${row.highlight ? 'price-row--total' : ''}">
          <span>${escapeHtml(row.label)}</span>
          <strong>${escapeHtml(row.value)}</strong>
        </div>`
    )
    .join('');

  const toolbarHtml = includeToolbar
    ? `<div class="toolbar">
    <button type="button" class="btn btn-secondary" onclick="window.close()">Close</button>
    <button type="button" class="btn btn-primary" onclick="window.print()">Print / Save PDF</button>
  </div>`
    : '';

  const autoPrintScript = autoPrint
    ? `<script>
    window.addEventListener('load', function () {
      setTimeout(function () { window.print(); }, 300);
    });
  </script>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(BRAND.name)} — Booking #${escapeHtml(booking.id)}</title>
  <style>
    :root {
      --ink: #0f172a;
      --muted: #64748b;
      --line: #e2e8f0;
      --brand: #0284c7;
      --brand-soft: #e0f2fe;
      --success: #047857;
      --danger: #b91c1c;
    }

    * { box-sizing: border-box; }

    @page {
      size: A4;
      margin: 14mm;
    }

    html, body {
      margin: 0;
      padding: 0;
      color: var(--ink);
      font: 14px/1.5 "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
      background: #f8fafc;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      padding: 24px;
    }

    .sheet {
      max-width: 780px;
      margin: 0 auto;
      background: #fff;
      border: 1px solid var(--line);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
    }

    .header {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      padding: 28px 32px 22px;
      background: linear-gradient(135deg, #0ea5e9, #0284c7);
      color: #fff;
    }

    .brand h1 {
      margin: 0 0 6px;
      font-size: 28px;
      letter-spacing: 0.02em;
    }

    .brand p {
      margin: 0;
      opacity: 0.92;
      font-size: 13px;
    }

    .invoice-meta {
      text-align: right;
      min-width: 220px;
    }

    .invoice-meta .label {
      display: block;
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      opacity: 0.85;
    }

    .invoice-meta .value {
      display: block;
      margin: 4px 0 14px;
      font-size: 18px;
      font-weight: 700;
    }

    .status {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.18);
      border: 1px solid rgba(255, 255, 255, 0.35);
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .content {
      padding: 28px 32px 32px;
    }

    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
      margin-bottom: 24px;
    }

    .panel {
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 16px 18px;
      background: #fff;
    }

    .panel h2 {
      margin: 0 0 12px;
      font-size: 12px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
    }

    .panel p {
      margin: 0 0 6px;
      font-size: 15px;
    }

    .panel .muted {
      color: var(--muted);
      font-size: 13px;
    }

    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      border: 1px solid var(--line);
      border-radius: 12px;
      overflow: hidden;
    }

    .details-table th,
    .details-table td {
      padding: 11px 14px;
      border-bottom: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
    }

    .details-table tr:last-child th,
    .details-table tr:last-child td {
      border-bottom: none;
    }

    .details-table th {
      width: 34%;
      background: #f8fafc;
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .details-table td {
      font-size: 14px;
      font-weight: 600;
      color: var(--ink);
    }

    .pricing {
      margin-left: auto;
      width: min(100%, 320px);
      border: 1px solid var(--line);
      border-radius: 12px;
      overflow: hidden;
    }

    .pricing-head {
      padding: 12px 16px;
      background: var(--brand-soft);
      color: var(--brand);
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .price-row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 10px 16px;
      border-top: 1px solid var(--line);
      color: var(--muted);
      font-size: 14px;
    }

    .price-row strong {
      color: var(--ink);
      font-weight: 700;
      white-space: nowrap;
    }

    .price-row--total {
      background: #f8fafc;
      font-size: 15px;
    }

    .price-row--total span,
    .price-row--total strong {
      color: var(--ink);
      font-size: 16px;
    }

    .footer {
      margin-top: 28px;
      padding-top: 18px;
      border-top: 1px dashed var(--line);
      color: var(--muted);
      font-size: 12px;
      line-height: 1.6;
    }

    .footer strong {
      color: var(--ink);
    }

    .toolbar {
      max-width: 780px;
      margin: 0 auto 16px;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

  .btn {
      border: none;
      border-radius: 999px;
      padding: 10px 18px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
    }

    .btn-primary {
      background: #0284c7;
      color: #fff;
    }

    .btn-secondary {
      background: #fff;
      color: #334155;
      border: 1px solid var(--line);
    }

    @media print {
      html, body {
        background: #fff;
        padding: 0;
      }

      .sheet {
        border: none;
        border-radius: 0;
        box-shadow: none;
        max-width: none;
      }

      .toolbar {
        display: none !important;
      }
    }

    @media (max-width: 640px) {
      body { padding: 12px; }
      .header, .content { padding-inline: 18px; }
      .grid { grid-template-columns: 1fr; }
      .invoice-meta { text-align: left; }
    }
  </style>
</head>
<body>
  ${toolbarHtml}

  <article class="sheet">
    <header class="header">
      <div class="brand">
        <h1>${escapeHtml(BRAND.name)}</h1>
        <p>${escapeHtml(BRAND.tagline)}</p>
      </div>
      <div class="invoice-meta">
        <span class="label">Booking confirmation</span>
        <span class="value">#${escapeHtml(booking.id)}</span>
        <span class="label">Issued</span>
        <span class="value" style="font-size:14px;margin-bottom:10px;">${escapeHtml(issuedAt)}</span>
        <span class="status">${escapeHtml(status)}</span>
      </div>
    </header>

    <div class="content">
      <div class="grid">
        <section class="panel">
          <h2>Guest details</h2>
          <p><strong>${escapeHtml(guestName)}</strong></p>
          ${guestEmail ? `<p class="muted">${escapeHtml(guestEmail)}</p>` : ''}
          ${guestPhone ? `<p class="muted">${escapeHtml(guestPhone)}</p>` : ''}
        </section>
        <section class="panel">
          <h2>Stay summary</h2>
          <p><strong>${escapeHtml(booking.hotelName || 'Hotel stay')}</strong></p>
          <p class="muted">${escapeHtml(booking.roomName || '—')}${booking.city ? ` · ${escapeHtml(booking.city)}` : ''}</p>
          <p class="muted">${escapeHtml(formatDate(booking.checkIn))} → ${escapeHtml(formatDate(booking.checkOut))}</p>
        </section>
      </div>

      <table class="details-table">
        <tbody>
          ${detailsHtml}
        </tbody>
      </table>

      <div class="pricing">
        <div class="pricing-head">Payment summary</div>
        ${pricingHtml}
      </div>

      <footer class="footer">
        <p>
          <strong>${escapeHtml(BRAND.name)}</strong> — ${escapeHtml(BRAND.shortDescription)}
        </p>
        <p>
          Support: ${escapeHtml(BRAND.email)} · ${escapeHtml(BRAND.phone)} · ${escapeHtml(BRAND.address)}
        </p>
        <p>${escapeHtml(BRAND.copyright)}</p>
        <p>Please present this confirmation at check-in. This document was generated electronically and is valid without a signature.</p>
      </footer>
    </div>
  </article>

  ${autoPrintScript}
</body>
</html>`;
}

function cleanupPrintFrame(iframe) {
  if (iframe?.parentNode) {
    iframe.parentNode.removeChild(iframe);
  }
}

/** Print booking invoice in-page (no pop-up window required). */
export function printBookingInvoice(booking) {
  if (!booking) return;

  const html = buildBookingInvoiceHtml(booking, {
    includeToolbar: false,
    autoPrint: false
  });

  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', `Booking confirmation #${booking.id}`);
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const frameDoc = frameWindow?.document;

  if (!frameDoc) {
    cleanupPrintFrame(iframe);
    window.alert('Could not prepare the print view. Please try again.');
    return;
  }

  frameDoc.open();
  frameDoc.write(html);
  frameDoc.close();

  const triggerPrint = () => {
    try {
      frameWindow.focus();
      frameWindow.print();
    } catch {
      window.alert('Could not start printing. Please try again.');
      cleanupPrintFrame(iframe);
    }
  };

  const schedulePrint = () => setTimeout(triggerPrint, 300);

  frameWindow.addEventListener('afterprint', () => cleanupPrintFrame(iframe), { once: true });
  setTimeout(() => cleanupPrintFrame(iframe), 120000);

  if (frameDoc.readyState === 'complete') {
    schedulePrint();
  } else {
    iframe.onload = schedulePrint;
  }
}

