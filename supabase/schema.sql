-- ============================================================
-- AVANTE REPORTS PLATFORM - Esquema aplicado en Supabase (proyecto ARP)
-- Reproduce este archivo en SQL Editor para recrear la estructura.
-- Para los datos iniciales ejecuta despues supabase/seed.sql
-- ============================================================
CREATE SCHEMA IF NOT EXISTS avante;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE avante.report_definitions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    script_path VARCHAR(500) NOT NULL,
    runtime VARCHAR(20) NOT NULL CHECK (runtime IN ('python','powershell','shell')),
    timeout_minutes INT DEFAULT 30,
    retry_count INT DEFAULT 3,
    retry_delay_sec INT DEFAULT 300,
    active BOOLEAN DEFAULT true,
    owner_email VARCHAR(200),
    business_unit VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE avante.schedules (
    id SERIAL PRIMARY KEY,
    report_id INT REFERENCES avante.report_definitions(id) ON DELETE CASCADE,
    cron_expression VARCHAR(100) NOT NULL,
    timezone VARCHAR(50) DEFAULT 'America/El_Salvador',
    active BOOLEAN DEFAULT true,
    description VARCHAR(200),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE avante.recipients (
    id SERIAL PRIMARY KEY,
    report_id INT REFERENCES avante.report_definitions(id) ON DELETE CASCADE,
    email VARCHAR(200) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('TO','CC','BCC')),
    only_in_prod BOOLEAN DEFAULT false,
    full_name VARCHAR(200),
    role VARCHAR(100),
    active BOOLEAN DEFAULT true,
    UNIQUE(report_id, email, type)
);

CREATE TABLE avante.parameters (
    id SERIAL PRIMARY KEY,
    report_id INT REFERENCES avante.report_definitions(id) ON DELETE CASCADE,
    param_key VARCHAR(100) NOT NULL,
    param_value TEXT,
    param_type VARCHAR(20) CHECK (param_type IN ('string','int','float','date','datetime','json','bool')),
    description TEXT,
    is_secret BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(report_id, param_key)
);

CREATE TABLE avante.secrets (
    id SERIAL PRIMARY KEY,
    secret_key VARCHAR(100) UNIQUE NOT NULL,
    secret_value BYTEA NOT NULL,
    description VARCHAR(200),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    rotated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
);

CREATE OR REPLACE FUNCTION avante.set_secret(p_key VARCHAR, p_value TEXT, p_passphrase TEXT)
RETURNS VOID AS $$
BEGIN
    INSERT INTO avante.secrets (secret_key, secret_value)
    VALUES (p_key, extensions.pgp_sym_encrypt(p_value, p_passphrase))
    ON CONFLICT (secret_key) DO UPDATE
    SET secret_value = extensions.pgp_sym_encrypt(p_value, p_passphrase), rotated_at = NOW();
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION avante.get_secret(p_key VARCHAR, p_passphrase TEXT)
RETURNS TEXT AS $$
DECLARE v_value TEXT;
BEGIN
    SELECT extensions.pgp_sym_decrypt(secret_value, p_passphrase) INTO v_value
    FROM avante.secrets WHERE secret_key = p_key;
    RETURN v_value;
END; $$ LANGUAGE plpgsql;

CREATE TABLE avante.dependencies (
    id SERIAL PRIMARY KEY,
    report_id INT REFERENCES avante.report_definitions(id) ON DELETE CASCADE,
    dep_type VARCHAR(20) CHECK (dep_type IN ('python','powershell','system','npm')),
    dep_name VARCHAR(100) NOT NULL,
    dep_version VARCHAR(50),
    optional BOOLEAN DEFAULT false,
    purpose VARCHAR(200)
);

CREATE TABLE avante.executions (
    id BIGSERIAL PRIMARY KEY,
    report_id INT REFERENCES avante.report_definitions(id),
    triggered_by VARCHAR(50) DEFAULT 'scheduler',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    status VARCHAR(20) CHECK (status IN ('queued','running','success','failed','timeout')),
    duration_sec INT, rows_processed INT, emails_sent INT,
    error_message TEXT, stack_trace TEXT, output_files JSONB,
    worker_node VARCHAR(100), memory_peak_mb INT
);
CREATE INDEX idx_executions_report_date ON avante.executions(report_id, started_at DESC);
CREATE INDEX idx_executions_status ON avante.executions(status);
CREATE INDEX idx_recipients_active ON avante.recipients(report_id, active);
CREATE INDEX idx_parameters_report ON avante.parameters(report_id);

CREATE TABLE avante.audit_log (
    id BIGSERIAL PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    record_id INT,
    action VARCHAR(20) CHECK (action IN ('INSERT','UPDATE','DELETE')),
    changed_by VARCHAR(100),
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    old_values JSONB, new_values JSONB
);

CREATE OR REPLACE FUNCTION avante.fn_audit_trigger() RETURNS TRIGGER AS $$
DECLARE v_user TEXT := COALESCE(current_setting('avante.changed_by', true), session_user);
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO avante.audit_log(table_name, record_id, action, changed_by, old_values)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', v_user, row_to_json(OLD)); RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO avante.audit_log(table_name, record_id, action, changed_by, old_values, new_values)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', v_user, row_to_json(OLD), row_to_json(NEW)); RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO avante.audit_log(table_name, record_id, action, changed_by, new_values)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', v_user, row_to_json(NEW)); RETURN NEW;
    END IF;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER tg_audit_recipients AFTER INSERT OR UPDATE OR DELETE ON avante.recipients
    FOR EACH ROW EXECUTE FUNCTION avante.fn_audit_trigger();
CREATE TRIGGER tg_audit_parameters AFTER INSERT OR UPDATE OR DELETE ON avante.parameters
    FOR EACH ROW EXECUTE FUNCTION avante.fn_audit_trigger();
CREATE TRIGGER tg_audit_schedules AFTER INSERT OR UPDATE OR DELETE ON avante.schedules
    FOR EACH ROW EXECUTE FUNCTION avante.fn_audit_trigger();

CREATE OR REPLACE VIEW avante.v_recipients_matrix AS
SELECT re.email, re.full_name, re.role,
    COUNT(DISTINCT re.report_id) AS reports_received,
    STRING_AGG(DISTINCT r.code, ', ' ORDER BY r.code) AS report_codes
FROM avante.recipients re JOIN avante.report_definitions r ON r.id = re.report_id
WHERE re.active = true GROUP BY re.email, re.full_name, re.role
ORDER BY reports_received DESC;

-- Perfiles RBAC (ligados a auth.users de Supabase)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(200) NOT NULL,
    full_name VARCHAR(200),
    role VARCHAR(20) NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin','editor','viewer')),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count INT; v_role TEXT;
BEGIN
    SELECT COUNT(*) INTO v_count FROM public.profiles;
    IF v_count = 0 OR NEW.email IN ('eaguirre@complejoavante.com','emartinez@complejoavante.com') THEN
        v_role := 'admin'; ELSE v_role := 'viewer'; END IF;
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), v_role);
    RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
