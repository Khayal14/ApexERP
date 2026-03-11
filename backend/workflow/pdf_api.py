"""
Ad-hoc PDF generation endpoint.
POST /api/workflow/generate-pdf/<doc_type>/
Accepts the full document data (after manual edits) and returns a PDF.
"""
from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

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


def _get_company_from_user(user):
    co = getattr(user, 'company', None)
    if not co:
        return None
    return {
        'name_en': co.name or 'Gamma International',
        'name_ar': '\u063a\u0627\u0645\u0627 \u0627\u0644\u062f\u0648\u0644\u064a\u0629',
        'address_en': f"{co.city or ''}, {co.country or ''}".strip(', ') or 'Baghdad, Iraq',
        'address_ar': '\u0628\u063a\u062f\u0627\u062f\u060c \u0627\u0644\u0639\u0631\u0627\u0642',
        'phone': co.phone or '',
        'email': co.email or '',
        'website': co.website or '',
        'tax_id': co.tax_id or '',
        'cr_number': '',
    }


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_pdf_view(request, doc_type):
    """
    Accept full document data as JSON and return a generated PDF.
    The frontend PDF editor POSTs the manually-adjusted data here.
    """
    GENERATORS = _get_generators()
    if doc_type not in GENERATORS:
        return Response({'error': f'Unknown document type: {doc_type}'}, status=400)

    data = request.data
    if not data:
        return Response({'error': 'No data provided'}, status=400)

    company = _get_company_from_user(request.user)
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
