import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
        ('inventory', '0001_initial'),
        ('supply_chain', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='GoodsReceipt',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_active', models.BooleanField(default=True)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('receipt_number', models.CharField(max_length=50)),
                ('received_date', models.DateField()),
                ('status', models.CharField(
                    choices=[('draft', 'Draft'), ('confirmed', 'Confirmed'), ('cancelled', 'Cancelled')],
                    default='draft',
                    max_length=20,
                )),
                ('notes', models.TextField(blank=True)),
                ('company', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='goodsreceipt_set', to='core.company')),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='goodsreceipt_created', to=settings.AUTH_USER_MODEL)),
                ('updated_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='goodsreceipt_updated', to=settings.AUTH_USER_MODEL)),
                ('purchase_order', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='receipts', to='supply_chain.purchaseorder')),
                ('received_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='goods_receipts',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('warehouse', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='receipts', to='inventory.warehouse')),
            ],
            options={
                'ordering': ['-received_date'],
            },
        ),
        migrations.CreateModel(
            name='GoodsReceiptLine',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('expected_quantity', models.DecimalField(decimal_places=3, max_digits=12)),
                ('received_quantity', models.DecimalField(decimal_places=3, max_digits=12)),
                ('unit_cost', models.DecimalField(decimal_places=2, default=0, max_digits=18)),
                ('notes', models.TextField(blank=True)),
                ('po_line', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    to='supply_chain.purchaseorderline',
                )),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='inventory.product')),
                ('receipt', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='lines', to='inventory.goodsreceipt')),
            ],
        ),
    ]
