"""
Ad-hoc PDF generation endpoint.
POST /api/workflow/generate-pdf/<doc_type>/
Accepts the full document data (after manual edits) and returns a PDF.

Branch-aware: the frontend passes a `branch` key in the payload to select
which Gamma branch's letterhead is used on the generated PDF.
"""
import base64
import tempfile
import os

from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response


# ── Branch definitions ─────────────────────────────────────────────────────
# Both Gamma International branches share the same name; only the address
# differs.  Gamma for Engineering and Trade has its own name.
BRANCH_DATA = {
    'obour': {
        'name_en': 'Gamma International',
        'name_ar': 'جاما انترناشيونال',
        'address_en': 'Obour City, Cairo, Egypt',
        'address_ar': 'مدينة العبور، القاهرة، مصر',
    },
    'nasr': {
        'name_en': 'Gamma International',
        'name_ar': 'جاما انترناشيونال',
        'address_en': 'Nasr City, Cairo, Egypt',
        'address_ar': 'مدينة نصر، القاهرة، مصر',
    },
    'engineering': {
        'name_en': 'Gamma for Engineering and Trade',
        'name_ar': 'جاما للهندسة والتجارة',
        'address_en': 'Cairo, Egypt',
        'address_ar': 'القاهرة، مصر',
    },
}


def _get_generators():
    from .pdf_generator import (
        generate_offer_pdf, generate_supplier_pi_pdf,
        generate_supplier_po_pdf, generate_invoice_pdf,
    )
    return {
        'offer': generate_offer_pdf,
        'supplier_pi': generate_supplier_pi_pdf,
        'supplier_po': generate_supplier_po_pdf,
        'invoice': generate_invoice_pdf,
    }


def _get_company_from_user(user, branch_key=None):
    """
    Build the company dict that GammaCatalogPDF expects.

    Priority:
      1. Branch-specific data (from BRANCH_DATA) if `branch_key` is provided.
      2. Fields from user.company (phone, email, logo, tax_id, etc.).
      3. Fallback defaults.
    """
    co = getattr(user, 'company', None)

    # Start from branch-specific or generic data
    branch = BRANCH_DATA.get(branch_key) if branch_key else None
    if branch:
        company = dict(branch)
    elif co:
        company = {
            'name_en': co.name or 'Gamma International',
            'name_ar': 'جاما انترناشيونال',
            'address_en': f"{co.city or ''}, {co.country or ''}".strip(', ') or 'Cairo, Egypt',
            'address_ar': 'القاهرة، مصر',
        }
    else:
        company = {
            'name_en': 'Gamma International',
            'name_ar': 'جاما انترناشيونال',
            'address_en': 'Cairo, Egypt',
            'address_ar': 'القاهرة، مصر',
        }

    # Merge shared fields from company record
    if co:
        company.setdefault('phone', co.phone or '')
        company.setdefault('email', co.email or '')
        company.setdefault('website', co.website or '')
        company.setdefault('tax_id', co.tax_id or '')
        company.setdefault('cr_number', '')
        # Logo: resolve to filesystem path
        if co.logo and hasattr(co.logo, 'path'):
            try:
                company.setdefault('logo_path', co.logo.path)
            except Exception:
                pass

    return company


def _decode_item_images(items):
    """
    For each item that carries a base64 image (`image_b64`), decode it to a
    temporary file and replace the key with `image_path` (a filesystem path)
    so the PDF generator can use it directly.

    Returns a list of temp file paths to clean up after PDF generation.
    """
    tmp_files = []
    for item in items:
        b64 = item.pop('image_b64', None)
        if not b64:
            continue
        try:
            # Strip optional data-URL header ("data:image/png;base64,...")
            if ',' in b64:
                b64 = b64.split(',', 1)[1]
            img_bytes = base64.b64decode(b64)
            suffix = '.png'
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
            tmp.write(img_bytes)
            tmp.close()
            item['image_path'] = tmp.name
            tmp_files.append(tmp.name)
        except Exception:
            pass  # If decoding fails, just skip the image
    return tmp_files


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_pdf_view(request, doc_type):
    """
    Accept full document data as JSON and return a generated PDF.
    The frontend PDF editor POSTs the manually-adjusted data here.

    Expected extra keys in the payload:
      - branch      (str)  : 'obour' | 'nasr' | 'engineering'
      - sender_info (dict) : { name, phone, email }  – the sender/salesperson block
    """
    GENERATORS = _get_generators()
    if doc_type not in GENERATORS:
        return Response({'error': f'Unknown document type: {doc_type}'}, status=400)

    data = dict(request.data)  # mutable copy
    if not data:
        return Response({'error': 'No data provided'}, status=400)

    branch_key = data.pop('branch', None)
    company = _get_company_from_user(request.user, branch_key)

    # Decode base64 images embedded in line items
    items = data.get('items', [])
    tmp_files = _decode_item_images(items)

    gen_fn = GENERATORS[doc_type]
    try:
        pdf_io = gen_fn(data, company)
        doc_number = data.get('doc_number', doc_type)
        filename = f"{doc_number}.pdf"

        response = HttpResponse(pdf_io.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
    except Exception as e:
        return Response({'error': f'PDF generation failed: {str(e)}'}, status=500)
    finally:
        # Clean up any temporary image files
        for path in tmp_files:
            try:
                os.unlink(path)
            except Exception:
                pass
