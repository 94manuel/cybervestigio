import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib';
import { getAdminInvoice, getAdminSettings } from '@/lib/api';
import { INVOICE_DOCUMENT_CODE, INVOICE_DOCUMENT_TITLE, INVOICE_DOCUMENT_VERSION, buildInvoiceDocumentData, dateFormat, moneyFormat, statusLabel } from '@/lib/invoice-document';
import { requireAdminToken } from '@/lib/session';
import type { Invoice, SiteSettings } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 42;
const TOP_Y = PAGE_HEIGHT - 44;
const BOTTOM_Y = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

const palette = {
  navy: rgb(0 / 255, 26 / 255, 71 / 255),
  blue: rgb(10 / 255, 146 / 255, 211 / 255),
  ink: rgb(16 / 255, 40 / 255, 66 / 255),
  muted: rgb(106 / 255, 120 / 255, 138 / 255),
  line: rgb(209 / 255, 220 / 255, 231 / 255),
  soft: rgb(243 / 255, 247 / 255, 250 / 255),
  white: rgb(1, 1, 1),
};

type Cursor = {
  page: PDFPage;
  y: number;
};

function sanitizeFileName(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]+/g, '_');
}

function wrapText(text: string, font: PDFFont, size: number, width: number): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [''];

  const words = clean.split(' ');
  const lines: string[] = [];
  let current = words[0] ?? '';

  for (const word of words.slice(1)) {
    const next = `${current} ${word}`;
    if (font.widthOfTextAtSize(next, size) <= width) {
      current = next;
      continue;
    }
    lines.push(current);
    current = word;
  }

  if (current) lines.push(current);
  return lines;
}

function drawParagraph(
  page: PDFPage,
  text: string,
  options: {
    font: PDFFont;
    size: number;
    x: number;
    y: number;
    width: number;
    lineHeight: number;
    color: ReturnType<typeof rgb>;
  },
): number {
  const lines = wrapText(text, options.font, options.size, options.width);
  lines.forEach((line, index) => {
    page.drawText(line, {
      x: options.x,
      y: options.y - index * options.lineHeight,
      size: options.size,
      font: options.font,
      color: options.color,
    });
  });
  return lines.length * options.lineHeight;
}

function drawCard(
  page: PDFPage,
  options: {
    x: number;
    y: number;
    width: number;
    height: number;
    title: string;
    rows: Array<{ label: string; value: string }>;
    labelFont: PDFFont;
    valueFont: PDFFont;
  },
) {
  page.drawRectangle({
    x: options.x,
    y: options.y - options.height,
    width: options.width,
    height: options.height,
    color: palette.white,
    borderColor: palette.line,
    borderWidth: 1,
  });

  page.drawText(options.title.toUpperCase(), {
    x: options.x + 14,
    y: options.y - 20,
    size: 9,
    font: options.labelFont,
    color: palette.blue,
  });

  let cursorY = options.y - 38;
  options.rows.forEach((row) => {
    page.drawText(row.label.toUpperCase(), {
      x: options.x + 14,
      y: cursorY,
      size: 7.5,
      font: options.labelFont,
      color: palette.muted,
    });
    cursorY -= 10;
    cursorY -= drawParagraph(page, row.value, {
      font: options.valueFont,
      size: 9.5,
      x: options.x + 14,
      y: cursorY,
      width: options.width - 28,
      lineHeight: 11,
      color: palette.ink,
    });
    cursorY -= 8;
  });
}

async function loadLogo(pdfDoc: PDFDocument, logoBytes?: ArrayBuffer): Promise<PDFImage | null> {
  try {
    if (!logoBytes) return null;
    return await pdfDoc.embedPng(logoBytes);
  } catch {
    return null;
  }
}

function createPage(pdfDoc: PDFDocument, sansBold: PDFFont): Cursor {
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 12, width: PAGE_WIDTH, height: 12, color: palette.navy });
  page.drawRectangle({ x: MARGIN_X, y: BOTTOM_Y - 16, width: CONTENT_WIDTH, height: 0.8, color: palette.line });
  page.drawText(`CyberVestigio · ${INVOICE_DOCUMENT_CODE} · v${INVOICE_DOCUMENT_VERSION}`, {
    x: MARGIN_X,
    y: BOTTOM_Y - 30,
    size: 8,
    font: sansBold,
    color: palette.muted,
  });
  return { page, y: TOP_Y };
}

