"""
Gamma International ERP - PDF Document Generator v2
====================================================
Rebuilt to match the actual Gamma International offer template.
Key features:
  - Company logo + certification badges in header
  - Product catalog style: each item gets its own block with image + full specs
  - Item Code column
  - Bilingual (English + Arabic) terms
  - Product images alongside descriptions
  - 4 doc types: Offer, Supplier PI, Supplier PO, Commercial Invoice
"""

import os
import io
from datetime import datetime, date

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer,
    Image, KeepTogether, PageBreak
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

import arabic_reshaper
from bidi.algorithm import get_display

# ── Fonts ──
FONT_DIR = '/usr/share/fonts/truetype/dejavu'
pdfmetrics.registerFont(TTFont('DejaVu', os.path.join(FONT_DIR, 'DejaVuSans.ttf')))
pdfmetrics.registerFont(TTFont('DejaVuBd', os.path.join(FONT_DIR, 'DejaVuSans-Bold.ttf')))

# ── Colors (matching Gamma International branding) ──
GAMMA_YELLOW = HexColor('#F5C518')
GAMMA_DARK   = HexColor('#333333')
GAMMA_GRAY   = HexColor('#666666')
HEADER_BG    = HexColor('#2C3E50')
ROW_ALT      = HexColor('#F8F9FA')
BORDER_CLR   = HexColor('#DEE2E6')
WHITE        = HexColor('#FFFFFF')
BLACK        = HexColor('#000000')

# Doc type themes
DOC_THEMES = {
    'offer':       {'accent': HexColor('#2B6CB0'), 'header_bg': HexColor('#1A365D'), 'label_en': 'QUOTATION / OFFER', 'label_ar': 'عرض سعر'},
    'supplier_pi': {'accent': HexColor('#2F855A'), 'header_bg': HexColor('#1C4532'), 'label_en': 'PROFORMA INVOICE',  'label_ar': 'فاتورة أولية'},
    'supplier_po': {'accent': HexColor('#C53030'), 'header_bg': HexColor('#742A2A'), 'label_en': 'PURCHASE ORDER',    'label_ar': 'أمر شراء'},
    'invoice':     {'accent': HexColor('#D69E2E'), 'header_bg': HexColor('#744210'), 'label_en': 'COMMERCIAL INVOICE','label_ar': 'فاتورة تجارية'},
}

def ar(text):
    if not text: return ''
    return get_display(arabic_reshaper.reshape(str(text)))

def fmt_currency(amount, currency='USD'):
    try: val = float(amount)
    except: return f'{currency} 0.00'
    syms = {'USD': '$', 'EUR': '€', 'CNY': '¥', 'IQD': 'IQD '}
    sym = syms.get(currency, currency + ' ')
    if currency == 'IQD': return f'IQD {val:,.0f}'
    return f'{sym}{val:,.2f}'

def fmt_date(d):
    if isinstance(d, (date, datetime)): return d.strftime('%d / %m / %Y')
    if isinstance(d, str) and d:
        try: return datetime.strptime(d, '%Y-%m-%d').strftime('%d / %m / %Y')
        except: return d
    return '—'

# ── Company defaults ──
DEFAULT_COMPANY = {
    'name_en': 'Gamma International',
    'name_ar': 'غاما الدولية',
    'address_en': 'Baghdad, Iraq',
    'address_ar': 'بغداد، العراق',
    'phone': '+964 XXX XXX XXXX',
    'email': 'info@gammaintl.com',
    'website': 'www.gammaintl.com',
    'tax_id': 'CR-XXXXXXX',
    'cr_number': 'XXXXXXX',
    'logo_path': None,
    'cert_logos': [],  # list of paths to certification logos (ISO, URS, etc.)
}


