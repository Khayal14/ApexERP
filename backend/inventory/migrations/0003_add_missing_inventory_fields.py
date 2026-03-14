"""
Migration 0003: Add missing inventory fields and tables.

The live DB had inventory.0001_initial applied from an older version of the
migration that was missing:
  - product_role / business_field columns on inventory_product
  - Several new tables: ProductBOM, BOMLine, CompanyCostSetting, ProductCost,
    StockAlert, DemandForecast, InterCompanyTransfer, InterCompanyTransferLine

We use ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS so the migration
is safe whether the column/table is already present or not.
"""
from django.conf import settings
from django.db import migrations


ADD_PRODUCT_ROLE = """
ALTER TABLE inventory_product
  ADD COLUMN IF NOT EXISTS product_role varchar(20) NOT NULL DEFAULT 'finished_good';
"""

ADD_BUSINESS_FIELD = """
ALTER TABLE inventory_product
  ADD COLUMN IF NOT EXISTS business_field varchar(30) NOT NULL DEFAULT '';
"""

CREATE_DEMAND_FORECAST = """
CREATE TABLE IF NOT EXISTS inventory_demandforecast (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    company_id uuid NOT NULL REFERENCES core_company(id) ON DELETE CASCADE,
    created_by_id uuid REFERENCES core_user(id) ON DELETE SET NULL,
    updated_by_id uuid REFERENCES core_user(id) ON DELETE SET NULL,
    product_id uuid NOT NULL REFERENCES inventory_product(id) ON DELETE CASCADE,
    period_start date NOT NULL,
    period_end date NOT NULL,
    forecasted_demand numeric(12,3) NOT NULL,
    actual_demand numeric(12,3),
    confidence double precision NOT NULL DEFAULT 0.8,
    model_version varchar(50) NOT NULL DEFAULT '',
    factors jsonb NOT NULL DEFAULT '{}'
);
"""

CREATE_PRODUCT_BOM = """
CREATE TABLE IF NOT EXISTS inventory_productbom (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    company_id uuid NOT NULL REFERENCES core_company(id) ON DELETE CASCADE,
    created_by_id uuid REFERENCES core_user(id) ON DELETE SET NULL,
    updated_by_id uuid REFERENCES core_user(id) ON DELETE SET NULL,
    product_id uuid NOT NULL UNIQUE REFERENCES inventory_product(id) ON DELETE CASCADE,
    version varchar(20) NOT NULL DEFAULT '1.0',
    notes text NOT NULL DEFAULT ''
);
"""

CREATE_BOM_LINE = """
CREATE TABLE IF NOT EXISTS inventory_bomline (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bom_id uuid NOT NULL REFERENCES inventory_productbom(id) ON DELETE CASCADE,
    component_id uuid NOT NULL REFERENCES inventory_product(id) ON DELETE CASCADE,
    quantity numeric(12,4) NOT NULL,
    unit_of_measure varchar(20) NOT NULL DEFAULT 'unit',
    notes text NOT NULL DEFAULT '',
    sort_order integer NOT NULL DEFAULT 0
);
"""

CREATE_COMPANY_COST_SETTING = """
CREATE TABLE IF NOT EXISTS inventory_companycostsetting (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL UNIQUE REFERENCES core_company(id) ON DELETE CASCADE,
    labour_percentage numeric(5,2) NOT NULL DEFAULT 0,
    overhead_percentage numeric(5,2) NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by_id uuid REFERENCES core_user(id) ON DELETE SET NULL
);
"""

CREATE_PRODUCT_COST = """
CREATE TABLE IF NOT EXISTS inventory_productcost (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL UNIQUE REFERENCES inventory_product(id) ON DELETE CASCADE,
    material_cost numeric(18,4) NOT NULL DEFAULT 0,
    labour_percentage numeric(5,2) NOT NULL DEFAULT 0,
    labour_cost numeric(18,4) NOT NULL DEFAULT 0,
    overhead_percentage numeric(5,2) NOT NULL DEFAULT 0,
    overhead_cost numeric(18,4) NOT NULL DEFAULT 0,
    total_cost numeric(18,4) NOT NULL DEFAULT 0,
    gross_profit numeric(18,4) NOT NULL DEFAULT 0,
    profit_margin numeric(6,2) NOT NULL DEFAULT 0,
    currency varchar(3) NOT NULL DEFAULT 'EGP',
    last_calculated timestamptz
);
"""

