-- =====================================================================
-- Migracion: Consolidacion del esquema de nexus-it dentro del proyecto
-- Supabase "ProClubs" (oywtoudufygxcxlvmieq), bajo el schema "nexus_it".
-- Fecha: 2026-08-31
--
-- Motivo: el proyecto de Supabase dedicado a nexus-it (iwnbscekenptumanpjcs,
-- ya eliminado) estaba vacio (0 filas en todas las tablas) y el codigo de
-- la app no lo usaba (nexus-it corre sobre Firebase). El plan gratis de
-- Supabase solo permite 2 proyectos activos por organizacion, asi que se
-- elimino ese proyecto suelto y este esquema se recreo como schema
-- separado dentro de ProClubs, para no gastar un tercer slot.
--
-- Si se activa Supabase para nexus-it: usar la misma SUPABASE_URL de
-- ProClubs, y el cliente inicializado con { db: { schema: 'nexus_it' } }.
--
-- Se excluyeron las tablas clients/quotes/testimonials del proyecto
-- original: eran sobrantes de una plantilla (iguales a las de The-Oc-Zone),
-- no se usaban para IT.
--
-- Se corrigio un hueco de seguridad real: create_user_by_admin,
-- delete_user_by_admin, update_user_username y change_user_password eran
-- SECURITY DEFINER pero no validaban que quien las llamara fuera admin.
-- Cualquier usuario autenticado podia crear/borrar usuarios o cambiar
-- contrasenas via /rest/v1/rpc/. Ahora todas verifican
-- nexus_it.is_caller_admin() antes de ejecutar.
-- =====================================================================

CREATE SCHEMA IF NOT EXISTS nexus_it;

CREATE TABLE nexus_it.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  name text NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['admin','technician','user','portal'])),
  company text NOT NULL,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  last_login timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  department text,
  "position" text,
  phone text,
  email text,
  photo_url text
);

CREATE TABLE nexus_it.equipment (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  name text NOT NULL,
  type text NOT NULL,
  brand text,
  model text,
  serial_number text,
  location text,
  assigned_to text,
  status text NOT NULL DEFAULT 'active' CHECK (status = ANY (ARRAY['active','inactive','maintenance','retired'])),
  company text NOT NULL,
  specs jsonb DEFAULT '{}'::jsonb,
  warranty_expiration timestamptz,
  purchase_date timestamptz,
  purchase_price numeric,
  notes text,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES nexus_it.profiles(id) ON DELETE SET NULL,
  on_loan boolean NOT NULL DEFAULT false,
  loan_due_date date
);

CREATE TABLE nexus_it.tickets (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  ticket_number text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open' CHECK (status = ANY (ARRAY['open','in_progress','resolved','closed','cancelled'])),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority = ANY (ARRAY['low','medium','high','critical','urgent'])),
  category text,
  equipment_id uuid REFERENCES nexus_it.equipment(id) ON DELETE SET NULL,
  company text NOT NULL,
  created_by uuid REFERENCES nexus_it.profiles(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES nexus_it.profiles(id) ON DELETE SET NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  resolved_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by_name text,
  assigned_to_name text
);

CREATE TABLE nexus_it.ticket_comments (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  ticket_id uuid NOT NULL REFERENCES nexus_it.tickets(id) ON DELETE CASCADE,
  author_id uuid REFERENCES nexus_it.profiles(id) ON DELETE SET NULL,
  author_name text NOT NULL,
  text text NOT NULL,
  is_internal boolean DEFAULT false,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE nexus_it.maintenances (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  equipment_id uuid NOT NULL REFERENCES nexus_it.equipment(id) ON DELETE CASCADE,
  equipment_name text NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['preventive','corrective','preventivo','correctivo','actualizacion','inspeccion'])),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status = ANY (ARRAY['scheduled','in_progress','completed','cancelled','programado','en_progreso','completado','cancelado','atrasado'])),
  company text NOT NULL,
  scheduled_date date NOT NULL,
  scheduled_time text,
  completed_date timestamptz,
  assigned_to uuid REFERENCES nexus_it.profiles(id) ON DELETE SET NULL,
  tasks jsonb DEFAULT '[]'::jsonb,
  notes text,
  frequency text CHECK (frequency = ANY (ARRAY['weekly','monthly','quarterly','semiannual','semi_annual','annual'])),
  next_maintenance_date date,
  time_confirmed boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  title text,
  description text,
  notification_email text,
  assigned_to_name text,
  time_confirmation_status text DEFAULT 'pending',
  time_confirmed_by text,
  time_confirmed_by_name text,
  time_confirmed_at timestamptz,
  cost numeric,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES nexus_it.profiles(id) ON DELETE SET NULL,
  created_by_name text
);