class GammaCatalogPDF:
    """Generates a catalog-style PDF matching the actual Gamma International offer format."""

    def __init__(self, doc_type, data, company=None, output_path=None):
        self.doc_type = doc_type
        self.data = data
        self.company = {**DEFAULT_COMPANY, **(company or {})}
        self.output_path = output_path
        self.theme = DOC_THEMES.get(doc_type, DOC_THEMES['offer'])
        self.width, self.height = A4
        self.margin = 12 * mm
        self.usable = self.width - 2 * self.margin
        self._init_styles()

    def _init_styles(self):
        accent = self.theme['accent']
        self.s = {
            'greeting': ParagraphStyle('greeting', fontName='DejaVuBd', fontSize=10, leading=13, textColor=GAMMA_DARK),
            'intro': ParagraphStyle('intro', fontName='DejaVu', fontSize=8, leading=11, textColor=GAMMA_GRAY),
            'field_label': ParagraphStyle('fl', fontName='DejaVuBd', fontSize=8, leading=10, textColor=GAMMA_DARK),
            'field_value': ParagraphStyle('fv', fontName='DejaVu', fontSize=9, leading=12, textColor=BLACK),
            'field_value_ar': ParagraphStyle('fva', fontName='DejaVu', fontSize=9, leading=12, textColor=BLACK, alignment=TA_CENTER),
            'th': ParagraphStyle('th', fontName='DejaVuBd', fontSize=7.5, leading=10, textColor=WHITE, alignment=TA_CENTER),
            'item_code': ParagraphStyle('ic', fontName='DejaVuBd', fontSize=7, leading=9, textColor=GAMMA_DARK, alignment=TA_CENTER),
            'item_desc': ParagraphStyle('id', fontName='DejaVu', fontSize=7, leading=9.5, textColor=GAMMA_DARK),
            'item_desc_title': ParagraphStyle('idt', fontName='DejaVuBd', fontSize=8, leading=11, textColor=accent),
            'item_num': ParagraphStyle('in', fontName='DejaVu', fontSize=8, leading=10, textColor=BLACK, alignment=TA_CENTER),
            'item_price': ParagraphStyle('ip', fontName='DejaVuBd', fontSize=8, leading=10, textColor=BLACK, alignment=TA_CENTER),
            'total_label': ParagraphStyle('tl', fontName='DejaVuBd', fontSize=9, leading=12, textColor=GAMMA_DARK, alignment=TA_RIGHT),
            'total_value': ParagraphStyle('tv', fontName='DejaVuBd', fontSize=10, leading=13, textColor=accent, alignment=TA_CENTER),
            'grand_label': ParagraphStyle('gl', fontName='DejaVuBd', fontSize=10, leading=13, textColor=WHITE, alignment=TA_RIGHT),
            'grand_value': ParagraphStyle('gv', fontName='DejaVuBd', fontSize=11, leading=14, textColor=WHITE, alignment=TA_CENTER),
            'terms': ParagraphStyle('terms', fontName='DejaVu', fontSize=7.5, leading=10, textColor=GAMMA_DARK),
            'terms_ar': ParagraphStyle('terms_ar', fontName='DejaVu', fontSize=8, leading=11, textColor=GAMMA_DARK, alignment=TA_RIGHT),
            'compliance': ParagraphStyle('comp', fontName='DejaVuBd', fontSize=7.5, leading=10, textColor=GAMMA_DARK, alignment=TA_CENTER),
            'footer': ParagraphStyle('footer', fontName='DejaVu', fontSize=6, leading=8, textColor=GAMMA_GRAY, alignment=TA_CENTER),
            'no': ParagraphStyle('no', fontName='DejaVuBd', fontSize=9, leading=12, textColor=WHITE, alignment=TA_CENTER),
        }

    def build(self):
        target = self.output_path or io.BytesIO()
        doc = SimpleDocTemplate(
            target, pagesize=A4,
            leftMargin=self.margin, rightMargin=self.margin,
            topMargin=45*mm, bottomMargin=18*mm,
        )
        story = []
        self._add_client_info(story)
        self._add_items(story)
        self._add_totals(story)
        self._add_compliance(story)
        self._add_terms(story)
        self._add_signature(story)

        doc.build(story, onFirstPage=self._draw_header_footer, onLaterPages=self._draw_header_footer)

        if not self.output_path:
            target.seek(0)
        return target

    # ═══ HEADER & FOOTER (canvas-drawn) ═══
    def _draw_header_footer(self, c, doc):
        c.saveState()
        self._draw_header(c)
        self._draw_footer(c)
        c.restoreState()

    def _draw_header(self, c):
        w, h = self.width, self.height
        hdr_h = 38 * mm

        # Background
        c.setFillColor(self.theme['header_bg'])
        c.rect(0, h - hdr_h, w, hdr_h, fill=1, stroke=0)

        # Accent stripe
        c.setFillColor(GAMMA_YELLOW)
        c.rect(0, h - hdr_h, w, 1.2*mm, fill=1, stroke=0)

        # Company logo
        logo = self.company.get('logo_path')
        if logo and os.path.exists(logo):
            try:
                c.drawImage(logo, self.margin, h - 33*mm, width=28*mm, height=25*mm,
                           preserveAspectRatio=True, mask='auto')
            except:
                self._draw_logo_placeholder(c, h)
        else:
            self._draw_logo_placeholder(c, h)

        # Company name
        name_x = self.margin + 32*mm
        c.setFillColor(WHITE)
        c.setFont('DejaVuBd', 16)
        c.drawString(name_x, h - 15*mm, self.company['name_en'])
        c.setFont('DejaVu', 10)
        c.setFillColor(GAMMA_YELLOW)
        c.drawString(name_x, h - 22*mm, ar(self.company['name_ar']))
        c.setFont('DejaVu', 7)
        c.setFillColor(HexColor('#BDC3C7'))
        c.drawString(name_x, h - 28*mm,
            f"{self.company['address_en']}  |  {self.company['phone']}  |  {self.company['email']}")

        # Doc type badge (right side)
        badge_w = 50*mm
        badge_x = w - self.margin - badge_w
        badge_y = h - 22*mm
        c.setFillColor(self.theme['accent'])
        c.roundRect(badge_x, badge_y, badge_w, 12*mm, 2*mm, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont('DejaVuBd', 8)
        c.drawCentredString(badge_x + badge_w/2, badge_y + 6.5*mm, self.theme['label_en'])
        c.setFont('DejaVu', 7)
        c.drawCentredString(badge_x + badge_w/2, badge_y + 2*mm, ar(self.theme['label_ar']))

        # Certification logos (right of company name)
        certs = self.company.get('cert_logos', [])
        cert_x = w - self.margin - 15*mm
        for cert_path in reversed(certs):
            if os.path.exists(cert_path):
                try:
                    c.drawImage(cert_path, cert_x, h - 35*mm, width=12*mm, height=12*mm,
                               preserveAspectRatio=True, mask='auto')
                    cert_x -= 14*mm
                except:
                    pass

    def _draw_logo_placeholder(self, c, h):
        cx = self.margin + 14*mm
        cy = h - 20*mm
        c.setFillColor(GAMMA_YELLOW)
        c.circle(cx, cy, 10*mm, fill=1, stroke=0)
        c.setFillColor(self.theme['header_bg'])
        c.setFont('DejaVuBd', 18)
        c.drawCentredString(cx, cy - 5, 'G')

    def _draw_footer(self, c):
        w = self.width
        y = 12*mm
        c.setStrokeColor(BORDER_CLR)
        c.setLineWidth(0.4)
        c.line(self.margin, y, w - self.margin, y)
        c.setFont('DejaVu', 5.5)
        c.setFillColor(GAMMA_GRAY)
        c.drawCentredString(w/2, y - 4*mm,
            f"{self.company['name_en']}  |  {self.company['phone']}  |  {self.company['email']}  |  Tax ID: {self.company['tax_id']}")
        c.drawRightString(w - self.margin, y - 4*mm, f"Page {c.getPageNumber()}")

    # ═══ CLIENT / SUPPLIER INFO ═══
    def _add_client_info(self, story):
        d = self.data
        s = self.s

        # Greeting
        sender_info = d.get('sender_info', {}) or {}
        sender_name = sender_info.get('name', '')
        story.append(Paragraph("Dear Sir, / السيد المحترم", s['greeting']))
        story.append(Spacer(1, 2*mm))
        story.append(Paragraph(
            "We have the pleasure to submit our offer with our best prices in order to have a long term business relationship.",
            s['intro']))
        story.append(Spacer(1, 4*mm))

        # Info fields (two-column)
        is_client = self.doc_type in ('offer', 'invoice')
        party_name = d.get('client_name', '') if is_client else d.get('supplier_name', '')
        party_company = d.get('client_company', '') if is_client else d.get('supplier_company', '')
        party_phone = d.get('client_phone', '') if is_client else d.get('supplier_phone', '')
        party_email = d.get('client_email', '') if is_client else d.get('supplier_email', '')
        party_address = d.get('client_address', '') if is_client else d.get('supplier_address', '')

        left_data = [
            ['To / إلى :', party_company or party_name],
            ['Phone :', party_phone],
            ['Attention :', party_name],
            ['Mobile :', d.get('client_mobile', party_phone)],
            ['Subject :', d.get('subject', d.get('reference', ''))],
        ]
        right_data = [
            ['Date :', fmt_date(d.get('date', d.get('issue_date', '')))],
            ['Offer Ref :', d.get('offer_reference', d.get('doc_number', ''))],
            ['Email :', party_email],
            ['Offer Valid Until :', fmt_date(d.get('valid_until', d.get('due_date', '')))],
            ['Currency :', d.get('currency', 'USD')],
        ]

        rows = []
        for i in range(max(len(left_data), len(right_data))):
            lk = left_data[i][0] if i < len(left_data) else ''
            lv = left_data[i][1] if i < len(left_data) else ''
            rk = right_data[i][0] if i < len(right_data) else ''
            rv = right_data[i][1] if i < len(right_data) else ''
            rows.append([
                Paragraph(f"<b>{lk}</b>", s['field_label']),
                Paragraph(str(lv), s['field_value']),
                Paragraph(f"<b>{rk}</b>", s['field_label']),
                Paragraph(str(rv), s['field_value']),
            ])

        info_table = Table(rows, colWidths=[22*mm, self.usable*0.36, 20*mm, self.usable*0.28])
        info_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING', (0,0), (-1,-1), 2),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2),
            ('LINEBELOW', (0,0), (-1,-1), 0.3, BORDER_CLR),
        ]))
        story.append(info_table)
        story.append(Spacer(1, 5*mm))

    # ═══ LINE ITEMS (catalog style) ═══
    def _add_items(self, story):
        d = self.data
        s = self.s
        items = d.get('items', d.get('lines', []))
        currency = d.get('currency', 'USD')

        # Table header
        has_image = any(item.get('image_path') for item in items)
        show_sku = self.doc_type in ('offer', 'supplier_pi', 'supplier_po')

        # Column header
        hdr_cols = [
            Paragraph('<b>NO.</b>', s['th']),
            Paragraph('<b>Item Code</b>', s['th']),
            Paragraph('<b>Description of Goods<br/>وصف البضاعة</b>', s['th']),
        ]
        col_widths = [8*mm, 22*mm, self.usable*0.42]

        if has_image:
            hdr_cols.append(Paragraph('<b>Image</b>', s['th']))
            col_widths.append(25*mm)
        else:
            col_widths[2] = self.usable*0.50  # wider desc if no images

        hdr_cols.extend([
            Paragraph(f'<b>Qty<br/>{ar("الكمية")}</b>', s['th']),
            Paragraph(f'<b>Unit Price<br/>{ar("سعر الوحدة")}</b>', s['th']),
            Paragraph(f'<b>Total Price<br/>{ar("المجموع")}</b>', s['th']),
        ])
        remaining = self.usable - sum(col_widths)
        price_w = remaining / 3
        col_widths.extend([price_w, price_w, price_w])

        table_data = [hdr_cols]

        # Item rows
        for idx, item in enumerate(items, 1):
            desc_text = item.get('description', item.get('name', '—'))
            title_line = desc_text.split('\n')[0] if '\n' in desc_text else desc_text
            spec_lines = '\n'.join(desc_text.split('\n')[1:]) if '\n' in desc_text else ''

            # Build rich description
            desc_parts = [f"<font name='DejaVuBd' size='8' color='{self.theme['accent'].hexval()}'>{title_line}</font>"]
            if spec_lines:
                clean_specs = spec_lines.replace('\n', '<br/>')
                desc_parts.append(f"<br/><font name='DejaVu' size='6.5' color='#555555'>{clean_specs}</font>")

            # Arabic description if present
            ar_desc = item.get('description_ar', '')
            if ar_desc:
                desc_parts.append(f"<br/><font name='DejaVu' size='6.5' color='#777777'>{ar(ar_desc)}</font>")

            row = [
                Paragraph(f"<b>{idx}</b>", s['no'] if False else s['item_num']),
                Paragraph(item.get('item_code', item.get('sku', '')), s['item_code']),
                Paragraph('<br/>'.join(desc_parts), s['item_desc']),
            ]

            if has_image:
                img_path = item.get('image_path', '')
                if img_path and os.path.exists(img_path):
                    try:
                        row.append(Image(img_path, width=22*mm, height=22*mm))
                    except:
                        row.append(Paragraph('—', s['item_num']))
                else:
                    row.append(Paragraph('—', s['item_num']))

            qty = item.get('quantity', item.get('qty', 0))
            unit_price = item.get('unit_price', item.get('price', 0))
            total = item.get('total', item.get('line_total', 0))

            row.extend([
                Paragraph(str(qty), s['item_num']),
                Paragraph(fmt_currency(unit_price, currency), s['item_price']),
                Paragraph(fmt_currency(total, currency), s['item_price']),
            ])
            table_data.append(row)

        table = Table(table_data, colWidths=col_widths, repeatRows=1)
        style_cmds = [
            # Header
            ('BACKGROUND', (0, 0), (-1, 0), self.theme['header_bg']),
            ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
            ('TOPPADDING', (0, 0), (-1, 0), 4),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 4),
            # All cells
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 1), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('RIGHTPADDING', (0, 0), (-1, -1), 3),
            # Grid
            ('GRID', (0, 0), (-1, -1), 0.4, BORDER_CLR),
            ('LINEBELOW', (0, 0), (-1, 0), 1, self.theme['accent']),
        ]
        # Alternate row backgrounds
        for i in range(2, len(table_data), 2):
            style_cmds.append(('BACKGROUND', (0, i), (-1, i), ROW_ALT))

        table.setStyle(TableStyle(style_cmds))
        story.append(table)

    # ═══ TOTALS ═══
    def _add_totals(self, story):
        d = self.data
        s = self.s
        currency = d.get('currency', 'USD')
        story.append(Spacer(1, 3*mm))

        rows = []
        sub = d.get('subtotal')
        if sub is not None:
            rows.append(('Subtotal / المجموع الفرعي', fmt_currency(sub, currency), False))

        for key, en, ar_l in [('shipping_cost','Shipping','الشحن'),('insurance_cost','Insurance','التأمين'),('customs_cost','Customs','الجمارك')]:
            val = d.get(key)
            if val and float(val) > 0:
                rows.append((f'{en} / {ar(ar_l)}', fmt_currency(val, currency), False))

        tax = d.get('tax_amount')
        if tax and float(tax) > 0:
            rows.append(('Tax / الضريبة', fmt_currency(tax, currency), False))

        disc = d.get('discount_amount')
        if disc and float(disc) > 0:
            rows.append(('Discount / الخصم', f'-{fmt_currency(disc, currency)}', False))

        total = d.get('total', 0)
        rows.append(('TOTAL / الإجمالي', fmt_currency(total, currency), True))

        if self.doc_type == 'invoice':
            paid = d.get('amount_paid')
            if paid and float(paid) > 0:
                rows.append(('Amount Paid / المبلغ المدفوع', fmt_currency(paid, currency), False))
            bal = d.get('balance_due')
            if bal and float(bal) > 0:
                rows.append(('BALANCE DUE / المبلغ المتبقي', fmt_currency(bal, currency), True))

        if self.doc_type == 'supplier_pi':
            rate = d.get('exchange_rate_to_iqd')
            if rate and float(rate) != 1:
                iqd_total = float(total) * float(rate)
                rows.append((f'Total IQD (Rate: {rate})', fmt_currency(iqd_total, 'IQD'), False))

        tbl_data = []
        for label, value, grand in rows:
            if grand:
                tbl_data.append([
                    Paragraph(label, s['grand_label']),
                    Paragraph(value, s['grand_value']),
                ])
            else:
                tbl_data.append([
                    Paragraph(label, s['total_label']),
                    Paragraph(value, s['total_value']),
                ])

        tbl = Table(tbl_data, colWidths=[self.usable*0.55, self.usable*0.22], hAlign='RIGHT')
        cmds = [
            ('LEFTPADDING', (0,0), (-1,-1), 6),
            ('RIGHTPADDING', (0,0), (-1,-1), 6),
            ('TOPPADDING', (0,0), (-1,-1), 3),
            ('BOTTOMPADDING', (0,0), (-1,-1), 3),
            ('LINEABOVE', (0,0), (-1,0), 0.5, BORDER_CLR),
        ]
        for i, (_, _, grand) in enumerate(rows):
            if grand:
                cmds.append(('BACKGROUND', (0,i), (-1,i), self.theme['accent']))
        tbl.setStyle(TableStyle(cmds))
        story.append(tbl)

    # ═══ COMPLIANCE NOTE ═══
    def _add_compliance(self, story):
        # For offers, always include the IEC standard note.
        # Custom notes can also be supplied via data keys.
        note = self.data.get('compliance_note', '')
        note_ar = self.data.get('compliance_note_ar', '')

        if self.doc_type == 'offer' and not note_ar:
            note_ar = 'الكشافات واللمبات المورده منا تخضع للمواصفات القياسية العالمية 62612-2013 IEC'

        if note or note_ar:
            story.append(Spacer(1, 4*mm))
            display_text = ar(note_ar) if note_ar and not note else f"{note}{'  |  ' + ar(note_ar) if note_ar else ''}"
            bg_tbl = Table(
                [[Paragraph(display_text, self.s['compliance'])]],
                colWidths=[self.usable]
            )
            bg_tbl.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), HexColor('#FFFFF0')),
                ('BOX', (0,0), (-1,-1), 0.5, GAMMA_YELLOW),
                ('TOPPADDING', (0,0), (-1,-1), 4),
                ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ]))
            story.append(bg_tbl)

    # ═══ TERMS ═══
    def _add_terms(self, story):
        d = self.data
        s = self.s
        terms = d.get('terms', '')
        terms_ar = d.get('terms_ar', '')
        notes = d.get('notes', '')

        # Offer-specific structured fields
        payment_terms = d.get('payment_terms', '')
        warranty_duration = d.get('warranty_duration', '')
        delivery_location = d.get('delivery_location', '')
        delivery_time = d.get('delivery_time', '')
        sender_info = d.get('sender_info', {}) or {}

        has_content = any([terms, terms_ar, notes, payment_terms,
                           warranty_duration, delivery_location, delivery_time])
        if has_content:
            story.append(Spacer(1, 5*mm))

        # Structured offer conditions (two-column table)
        offer_rows = []
        if payment_terms:
            offer_rows.append(('Payment Terms / شروط الدفع', payment_terms))
        if warranty_duration:
            offer_rows.append(('Warranty / الضمان', warranty_duration))
        if delivery_location:
            offer_rows.append(('Delivery Location / موقع التسليم', delivery_location))
        if delivery_time:
            offer_rows.append(('Delivery Time / وقت التسليم', delivery_time))

        if offer_rows:
            tbl_data = [
                [Paragraph(f"<b>{label}</b>", s['field_label']),
                 Paragraph(str(value), s['field_value'])]
                for label, value in offer_rows
            ]
            cond_tbl = Table(tbl_data, colWidths=[48*mm, self.usable - 48*mm])
            cond_tbl.setStyle(TableStyle([
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ('TOPPADDING', (0,0), (-1,-1), 3),
                ('BOTTOMPADDING', (0,0), (-1,-1), 3),
                ('LINEBELOW', (0,0), (-1,-1), 0.3, BORDER_CLR),
                ('BACKGROUND', (0,0), (0,-1), HexColor('#F8F9FA')),
            ]))
            story.append(cond_tbl)
            story.append(Spacer(1, 3*mm))

        if terms:
            story.append(Paragraph(f"<b>Terms & Conditions:</b><br/>{terms}", s['terms']))
            story.append(Spacer(1, 2*mm))

        if terms_ar:
            story.append(Paragraph(ar(terms_ar), s['terms_ar']))
            story.append(Spacer(1, 2*mm))

        if notes:
            story.append(Paragraph(f"<b>Notes:</b> {notes}", s['terms']))

        # Sender / salesperson info block
        if sender_info and any(sender_info.values()):
            story.append(Spacer(1, 4*mm))
            sender_parts = []
            if sender_info.get('name'):
                sender_parts.append(f"<b>Prepared by:</b> {sender_info['name']}")
            if sender_info.get('phone'):
                sender_parts.append(f"<b>Tel:</b> {sender_info['phone']}")
            if sender_info.get('email'):
                sender_parts.append(f"<b>Email:</b> {sender_info['email']}")
            if sender_parts:
                story.append(Paragraph('   |   '.join(sender_parts), s['terms']))

        # Bank details for invoices
        if self.doc_type == 'invoice':
            bank = d.get('bank_details', {})
            if bank:
                story.append(Spacer(1, 4*mm))
                lines = ["<b>Bank Details / التفاصيل البنكية:</b>"]
                for k, v in bank.items():
                    lines.append(f"<b>{k}:</b> {v}")
                story.append(Paragraph('<br/>'.join(lines), s['terms']))

    # ═══ SIGNATURE ═══
    def _add_signature(self, story):
        s = self.s
        story.append(Spacer(1, 15*mm))
        is_client = self.doc_type in ('offer', 'invoice')
        left = "Authorized Signature / التوقيع المعتمد"
        right = ("Client Signature / توقيع العميل" if is_client
                 else "Supplier Confirmation / تأكيد المورد")

        sig_tbl = Table(
            [[Paragraph(f"<font size='7' color='#888888'>{left}</font>", s['terms']),
              Paragraph('', s['terms']),
              Paragraph(f"<font size='7' color='#888888'>{right}</font>", s['terms_ar'])]],
            colWidths=[self.usable*0.35, self.usable*0.3, self.usable*0.35]
        )
        sig_tbl.setStyle(TableStyle([
            ('LINEABOVE', (0,0), (0,0), 0.5, GAMMA_GRAY),
            ('LINEABOVE', (2,0), (2,0), 0.5, GAMMA_GRAY),
            ('TOPPADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(sig_tbl)


# ═══ CONVENIENCE FUNCTIONS ═══

def generate_offer_pdf(data, company=None, output_path=None):
    return GammaCatalogPDF('offer', data, company, output_path).build()

def generate_supplier_pi_pdf(data, company=None, output_path=None):
    return GammaCatalogPDF('supplier_pi', data, company, output_path).build()

def generate_supplier_po_pdf(data, company=None, output_path=None):
    return GammaCatalogPDF('supplier_po', data, company, output_path).build()

def generate_invoice_pdf(data, company=None, output_path=None):
    return GammaCatalogPDF('invoice', data, company, output_path).build()
