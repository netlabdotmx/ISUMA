"""
Crear ubicaciones de rack en Odoo: 20 columnas × 5 niveles por rack.
Genera ubicaciones con nombre: RACK-COL-NIVEL (ej: A-01-1, A-01-2, ..., A-20-5)

Configuración:
  RACK_LABELS  = letras de los racks a crear (A, B, C, ...)
  COLUMNS      = 20
  LEVELS       = 5
  PARENT_NAME  = nombre de la ubicación padre (ej: "WH" o "Stock")

Ejecutar desde: odoo shell -d TU_DB < scripts/create_rack_locations.py
"""

# ═══════════════ CONFIGURACIÓN ═══════════════
RACK_LABELS = ["A", "B", "C", "D", "E"]   # Ajusta los racks que necesites
COLUMNS = 20
LEVELS = 5
PARENT_NAME = "WH"  # Nombre corto de tu ubicación padre (stock location del warehouse)
# ═════════════════════════════════════════════

StockLocation = env["stock.location"]

# Buscar ubicación padre
parent = StockLocation.search([("name", "=", PARENT_NAME), ("usage", "=", "internal")], limit=1)
if not parent:
    # Intentar con el stock location del warehouse principal
    warehouse = env["stock.warehouse"].search([], limit=1)
    if warehouse:
        parent = warehouse.lot_stock_id
        print(f"  Usando ubicación padre del warehouse: {parent.complete_name}")
    else:
        print("❌ No se encontró ubicación padre. Ajusta PARENT_NAME.")
        exit()
else:
    print(f"  Ubicación padre: {parent.complete_name}")

created = 0
skipped = 0

for rack in RACK_LABELS:
    for col in range(1, COLUMNS + 1):
        for level in range(1, LEVELS + 1):
            name = f"{rack}-{str(col).zfill(2)}-{level}"

            # Verificar si ya existe
            existing = StockLocation.search([
                ("name", "=", name),
                ("location_id", "=", parent.id),
            ], limit=1)

            if existing:
                skipped += 1
                continue

            vals = {
                "name": name,
                "location_id": parent.id,
                "usage": "internal",
                "active": True,
            }

            # Si los campos custom existen, poblarlos
            try:
                vals["x_physical_rack"] = rack
                vals["x_physical_column"] = col
                vals["x_physical_level"] = level
                StockLocation.create(vals)
            except Exception:
                # Campos custom no existen, crear sin ellos
                vals.pop("x_physical_rack", None)
                vals.pop("x_physical_column", None)
                vals.pop("x_physical_level", None)
                StockLocation.create(vals)

            created += 1

env.cr.commit()

total = len(RACK_LABELS) * COLUMNS * LEVELS
print(f"\n✅ Ubicaciones creadas: {created}")
print(f"   Saltadas (ya existían): {skipped}")
print(f"   Total esperado: {total} ({len(RACK_LABELS)} racks × {COLUMNS} columnas × {LEVELS} niveles)")
print(f"   Formato: RACK-COLUMNA-NIVEL (ej: A-01-1 hasta {RACK_LABELS[-1]}-{str(COLUMNS).zfill(2)}-{LEVELS})")
