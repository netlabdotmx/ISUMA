"""
Crear campos custom de posición física en stock.location
Ejecutar desde: odoo shell < scripts/create_physical_fields.py
O copiar el contenido al shell interactivo de Odoo.
"""

IrModelFields = env["ir.model.fields"]
model_id = env["ir.model"].search([("model", "=", "stock.location")], limit=1).id

fields_to_create = [
    {
        "name": "x_physical_rack",
        "field_description": "Rack (posición física)",
        "model_id": model_id,
        "ttype": "char",
        "store": True,
        "copied": True,
    },
    {
        "name": "x_physical_column",
        "field_description": "Columna (posición física)",
        "model_id": model_id,
        "ttype": "integer",
        "store": True,
        "copied": True,
    },
    {
        "name": "x_physical_level",
        "field_description": "Nivel (posición física)",
        "model_id": model_id,
        "ttype": "integer",
        "store": True,
        "copied": True,
    },
    {
        "name": "x_abc_zone",
        "field_description": "Zona ABC",
        "model_id": model_id,
        "ttype": "selection",
        "selection_ids": [
            (0, 0, {"value": "A", "name": "A — Alta rotación", "sequence": 1}),
            (0, 0, {"value": "B", "name": "B — Rotación media", "sequence": 2}),
            (0, 0, {"value": "C", "name": "C — Baja rotación", "sequence": 3}),
        ],
        "store": True,
        "copied": True,
    },
]

for field_vals in fields_to_create:
    existing = IrModelFields.search([
        ("model_id", "=", model_id),
        ("name", "=", field_vals["name"]),
    ], limit=1)
    if existing:
        print(f"  ✓ Campo {field_vals['name']} ya existe, saltando.")
    else:
        IrModelFields.create(field_vals)
        print(f"  ✓ Campo {field_vals['name']} creado.")

env.cr.commit()
print("\n✅ Campos de posición física creados en stock.location")