function ensureSpace(cursor: Cursor, pdfDoc: PDFDocument, sansBold: PDFFont, requiredHeight: number): Cursor {
  if (cursor.y - requiredHeight >= BOTTOM_Y) return cursor;
  return createPage(pdfDoc, sansBold);
}

function drawTableHeader(page: PDFPage, y: number, font: PDFFont) {
  const columns = [36, 230, 60, 96, 93];
  const headers = ['No.', 'Concepto', 'Cant.', 'Vr. unitario', 'Vr. total'];
  let x = MARGIN_X;

  page.drawRectangle({ x: MARGIN_X, y: y - 22, width: CONTENT_WIDTH, height: 22, color: palette.navy });
  headers.forEach((header, index) => {
    page.drawText(header, {
      x: x + 8,
      y: y - 14,
      size: 8.5,
      font,
      color: palette.white,
    });
    x += columns[index] ?? 0;
  });
}

async function buildInvoicePdf(invoice: Invoice, settings: SiteSettings, logoBytes?: ArrayBuffer): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const sans = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const serif = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const logo = await loadLogo(pdfDoc, logoBytes);
  const documentData = buildInvoiceDocumentData(invoice, settings);

  let cursor = createPage(pdfDoc, sansBold);

  if (logo) {
    const ratio = logo.width / logo.height;
    const width = 164;
    const height = width / ratio;
    cursor.page.drawImage(logo, { x: MARGIN_X, y: cursor.y - height + 4, width, height });
  }

  cursor.page.drawText('CONTROL DOCUMENTAL Y FACTURACION', {
    x: MARGIN_X,
    y: cursor.y - 62,
    size: 9,
    font: sansBold,
    color: palette.blue,
  });

  cursor.page.drawText(INVOICE_DOCUMENT_TITLE.toUpperCase(), {
    x: MARGIN_X,
    y: cursor.y - 84,
    size: 18,
    font: serifBold,
    color: palette.navy,
  });

  drawParagraph(cursor.page, documentData.purpose, {
    font: serif,
    size: 10.5,
    x: MARGIN_X,
    y: cursor.y - 102,
    width: 290,
    lineHeight: 13,
    color: palette.ink,
  });

  cursor.page.drawRectangle({
    x: PAGE_WIDTH - 190,
    y: cursor.y - 116,
    width: 148,
    height: 88,
    color: palette.soft,
    borderColor: palette.line,
    borderWidth: 1,
  });

  const topRows = [
    ['Codigo', INVOICE_DOCUMENT_CODE],
    ['Version', `v${INVOICE_DOCUMENT_VERSION}`],
    ['Estado', statusLabel[invoice.status]],
    ['Clasificacion', 'Confidencial'],
    ['Emision', dateFormat(invoice.createdAt)],
    ['Vencimiento', dateFormat(invoice.dueDate)],
  ];
  let topY = cursor.y - 48;
  topRows.forEach(([label, value]) => {
    cursor.page.drawText(label.toUpperCase(), {
      x: PAGE_WIDTH - 176,
      y: topY,
      size: 7.5,
      font: sansBold,
      color: palette.muted,
    });
    topY -= 10;
    cursor.page.drawText(value, {
      x: PAGE_WIDTH - 176,
      y: topY,
      size: 9,
      font: sans,
      color: palette.ink,
    });
    topY -= 12;
  });

  cursor.y -= 168;

  const cardWidth = (CONTENT_WIDTH - 12) / 2;
  const cardHeight = 118;
  const cards = [
    {
      title: 'Entidad emisora',
      rows: documentData.issuerRows.slice(0, 3),
    },
    {
      title: 'Cliente / destinatario',
      rows: documentData.clientRows.slice(0, 3),
    },
    {
      title: 'Documento de cobro',
      rows: [
        { label: 'Consecutivo', value: invoice.invoiceNumber },
        { label: 'Moneda', value: invoice.currency },
        { label: 'Identificacion de copia', value: 'Controlada de uso interno' },
      ],
    },
    {
      title: 'Resumen economico',
      rows: documentData.amountRows.slice(0, 3),
    },
  ];

  cards.forEach((card, index) => {
    const x = MARGIN_X + (index % 2) * (cardWidth + 12);
    const y = cursor.y - Math.floor(index / 2) * (cardHeight + 12);
    drawCard(cursor.page, {
      x,
      y,
      width: cardWidth,
      height: cardHeight,
      title: card.title,
      rows: card.rows,
      labelFont: sansBold,
      valueFont: sans,
    });
  });

  cursor.y -= cardHeight * 2 + 42;

  cursor = ensureSpace(cursor, pdfDoc, sansBold, 90);
  cursor.page.drawText('ALCANCE DEL SERVICIO', {
    x: MARGIN_X,
    y: cursor.y,
    size: 10,
    font: sansBold,
    color: palette.blue,
  });
  cursor.y -= 16;
  const descriptionHeight = drawParagraph(cursor.page, invoice.description, {
    font: serif,
    size: 11,
    x: MARGIN_X,
    y: cursor.y,
    width: CONTENT_WIDTH,
    lineHeight: 14,
    color: palette.ink,
  });
  cursor.y -= descriptionHeight + 18;

  cursor = ensureSpace(cursor, pdfDoc, sansBold, 70);
  cursor.page.drawText('RELACION DE CONCEPTOS FACTURADOS', {
    x: MARGIN_X,
    y: cursor.y,
    size: 10,
    font: sansBold,
    color: palette.blue,
  });
  cursor.y -= 14;

  drawTableHeader(cursor.page, cursor.y, sansBold);
  cursor.y -= 26;

  const columns = [36, 230, 60, 96, 93];

  invoice.lineItems.forEach((item, index) => {
    const conceptLines = wrapText(item.title, sans, 9.5, columns[1] - 16);
    const rowHeight = Math.max(26, conceptLines.length * 12 + 10);

    cursor = ensureSpace(cursor, pdfDoc, sansBold, rowHeight + 24);
    if (cursor.y > TOP_Y - 30) {
      cursor.page.drawText('RELACION DE CONCEPTOS FACTURADOS', {
        x: MARGIN_X,
        y: cursor.y,
        size: 10,
        font: sansBold,
        color: palette.blue,
      });
      cursor.y -= 14;
      drawTableHeader(cursor.page, cursor.y, sansBold);
      cursor.y -= 26;
    }

    cursor.page.drawRectangle({
      x: MARGIN_X,
      y: cursor.y - rowHeight,
      width: CONTENT_WIDTH,
      height: rowHeight,
      color: index % 2 === 0 ? palette.white : palette.soft,
      borderColor: palette.line,
      borderWidth: 0.6,
    });

    let x = MARGIN_X + 8;
    cursor.page.drawText(String(index + 1).padStart(2, '0'), {
      x,
      y: cursor.y - 14,
      size: 9,
      font: sansBold,
      color: palette.ink,
    });
    x += columns[0];

    drawParagraph(cursor.page, item.title, {
      font: sans,
      size: 9.5,
      x,
      y: cursor.y - 14,
      width: columns[1] - 16,
      lineHeight: 12,
      color: palette.ink,
    });
    x += columns[1];

    cursor.page.drawText(String(item.quantity), {
      x,
      y: cursor.y - 14,
      size: 9,
      font: sans,
      color: palette.ink,
    });
    x += columns[2];

    cursor.page.drawText(moneyFormat(item.unitPrice, invoice.currency), {
      x,
      y: cursor.y - 14,
      size: 9,
      font: sans,
      color: palette.ink,
    });
    x += columns[3];

    cursor.page.drawText(moneyFormat(item.lineTotal, invoice.currency), {
      x,
      y: cursor.y - 14,
      size: 9,
      font: sansBold,
      color: palette.navy,
    });

    cursor.y -= rowHeight;
  });

  cursor.y -= 18;
  cursor = ensureSpace(cursor, pdfDoc, sansBold, 150);

  cursor.page.drawRectangle({
    x: PAGE_WIDTH - 210,
    y: cursor.y - 86,
    width: 168,
    height: 86,
    color: palette.soft,
    borderColor: palette.line,
    borderWidth: 1,
  });

  const totalRows = [
    ['Subtotal', moneyFormat(invoice.subtotal, invoice.currency)],
    ['Descuento', moneyFormat(invoice.agreementDiscountAmount, invoice.currency)],
    ['Total', moneyFormat(invoice.amount, invoice.currency)],
  ];
  let totalsY = cursor.y - 18;
  totalRows.forEach(([label, value]) => {
    cursor.page.drawText(label, {
      x: PAGE_WIDTH - 196,
      y: totalsY,
      size: 9,
      font: sans,
      color: palette.ink,
    });
    cursor.page.drawText(value, {
      x: PAGE_WIDTH - 120,
      y: totalsY,
      size: label === 'Total' ? 10 : 9,
      font: label === 'Total' ? sansBold : sans,
      color: label === 'Total' ? palette.navy : palette.ink,
    });
    totalsY -= 18;
  });

  cursor.page.drawText('OBSERVACIONES Y CONDICIONES', {
    x: MARGIN_X,
    y: cursor.y,
    size: 10,
    font: sansBold,
    color: palette.blue,
  });
  cursor.y -= 16;

  const notes = [
    documentData.notesText,
    `Convenio: ${documentData.agreementText}.`,
    `Portal de pago asociado: ${invoice.paymentUrl}`,
  ].join(' ');

  const notesHeight = drawParagraph(cursor.page, notes, {
    font: serif,
    size: 10.5,
    x: MARGIN_X,
    y: cursor.y,
    width: CONTENT_WIDTH - 188,
    lineHeight: 13,
    color: palette.ink,
  });

  cursor.y -= Math.max(notesHeight, 86) + 26;
  cursor = ensureSpace(cursor, pdfDoc, sansBold, 170);

  cursor.page.drawText('FIRMAS Y APROBACIONES', {
    x: MARGIN_X,
    y: cursor.y,
    size: 10,
    font: sansBold,
    color: palette.blue,
  });
  cursor.y -= 16;

  const signatureWidth = (CONTENT_WIDTH - 20) / 3;
  documentData.signatoryRows.forEach((row, index) => {
    const x = MARGIN_X + index * (signatureWidth + 10);
    cursor.page.drawRectangle({
      x,
      y: cursor.y - 108,
      width: signatureWidth,
      height: 108,
      color: palette.white,
      borderColor: palette.line,
      borderWidth: 1,
    });
    cursor.page.drawText(row.role.toUpperCase(), {
      x: x + 14,
      y: cursor.y - 18,
      size: 8,
      font: sansBold,
      color: palette.blue,
    });
    cursor.page.drawText(row.signer, {
      x: x + 14,
      y: cursor.y - 38,
      size: 9.5,
      font: sansBold,
      color: palette.navy,
      maxWidth: signatureWidth - 28,
    });
    drawParagraph(cursor.page, row.note, {
      font: sans,
      size: 8.5,
      x: x + 14,
      y: cursor.y - 56,
      width: signatureWidth - 28,
      lineHeight: 10,
      color: palette.ink,
    });
    cursor.page.drawRectangle({
      x: x + 14,
      y: cursor.y - 92,
      width: signatureWidth - 28,
      height: 1,
      color: palette.line,
    });
  });

  cursor.y -= 126;
  cursor = ensureSpace(cursor, pdfDoc, sansBold, 60);
  drawParagraph(cursor.page, documentData.legalNotice, {
    font: sans,
    size: 8.5,
    x: MARGIN_X,
    y: cursor.y,
    width: CONTENT_WIDTH,
    lineHeight: 10,
    color: palette.muted,
  });

  return pdfDoc.save();
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = await requireAdminToken();
  const { id } = await params;
  const [invoice, settings] = await Promise.all([getAdminInvoice(token, id), getAdminSettings(token)]);

  if (!invoice) {
    return new Response('Factura no encontrada.', { status: 404 });
  }

  let logoBytes: ArrayBuffer | undefined;
  try {
    const logoResponse = await fetch(new URL('/brand/cybervestigio-logo-cropped.png', request.url), { cache: 'force-cache' });
    if (logoResponse.ok) {
      logoBytes = await logoResponse.arrayBuffer();
    }
  } catch {
    logoBytes = undefined;
  }

  const pdf = await buildInvoicePdf(invoice, settings, logoBytes);
  const fileName = `Factura_${sanitizeFileName(invoice.invoiceNumber)}.pdf`;
  const body = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    },
  });
}