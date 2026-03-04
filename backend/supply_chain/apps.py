from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _

class SupplyChainConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'supply_chain'
    verbose_name = _('Supply Chain & Procurement')
