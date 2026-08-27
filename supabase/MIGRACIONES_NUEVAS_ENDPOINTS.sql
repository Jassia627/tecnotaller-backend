-- Migraciones para nuevos endpoints

-- 1. Tabla: technician_availability
CREATE TABLE IF NOT EXISTS technician_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id uuid NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  available boolean NOT NULL DEFAULT true,
  unavailable_until timestamptz,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS technician_availability_technician_idx ON technician_availability (technician_id);

-- 2. Tabla: purchase_requests
CREATE TABLE IF NOT EXISTS purchase_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'PENDIENTE'
    CHECK (status IN ('PENDIENTE', 'ORDENADO', 'RECIBIDO', 'CANCELADO')),
  total_items integer NOT NULL CHECK (total_items > 0),
  notes text,
  created_by uuid REFERENCES profiles (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS purchase_requests_status_idx ON purchase_requests (status, created_at);

-- 3. Tabla: purchase_request_items
CREATE TABLE IF NOT EXISTS purchase_request_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_request_id uuid NOT NULL REFERENCES purchase_requests (id) ON DELETE CASCADE,
  product_id uuid REFERENCES products (id) ON DELETE SET NULL,
  part_id uuid REFERENCES parts (id) ON DELETE SET NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS purchase_request_items_request_idx ON purchase_request_items (purchase_request_id);

-- 4. RLS Policies para technician_availability
ALTER TABLE technician_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Técnico ve su propia disponibilidad" ON technician_availability
  FOR SELECT
  USING (
    auth.uid() = technician_id OR
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'administrador'
  );

CREATE POLICY "Técnico actualiza su disponibilidad" ON technician_availability
  FOR UPDATE
  USING (
    auth.uid() = technician_id OR
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'administrador'
  );

CREATE POLICY "Admin puede insertar disponibilidades" ON technician_availability
  FOR INSERT
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'administrador');

-- 5. RLS Policies para purchase_requests
ALTER TABLE purchase_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin ve todas las solicitudes de compra" ON purchase_requests
  FOR SELECT
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'administrador');

CREATE POLICY "Admin puede crear solicitudes" ON purchase_requests
  FOR INSERT
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'administrador');

CREATE POLICY "Admin puede actualizar solicitudes" ON purchase_requests
  FOR UPDATE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'administrador');

-- 6. RLS Policies para purchase_request_items
ALTER TABLE purchase_request_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin ve todos los items de solicitud" ON purchase_request_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM purchase_requests
      WHERE id = purchase_request_id
      AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'administrador'
    )
  );

-- Fin de migraciones
