from celery import shared_task
from django.core.mail import send_mail
from django.utils import timezone
import logging

logger = logging.getLogger('apex_erp')


@shared_task
def send_notification_email(user_id, subject, message):
    from django.contrib.auth import get_user_model
    User = get_user_model()
    try:
        user = User.objects.get(id=user_id)
        send_mail(subject, message, None, [user.email], fail_silently=True)
    except User.DoesNotExist:
        logger.warning(f'User {user_id} not found for notification email')


@shared_task
def cleanup_old_notifications():
    from .models import Notification
    cutoff = timezone.now() - timezone.timedelta(days=90)
    deleted, _ = Notification.objects.filter(created_at__lt=cutoff, is_read=True).delete()
    logger.info(f'Cleaned up {deleted} old notifications')


@shared_task
def cleanup_old_audit_logs():
    from .models import AuditLog
    cutoff = timezone.now() - timezone.timedelta(days=365)
    deleted, _ = AuditLog.objects.filter(timestamp__lt=cutoff).delete()
    logger.info(f'Cleaned up {deleted} old audit logs')
