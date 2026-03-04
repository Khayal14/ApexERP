import pytz
from django.utils import timezone


class CompanyMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if hasattr(request, 'user') and request.user.is_authenticated:
            request.company = request.user.company
        else:
            request.company = None
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
