import pytz
from uuid import UUID
from django.utils import timezone


class CompanyMiddleware:
    """
    Sets request.company from the authenticated user's primary company by
    default.  Supports a branch-switching header:

        X-Branch-ID: <company-uuid>   → scope to that specific branch
        X-Branch-ID: all              → show data from ALL accessible companies

    The requested branch is validated against the user's `companies` M2M and
    their primary `company` FK.  Unrecognised values fall back to the primary
    company.

    ViewSets can read:
        request.company       – the active Company object (or primary company
                                when branch_mode='all')
        request.branch_mode   – 'single' | 'all'
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.company = None
        request.branch_mode = 'single'

        if hasattr(request, 'user') and request.user.is_authenticated:
            header = request.META.get('HTTP_X_BRANCH_ID', '').strip()

            if header == 'all':
                # Caller wants consolidated view across all accessible companies
                request.company = request.user.company
                request.branch_mode = 'all'

            elif header:
                # Validate the requested branch UUID against accessible companies
                try:
                    branch_uuid = UUID(header)
                    accessible_ids = set(
                        str(cid)
                        for cid in request.user.companies.values_list('id', flat=True)
                    )
                    # Always allow the user's own primary company
                    if request.user.company_id:
                        accessible_ids.add(str(request.user.company_id))

                    if str(branch_uuid) in accessible_ids:
                        from .models import Company
                        request.company = Company.objects.select_related('parent').get(id=branch_uuid)
                    else:
                        # Not authorised – fall back silently
                        request.company = request.user.company
                except (ValueError, Exception):
                    request.company = request.user.company

                request.branch_mode = 'single'

            else:
                # No header → use the user's primary company
                request.company = request.user.company
                request.branch_mode = 'single'

        return self.get_response(request)


class TimezoneMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if hasattr(request, 'user') and request.user.is_authenticated:
            try:
                tz = pytz.timezone(request.user.timezone)
                timezone.activate(tz)
            except Exception:
                timezone.deactivate()
        return self.get_response(request)
