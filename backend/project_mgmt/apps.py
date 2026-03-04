from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _

class ProjectMgmtConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'project_mgmt'
    verbose_name = _('Project Management')