CREATE TABLE nexus_it.equipment_loans (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  equipment_id uuid NOT NULL REFERENCES nexus_it.equipment(id) ON DELETE CASCADE,
  company text NOT NULL,
  borrower_id uuid REFERENCES nexus_it.profiles(id),
  borrower_name text NOT NULL,
  previous_assigned_to uuid REFERENCES nexus_it.profiles(id),
  previous_assigned_to_name text,
  loan_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL,
  days integer NOT NULL CHECK (days > 0),
  returned_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status = ANY (ARRAY['active','returned','cancelled'])),
  notes text,
  generated_by uuid REFERENCES nexus_it.profiles(id),
  generated_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE nexus_it.notifications (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES nexus_it.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  equipment_id uuid REFERENCES nexus_it.equipment(id) ON DELETE SET NULL,
  ticket_id uuid REFERENCES nexus_it.tickets(id) ON DELETE SET NULL,
  maintenance_id uuid REFERENCES nexus_it.maintenances(id) ON DELETE SET NULL,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  dedupe_key text
);

CREATE TABLE nexus_it.support_chats (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NOT NULL UNIQUE REFERENCES nexus_it.profiles(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  last_message text,
  has_unread_for_user boolean DEFAULT false,
  has_unread_for_admin boolean DEFAULT false,
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_sender text,
  user_last_read_at timestamptz,
  admin_last_read_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE nexus_it.chat_messages (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  chat_id uuid NOT NULL REFERENCES nexus_it.support_chats(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender = ANY (ARRAY['user','admin'])),
  sender_name text,
  text text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES nexus_it.profiles(id) ON DELETE SET NULL,
  user_name text
);

CREATE INDEX idx_nexusit_equipment_status ON nexus_it.equipment(status);
CREATE INDEX idx_nexusit_equipment_company ON nexus_it.equipment(company);
CREATE INDEX idx_nexusit_tickets_status ON nexus_it.tickets(status);
CREATE INDEX idx_nexusit_tickets_company ON nexus_it.tickets(company);
CREATE INDEX idx_nexusit_tickets_assigned_to ON nexus_it.tickets(assigned_to);
CREATE INDEX idx_nexusit_maintenances_scheduled_date ON nexus_it.maintenances(scheduled_date);
CREATE INDEX idx_nexusit_maintenances_company ON nexus_it.maintenances(company);
CREATE INDEX idx_nexusit_notifications_user_id ON nexus_it.notifications(user_id);
CREATE INDEX idx_nexusit_notifications_read ON nexus_it.notifications(read);
CREATE INDEX idx_nexusit_chat_messages_chat_id ON nexus_it.chat_messages(chat_id);
CREATE INDEX idx_nexusit_equipment_loans_due_date ON nexus_it.equipment_loans(due_date);
CREATE INDEX idx_nexusit_equipment_loans_equipment_id ON nexus_it.equipment_loans(equipment_id);
CREATE INDEX idx_nexusit_equipment_loans_status ON nexus_it.equipment_loans(status);

ALTER TABLE nexus_it.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexus_it.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexus_it.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexus_it.ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexus_it.maintenances ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexus_it.equipment_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexus_it.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexus_it.support_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexus_it.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_all ON nexus_it.profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY equipment_all ON nexus_it.equipment FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY tickets_all ON nexus_it.tickets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY ticket_comments_all ON nexus_it.ticket_comments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY maintenances_all ON nexus_it.maintenances FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY equipment_loans_all ON nexus_it.equipment_loans FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY notifications_all ON nexus_it.notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY support_chats_all ON nexus_it.support_chats FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY chat_messages_all ON nexus_it.chat_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION nexus_it.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'nexus_it'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_equipment_updated BEFORE UPDATE ON nexus_it.equipment FOR EACH ROW EXECUTE FUNCTION nexus_it.update_updated_at();
CREATE TRIGGER trg_tickets_updated BEFORE UPDATE ON nexus_it.tickets FOR EACH ROW EXECUTE FUNCTION nexus_it.update_updated_at();
CREATE TRIGGER trg_maintenances_updated BEFORE UPDATE ON nexus_it.maintenances FOR EACH ROW EXECUTE FUNCTION nexus_it.update_updated_at();
CREATE TRIGGER trg_equipment_loans_updated BEFORE UPDATE ON nexus_it.equipment_loans FOR EACH ROW EXECUTE FUNCTION nexus_it.update_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON nexus_it.profiles FOR EACH ROW EXECUTE FUNCTION nexus_it.update_updated_at();
CREATE TRIGGER trg_support_chats_updated BEFORE UPDATE ON nexus_it.support_chats FOR EACH ROW EXECUTE FUNCTION nexus_it.update_updated_at();

CREATE OR REPLACE FUNCTION nexus_it.is_caller_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'nexus_it', 'auth'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM nexus_it.profiles WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
END;
$function$;

CREATE OR REPLACE FUNCTION nexus_it.change_user_password(p_user_id uuid, p_new_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'nexus_it', 'auth', 'extensions'
AS $function$
BEGIN
  IF NOT nexus_it.is_caller_admin() THEN
    RAISE EXCEPTION 'Solo un administrador puede cambiar contrasenas';
  END IF;
  UPDATE auth.users
  SET encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
      updated_at = NOW()
  WHERE id = p_user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION nexus_it.create_user_by_admin(p_username text, p_password text, p_name text, p_role text, p_company text, p_permissions jsonb DEFAULT '{}'::jsonb, p_department text DEFAULT NULL::text, p_position text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_email text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'nexus_it', 'auth', 'extensions'
AS $function$
DECLARE
  new_user_id UUID;
  user_email TEXT;
BEGIN
  IF NOT nexus_it.is_caller_admin() THEN
    RAISE EXCEPTION 'Solo un administrador puede crear usuarios';
  END IF;

  user_email := lower(p_username) || '@nexus-it.app';

  IF EXISTS (SELECT 1 FROM nexus_it.profiles WHERE username = lower(p_username)) THEN
    RAISE EXCEPTION 'El nombre de usuario ya existe';
  END IF;

  new_user_id := gen_random_uuid();

  INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id, 'authenticated', 'authenticated', user_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')), NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('username', lower(p_username), 'name', p_name),
    NOW(), NOW(), '', '', '', ''
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at, provider_id
  ) VALUES (
    new_user_id, new_user_id,
    jsonb_build_object('sub', new_user_id::text, 'email', user_email),
    'email', NOW(), NOW(), NOW(), user_email
  );

  INSERT INTO nexus_it.profiles (
    id, username, name, role, company, permissions, is_active,
    department, position, phone, email
  ) VALUES (
    new_user_id, lower(p_username), p_name, p_role, p_company,
    p_permissions, true,
    p_department, p_position, p_phone, p_email
  );

  RETURN new_user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION nexus_it.delete_user_by_admin(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'nexus_it', 'auth'
AS $function$
BEGIN
  IF NOT nexus_it.is_caller_admin() THEN
    RAISE EXCEPTION 'Solo un administrador puede borrar usuarios';
  END IF;
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION nexus_it.update_user_username(p_user_id uuid, p_new_username text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'nexus_it', 'auth'
AS $function$
DECLARE
  new_email TEXT;
BEGIN
  IF NOT nexus_it.is_caller_admin() THEN
    RAISE EXCEPTION 'Solo un administrador puede cambiar nombres de usuario';
  END IF;

  new_email := lower(p_new_username) || '@nexus-it.app';

  IF EXISTS (SELECT 1 FROM nexus_it.profiles WHERE username = lower(p_new_username) AND id != p_user_id) THEN
    RAISE EXCEPTION 'El nombre de usuario ya existe';
  END IF;

  UPDATE auth.users SET email = new_email, updated_at = NOW() WHERE id = p_user_id;
  UPDATE auth.identities SET identity_data = jsonb_build_object('sub', p_user_id::text, 'email', new_email),
    provider_id = new_email, updated_at = NOW()
  WHERE user_id = p_user_id;
  UPDATE nexus_it.profiles SET username = lower(p_new_username) WHERE id = p_user_id;
END;
$function$;

GRANT USAGE ON SCHEMA nexus_it TO authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA nexus_it TO authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA nexus_it TO authenticated, service_role;
