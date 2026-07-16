-- Seed Data for VSM Studio Database
-- Safe to run in local Supabase database instance

-- Insert a test profile if it doesn't exist (assuming a test user with ID '00000000-0000-0000-0000-000000000000')
-- Useful for local emulation when auth is bypassed or for specific development configurations

INSERT INTO public.profiles (id, email, created_at)
VALUES ('00000000-0000-0000-0000-000000000000', 'demo@vsmstudio.com', now())
ON CONFLICT (id) DO NOTHING;

-- Insert a demo project
INSERT INTO public.projects (id, name, description, owner_id, created_at, updated_at)
VALUES (
    '11111111-1111-1111-1111-111111111111', 
    'Proyecto Lean Manufactura Automotriz', 
    'Optimización del flujo de ensamble y reducción de inventario en proceso.', 
    '00000000-0000-0000-0000-000000000000', 
    now(), 
    now()
)
ON CONFLICT (id) DO NOTHING;

-- Insert a demo VSM map associated with the project
INSERT INTO public.vsm_maps (id, project_id, name, canvas_data_json, created_at, updated_at)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'Mapa Principal (Línea de Ensamble)',
    '{
        "nodes": [
            {
                "id": "node-1",
                "type": "supplierCustomer",
                "position": {"x": 50, "y": 150},
                "data": {"label": "Proveedor Acero", "type": "proveedor"}
            },
            {
                "id": "node-2",
                "type": "process",
                "position": {"x": 250, "y": 200},
                "data": {
                    "label": "Corte de Chapa",
                    "ct": "12s",
                    "co": "2m",
                    "uptime": "98",
                    "operators": "1",
                    "scrap": "0.5",
                    "oee": "90",
                    "shifts": "1"
                }
            },
            {
                "id": "node-3",
                "type": "inventory",
                "position": {"x": 450, "y": 220},
                "data": {"quantity": 150, "time": "1.5d"}
            },
            {
                "id": "node-4",
                "type": "process",
                "position": {"x": 600, "y": 200},
                "data": {
                    "label": "Estampado y Prensado",
                    "ct": "8s",
                    "co": "15m",
                    "uptime": "92",
                    "operators": "2",
                    "scrap": "1.0",
                    "oee": "82",
                    "shifts": "1"
                }
            },
            {
                "id": "node-5",
                "type": "supplierCustomer",
                "position": {"x": 850, "y": 150},
                "data": {"label": "Planta Ensambladora", "type": "cliente"}
            }
        ],
        "edges": [
            {
                "id": "edge-1",
                "source": "node-1",
                "target": "node-2",
                "type": "physical",
                "data": {"type": "physical", "label": "Envío Semanal", "showArrow": true}
            },
            {
                "id": "edge-2",
                "source": "node-2",
                "target": "node-3",
                "type": "physical",
                "data": {"type": "physical", "label": "Flujo de Empuje", "showArrow": true}
            },
            {
                "id": "edge-3",
                "source": "node-3",
                "target": "node-4",
                "type": "physical",
                "data": {"type": "physical", "showArrow": true}
            },
            {
                "id": "edge-4",
                "source": "node-4",
                "target": "node-5",
                "type": "physical",
                "data": {"type": "physical", "label": "Embarque Diario", "showArrow": true}
            }
        ],
        "viewport": {"x": 0, "y": 0, "zoom": 1}
    }'::jsonb,
    now(),
    now()
)
ON CONFLICT (id) DO NOTHING;

-- Insert a historical version snapshot for the map
INSERT INTO public.vsm_map_versions (map_id, name, canvas_data_json, created_by, action_name, created_at)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    'Versión 1.0 - Estado Actual',
    '{
        "nodes": [
            {
                "id": "node-1",
                "type": "supplierCustomer",
                "position": {"x": 50, "y": 150},
                "data": {"label": "Proveedor Acero", "type": "proveedor"}
            },
            {
                "id": "node-2",
                "type": "process",
                "position": {"x": 250, "y": 200},
                "data": {
                    "label": "Corte de Chapa",
                    "ct": "12s"
                }
            }
        ],
        "edges": []
    }'::jsonb,
    '00000000-0000-0000-0000-000000000000',
    'Guardado manual',
    now()
)
ON CONFLICT (id) DO NOTHING;
