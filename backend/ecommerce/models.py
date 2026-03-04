import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import BaseModel


class Store(BaseModel):
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    logo = models.ImageField(upload_to='stores/', blank=True, null=True)
    domain = models.CharField(max_length=255, blank=True)
    theme = models.JSONField(default=dict)
    is_live = models.BooleanField(default=False)
    currency = models.CharField(max_length=3, default='USD')
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    shipping_methods = models.JSONField(default=list)
    payment_methods = models.JSONField(default=list)
    seo_settings = models.JSONField(default=dict)

    def __str__(self):
        return self.name


class StorePage(BaseModel):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='pages')
    title = models.CharField(max_length=255)
    slug = models.SlugField()
    content = models.TextField()
    page_type = models.CharField(max_length=20, choices=[
        ('home', _('Home')), ('about', _('About')),
        ('contact', _('Contact')), ('custom', _('Custom')),
    ])
    is_published = models.BooleanField(default=False)
    seo_title = models.CharField(max_length=255, blank=True)
    seo_description = models.TextField(blank=True)

    class Meta:
        unique_together = ['store', 'slug']


class ProductListing(BaseModel):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='listings')
    product = models.ForeignKey('inventory.Product', on_delete=models.CASCADE, related_name='listings')
    display_name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=18, decimal_places=2)
    compare_at_price = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True)
    images = models.JSONField(default=list)
    is_featured = models.BooleanField(default=False)
    is_published = models.BooleanField(default=True)
    slug = models.SlugField()
    seo_title = models.CharField(max_length=255, blank=True)
    seo_description = models.TextField(blank=True)
    reviews_count = models.IntegerField(default=0)
    avg_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)

    class Meta:
        unique_together = ['store', 'slug']

    def __str__(self):
        return self.display_name

    @property
    def on_sale(self):
        return self.compare_at_price and self.compare_at_price > self.price


class Cart(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='carts')
    session_id = models.CharField(max_length=255, blank=True)
    customer_email = models.EmailField(blank=True)
    items = models.JSONField(default=list)
    subtotal = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    tax = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    shipping = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_abandoned = models.BooleanField(default=False)


class EcommerceOrder(BaseModel):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='orders')
    order_number = models.CharField(max_length=50, unique=True)
    customer_email = models.EmailField()
    customer_name = models.CharField(max_length=255)
    shipping_address = models.JSONField(default=dict)
    billing_address = models.JSONField(default=dict)
    items = models.JSONField(default=list)
    subtotal = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    tax = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    shipping_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    status = models.CharField(max_length=20, default='pending', choices=[
        ('pending', _('Pending')), ('confirmed', _('Confirmed')),
        ('processing', _('Processing')), ('shipped', _('Shipped')),
        ('delivered', _('Delivered')), ('cancelled', _('Cancelled')),
        ('refunded', _('Refunded')),
    ])
    payment_status = models.CharField(max_length=20, default='unpaid', choices=[
        ('unpaid', _('Unpaid')), ('paid', _('Paid')),
        ('refunded', _('Refunded')),
    ])
    payment_method = models.CharField(max_length=50, blank=True)
    stripe_payment_id = models.CharField(max_length=255, blank=True)
    tracking_number = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"EC-{self.order_number}"


class ProductReview(BaseModel):
    listing = models.ForeignKey(ProductListing, on_delete=models.CASCADE, related_name='reviews')
    customer_name = models.CharField(max_length=255)
    customer_email = models.EmailField()
    rating = models.IntegerField(choices=[(i, str(i)) for i in range(1, 6)])
    title = models.CharField(max_length=255, blank=True)
    content = models.TextField()
    is_approved = models.BooleanField(default=False)
    is_verified_purchase = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']


class Coupon(BaseModel):
    code = models.CharField(max_length=50, unique=True)
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='coupons')
    discount_type = models.CharField(max_length=20, choices=[
        ('percent', _('Percentage')), ('fixed', _('Fixed Amount')),
        ('shipping', _('Free Shipping')),
    ])
    discount_value = models.DecimalField(max_digits=10, decimal_places=2)
    min_purchase = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    max_uses = models.IntegerField(default=0, help_text='0 for unlimited')
    used_count = models.IntegerField(default=0)
    start_date = models.DateField()
    end_date = models.DateField()

    def __str__(self):
        return self.code

    @property
    def is_valid(self):
        from django.utils import timezone
        today = timezone.now().date()
        return (self.is_active and self.start_date <= today <= self.end_date
                and (self.max_uses == 0 or self.used_count < self.max_uses))
