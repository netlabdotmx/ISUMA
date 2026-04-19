"""
Sembrar datos de demostración en Odoo:
1. Crea ubicaciones de rack si no existen (A-01-1 .. E-20-5)
2. Distribuye TODOS los productos existentes en ubicaciones aleatorias
3. Crea stock.quant con cantidades variadas

Ejecutar: odoo shell -d TU_DB < scripts/seed_demo_data.py
"""

import random

# ═══════════════ CONFIGURACIÓN ═══════════════
RACK_LABELS = ["A", "B", "C", "D", "E"]
COLUMNS = 20
LEVELS = 5
MIN_QTY = 5
MAX_QTY = 200
# Cuántas ubicaciones por producto (1 a 4)
MIN_LOCS_PER_PRODUCT = 1
MAX_LOCS_PER_PRODUCT = 4
# ═════════════════════════════════════════════

StockLocation = env["stock.location"]
StockQuant = env["stock.quant"]
ProductProduct = env["product.product"]

# ── 1. Encontrar o crear ubicación padre ─────────────────────────────────────
warehouse = env["stock.warehouse"].search([], limit=1)
if not warehouse:
    print("❌ No se encontró ningún warehouse. Abortando.")
    exit()

parent = warehouse.lot_stock_id
print(f"📦 Warehouse: {warehouse.name}")
print(f"📍 Ubicación padre: {parent.complete_name} (ID: {parent.id})")

# ── 2. Crear ubicaciones de rack ─────────────────────────────────────────────
print("\n═══ Creando ubicaciones de rack ═══")
location_map = {}  # "A-01-1" → location_id
created_locs = 0
skipped_locs = 0

for rack in RACK_LABELS:
    for col in range(1, COLUMNS + 1):
        for level in range(1, LEVELS + 1):
            name = f"{rack}-{str(col).zfill(2)}-{level}"

            existing = StockLocation.search([
                ("name", "=", name),
                ("location_id", "=", parent.id),
            ], limit=1)

            if existing:
                location_map[name] = existing.id
                skipped_locs += 1
                continue

            vals = {
                "name": name,
                "location_id": parent.id,
                "usage": "internal",
                "active": True,
            }

            # Try adding physical position fields
            try:
                test_loc = StockLocation.search([], limit=1)
                if hasattr(test_loc, 'x_physical_rack'):
                    vals["x_physical_rack"] = rack
                    vals["x_physical_column"] = col
                    vals["x_physical_level"] = level
            except Exception:
                pass

            new_loc = StockLocation.create(vals)
            location_map[name] = new_loc.id
            created_locs += 1

env.cr.commit()
total_locs = len(RACK_LABELS) * COLUMNS * LEVELS
print(f"  ✓ Ubicaciones creadas: {created_locs}")
print(f"  ✓ Ya existían: {skipped_locs}")
print(f"  Total: {total_locs}")

# ── 3. Obtener todos los productos almacenables ─────────────────────────────
print("\n═══ Obteniendo productos ═══")
products = ProductProduct.search_read(
    [("type", "in", ["consu", "product"])],
    ["id", "name", "default_code"],
)
print(f"  Encontrados: {len(products)} productos")

if not products:
    print("⚠ No hay productos. Abortando.")
    exit()

# ── 4. Limpiar quants existentes en las nuevas ubicaciones (solo de demo) ────
loc_ids = list(location_map.values())
print(f"\n═══ Limpiando quants anteriores en {len(loc_ids)} ubicaciones ═══")
old_quants = StockQuant.search([
    ("location_id", "in", loc_ids),
])
if old_quants:
    # Forzar unlink de quants (need sudo in some Odoo versions)
    try:
        old_quants.sudo().unlink()
    except Exception:
        old_quants.unlink()
    print(f"  ✓ Eliminados: {len(old_quants)} quants antiguos")
else:
    print("  Sin quants previos")

env.cr.commit()

# ── 5. Distribuir productos en ubicaciones aleatorias ────────────────────────
print(f"\n═══ Distribuyendo productos en ubicaciones ═══")
all_loc_names = list(location_map.keys())
created_quants = 0

for prod in products:
    # Pick random number of locations for this product
    num_locs = random.randint(MIN_LOCS_PER_PRODUCT, min(MAX_LOCS_PER_PRODUCT, len(all_loc_names)))
    chosen_locs = random.sample(all_loc_names, num_locs)

    for loc_name in chosen_locs:
        loc_id = location_map[loc_name]
        qty = random.randint(MIN_QTY, MAX_QTY)

        # Create quant directly
        try:
            StockQuant.sudo().create({
                "product_id": prod["id"],
                "location_id": loc_id,
                "inventory_quantity": qty,
                "quantity": qty,
            })
            created_quants += 1
        except Exception as e:
            # Some Odoo versions need different approach
            try:
                StockQuant.create({
                    "product_id": prod["id"],
                    "location_id": loc_id,
                    "inventory_quantity": qty,
                    "quantity": qty,
                })
                created_quants += 1
            except Exception as e2:
                print(f"  ⚠ Error con {prod['name']} en {loc_name}: {e2}")

    if created_quants % 50 == 0:
        env.cr.commit()
        print(f"  ... {created_quants} quants creados")

env.cr.commit()

# ── 6. Resumen ───────────────────────────────────────────────────────────────
print(f"\n{'═' * 50}")
print(f"✅ DEMO DATA SEMBRADO EXITOSAMENTE")
print(f"{'═' * 50}")
print(f"  Ubicaciones: {total_locs} ({COLUMNS}×{LEVELS}×{len(RACK_LABELS)} racks)")
print(f"  Productos distribuidos: {len(products)}")
print(f"  Quants creados: {created_quants}")
print(f"  Rango de cantidad: {MIN_QTY} - {MAX_QTY} unidades")
print(f"  Ubicaciones por producto: {MIN_LOCS_PER_PRODUCT} - {MAX_LOCS_PER_PRODUCT}")
print(f"\n  Formato de ubicación: RACK-COL-NIVEL")
print(f"  Ejemplo: A-01-1 hasta {RACK_LABELS[-1]}-{str(COLUMNS).zfill(2)}-{LEVELS}")
