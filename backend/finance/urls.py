from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'currencies', views.CurrencyViewSet, basename='currency')
router.register(r'fiscal-years', views.FiscalYearViewSet, basename='fiscal-year')
router.register(r'accounts', views.ChartOfAccountViewSet, basename='account')
router.register(r'journal-entries', views.JournalEntryViewSet, basename='journal-entry')
router.register(r'invoices', views.InvoiceViewSet, basename='invoice')
router.register(r'payments', views.PaymentViewSet, basename='payment')
router.register(r'tax-rates', views.TaxRateViewSet, basename='tax-rate')
router.register(r'budgets', views.BudgetViewSet, basename='budget')
router.register(r'expense-categories', views.ExpenseCategoryViewSet, basename='expense-category')
router.register(r'expenses', views.ExpenseViewSet, basename='expense')

urlpatterns = [
    path('', include(router.urls)),
]