CREATE_STOCK_ALERT = """
CREATE TABLE IF NOT EXISTS inventory_stockalert (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    company_id uuid NOT NULL REFERENCES core_company(id) ON DELETE CASCADE,
    created_by_id uuid REFERENCES core_user(id) ON DELETE SET NULL,
    updated_by_id uuid REFERENCES core_user(id) ON DELETE SET NULL,
    product_id uuid NOT NULL REFERENCES inventory_product(id) ON DELETE CASCADE,
    warehouse_id uuid REFERENCES inventory_warehouse(id) ON DELETE SET NULL,
    alert_type varchar(30) NOT NULL,
    threshold_qty numeric(12,3) NOT NULL,
    current_qty numeric(12,3) NOT NULL,
    is_acknowledged boolean NOT NULL DEFAULT false,
    acknowledged_by_id uuid REFERENCES core_user(id) ON DELETE SET NULL,
    acknowledged_at timestamptz
);
CREATE INDEX IF NOT EXISTS inv_alert_co_ack_idx
  ON inventory_stockalert(company_id, is_acknowledged);
"""

CREATE_INTERCOMPANY_TRANSFER = """
CREATE TABLE IF NOT EXISTS inventory_intercompanytransfer (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    company_id uuid NOT NULL REFERENCES core_company(id) ON DELETE CASCADE,
    created_by_id uuid REFERENCES core_user(id) ON DELETE SET NULL,
    updated_by_id uuid REFERENCES core_user(id) ON DELETE SET NULL,
    transfer_number varchar(50) NOT NULL,
    from_company_id uuid NOT NULL REFERENCES core_company(id) ON DELETE CASCADE,
    from_warehouse_id uuid NOT NULL REFERENCES inventory_warehouse(id) ON DELETE CASCADE,
    to_company_id uuid NOT NULL REFERENCES core_company(id) ON DELETE CASCADE,
    to_warehouse_id uuid NOT NULL REFERENCES inventory_warehouse(id) ON DELETE CASCADE,
    status varchar(20) NOT NULL DEFAULT 'draft',
    transfer_date date NOT NULL,
    notes text NOT NULL DEFAULT ''
);
"""

CREATE_INTERCOMPANY_TRANSFER_LINE = """
CREATE TABLE IF NOT EXISTS inventory_intercompanytransferline (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id uuid NOT NULL REFERENCES inventory_intercompanytransfer(id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES inventory_product(id) ON DELETE CASCADE,
    quantity numeric(12,3) NOT NULL,
    unit_cost numeric(18,2) NOT NULL DEFAULT 0,
    notes text NOT NULL DEFAULT ''
);
"""

# Reverse: we intentionally do NOT drop tables on reverse to avoid data loss.
NOOP = "SELECT 1;"


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0002_goods_receipt'),
    ]

    operations = [
        migrations.RunSQL(ADD_PRODUCT_ROLE, reverse_sql=NOOP),
        migrations.RunSQL(ADD_BUSINESS_FIELD, reverse_sql=NOOP),
        migrations.RunSQL(CREATE_DEMAND_FORECAST, reverse_sql=NOOP),
        migrations.RunSQL(CREATE_PRODUCT_BOM, reverse_sql=NOOP),
        migrations.RunSQL(CREATE_BOM_LINE, reverse_sql=NOOP),
        migrations.RunSQL(CREATE_COMPANY_COST_SETTING, reverse_sql=NOOP),
        migrations.RunSQL(CREATE_PRODUCT_COST, reverse_sql=NOOP),
        migrations.RunSQL(CREATE_STOCK_ALERT, reverse_sql=NOOP),
        migrations.RunSQL(CREATE_INTERCOMPANY_TRANSFER, reverse_sql=NOOP),
        migrations.RunSQL(CREATE_INTERCOMPANY_TRANSFER_LINE, reverse_sql=NOOP),
    ]
