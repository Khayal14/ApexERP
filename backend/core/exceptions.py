from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger('apex_erp')


def apex_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        response.data = {
            'error': True,
            'status_code': response.status_code,
            'message': str(exc),
            'details': response.data if isinstance(response.data, dict) else {'errors': response.data},
        }
    else:
        logger.exception(f'Unhandled exception: {exc}')
        response = Response({
            'error': True,
            'status_code': 500,
            'message': 'An internal server error occurred.',
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return response
