-- ============================================================
-- AVANTE REPORTS PLATFORM - SETUP COMPLETO (1 solo archivo)
-- Pegar TODO en Supabase -> SQL Editor -> Run, en un proyecto nuevo.
-- Crea: schema avante (8 tablas), funciones, triggers de auditoria,
-- vistas, los 13 reportes + datos, y RBAC (public.profiles).
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
    table_name VARCHAR(50) NOT NULL, record_id INT,
    action VARCHAR(20) CHECK (action IN ('INSERT','UPDATE','DELETE')),
    changed_by VARCHAR(100), changed_at TIMESTAMPTZ DEFAULT NOW(),
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

-- ===================== DATOS: 13 REPORTES =====================
INSERT INTO avante.report_definitions (code, name, description, script_path, runtime, timeout_minutes, business_unit, owner_email) VALUES
('CUENTAS_HOSP',     'Cuentas Hospitalarias',          'Snapshot de cuentas activas con cobranza y semaforo', 'reports/cuentas_hospitalarias.py','python',30,'Hospitalizacion','eaguirre@complejoavante.com'),
('CUENTAS_HOSP_NOC', 'Cuentas Hospitalarias Nocturno', 'Cierre nocturno de cuentas a evasquez',               'reports/cuentas_hospitalarias.py','python',30,'Hospitalizacion','eaguirre@complejoavante.com'),
('DRSV_DIARIO',      'DR.Sv Seguimiento Diario',       'Pacientes referidos TeleSalud + proyeccion PDV',      'reports/drsv_diario.py','python',20,'Comercial','eaguirre@complejoavante.com'),
('FARMACIA_CPFR',    'Farmacias CPFR',                 'Reabastecimiento cada 3 dias',                        'reports/farmacias_cpfr.py','python',45,'Farmacia','eaguirre@complejoavante.com'),
('FARMACIA_PERF',    'Farmacias Performance',          'Performance, GMROI y rotacion',                       'reports/farmacias_performance.py','python',30,'Farmacia','eaguirre@complejoavante.com'),
('PROY_FACT_AM',     'Proyeccion Facturacion 05:00',   'Proyeccion mensual de facturacion matutina',          'reports/proyeccion_facturacion.py','python',40,'Finanzas','eaguirre@complejoavante.com'),
('PROY_FACT_PM',     'Proyeccion Facturacion 22:00',   'Proyeccion mensual de facturacion nocturna',          'reports/proyeccion_facturacion.py','python',40,'Finanzas','eaguirre@complejoavante.com'),
('FARMACIA_DIARIO',  'Farmacias Diario',               'Compras y movimientos del dia anterior',              'reports/farmacias_diario.py','python',20,'Farmacia','eaguirre@complejoavante.com'),
('NUTRI_AM',         'Nutricion 06:00',                'Interconsultas de nutricion matutino',                'reports/nutricion.py','python',15,'Nutricion','eaguirre@complejoavante.com'),
('NUTRI_PM',         'Nutricion 18:00',                'Interconsultas de nutricion vespertino',              'reports/nutricion.py','python',15,'Nutricion','eaguirre@complejoavante.com'),
('OCUPACION_HOR',    'Ocupacion Horaria',              'Ocupacion de camas y cirugias programadas 3x/dia',    'reports/ocupacion_horaria.py','python',25,'Hospitalizacion','eaguirre@complejoavante.com'),
('RFQS_DIARIO',      'RFQs Pendientes',                'Cotizaciones pendientes de compras',                  'reports/rfqs_pendientes.py','python',15,'Compras','eaguirre@complejoavante.com'),
('SEGUROS_3X',       'Seguros y Aseguradoras',         'Facturacion y cobranza a aseguradoras 3x/dia',        'reports/seguros.py','python',25,'Finanzas','eaguirre@complejoavante.com');

-- ===================== HORARIOS =====================
INSERT INTO avante.schedules (report_id, cron_expression, description) VALUES
((SELECT id FROM avante.report_definitions WHERE code='CUENTAS_HOSP'),     '0 7,12,19 * * *',  '4x dia (07, 12, 19)'),
((SELECT id FROM avante.report_definitions WHERE code='CUENTAS_HOSP'),     '59 23 * * *',      '4ta corrida 23:59'),
((SELECT id FROM avante.report_definitions WHERE code='CUENTAS_HOSP_NOC'), '59 23 * * *',      'Diario 23:59'),
((SELECT id FROM avante.report_definitions WHERE code='DRSV_DIARIO'),      '0 6 * * *',        'Diario 06:00'),
((SELECT id FROM avante.report_definitions WHERE code='FARMACIA_CPFR'),    '0 7 */3 * *',      'Cada 3 dias 07:00'),
((SELECT id FROM avante.report_definitions WHERE code='FARMACIA_PERF'),    '0 8,17 * * *',     '2x dia (08, 17)'),
((SELECT id FROM avante.report_definitions WHERE code='PROY_FACT_AM'),     '0 5 * * *',        'Diario 05:00'),
((SELECT id FROM avante.report_definitions WHERE code='PROY_FACT_PM'),     '0 22 * * *',       'Diario 22:00'),
((SELECT id FROM avante.report_definitions WHERE code='FARMACIA_DIARIO'),  '0 6 * * *',        'Diario 06:00'),
((SELECT id FROM avante.report_definitions WHERE code='NUTRI_AM'),         '0 6 * * *',        'Diario 06:00'),
((SELECT id FROM avante.report_definitions WHERE code='NUTRI_PM'),         '0 18 * * *',       'Diario 18:00'),
((SELECT id FROM avante.report_definitions WHERE code='OCUPACION_HOR'),    '5 5,12,17 * * *',  '3x dia (05:05, 12:05, 17:05)'),
((SELECT id FROM avante.report_definitions WHERE code='RFQS_DIARIO'),      '0 6 * * *',        'Diario 06:00'),
((SELECT id FROM avante.report_definitions WHERE code='SEGUROS_3X'),       '0 5,20 * * *',     '2 corridas (05, 20)'),
((SELECT id FROM avante.report_definitions WHERE code='SEGUROS_3X'),       '30 14 * * *',      '3ra corrida 14:30');

-- ===================== DESTINATARIOS =====================
INSERT INTO avante.recipients (report_id, email, type, full_name, role, only_in_prod) VALUES
((SELECT id FROM avante.report_definitions WHERE code='CUENTAS_HOSP'),'eaguirre@complejoavante.com','TO','Erick Aguirre','Direccion',false),
((SELECT id FROM avante.report_definitions WHERE code='CUENTAS_HOSP'),'evasquez@complejoavante.com','BCC','E. Vasquez','Operaciones',true),
((SELECT id FROM avante.report_definitions WHERE code='CUENTAS_HOSP'),'brodriguez@complejoavante.com','BCC','B. Rodriguez','Gerencia',true),
((SELECT id FROM avante.report_definitions WHERE code='CUENTAS_HOSP'),'smatus@complejoavante.com','BCC','S. Matus','Cobranza',true),
((SELECT id FROM avante.report_definitions WHERE code='CUENTAS_HOSP'),'mrivera@complejoavante.com','BCC','M. Rivera','Cobranza',true),
((SELECT id FROM avante.report_definitions WHERE code='CUENTAS_HOSP'),'yruiz@complejoavante.com','BCC','Y. Ruiz','Cobranza',true),
((SELECT id FROM avante.report_definitions WHERE code='CUENTAS_HOSP'),'javila@complejoavante.com','BCC','J. Avila','Auditoria',true),
((SELECT id FROM avante.report_definitions WHERE code='CUENTAS_HOSP'),'caja.hospitalespecializado@complejoavante.com','BCC','Caja HE','Caja',true),
((SELECT id FROM avante.report_definitions WHERE code='CUENTAS_HOSP'),'caja.centromedico@complejoavante.com','BCC','Caja CM','Caja',true),
((SELECT id FROM avante.report_definitions WHERE code='CUENTAS_HOSP'),'amedina@complejoavante.com','BCC','A. Medina','Gerencia',true),
((SELECT id FROM avante.report_definitions WHERE code='CUENTAS_HOSP'),'ahenriquez@complejoavante.com','BCC','A. Henriquez','Direccion Medica',true),
((SELECT id FROM avante.report_definitions WHERE code='CUENTAS_HOSP'),'jrivera@complejoavante.com','BCC','J. Rivera','Operaciones',true),
((SELECT id FROM avante.report_definitions WHERE code='CUENTAS_HOSP'),'lmartinez@complejoavante.com','BCC','L. Martinez','Operaciones',true),
((SELECT id FROM avante.report_definitions WHERE code='CUENTAS_HOSP_NOC'),'evasquez@complejoavante.com','TO','E. Vasquez','Operaciones',false),
((SELECT id FROM avante.report_definitions WHERE code='CUENTAS_HOSP_NOC'),'brodriguez@complejoavante.com','BCC','B. Rodriguez','Gerencia',true),
((SELECT id FROM avante.report_definitions WHERE code='CUENTAS_HOSP_NOC'),'ahenriquez@complejoavante.com','BCC','A. Henriquez','Direccion Medica',true),
((SELECT id FROM avante.report_definitions WHERE code='DRSV_DIARIO'),'eaguirre@complejoavante.com','TO','Erick Aguirre','Direccion',false),
((SELECT id FROM avante.report_definitions WHERE code='DRSV_DIARIO'),'brodriguez@complejoavante.com','BCC','B. Rodriguez','Gerencia',true),
((SELECT id FROM avante.report_definitions WHERE code='DRSV_DIARIO'),'nponce@complejoavante.com','BCC','N. Ponce','Comercial',true),
((SELECT id FROM avante.report_definitions WHERE code='DRSV_DIARIO'),'kdominguez@complejoavante.com','BCC','K. Dominguez','Comercial',true),
((SELECT id FROM avante.report_definitions WHERE code='DRSV_DIARIO'),'hlara@complejoavante.com','BCC','H. Lara','Direccion Medica',true),
((SELECT id FROM avante.report_definitions WHERE code='DRSV_DIARIO'),'evasquez@complejoavante.com','BCC','E. Vasquez','Operaciones',true),
((SELECT id FROM avante.report_definitions WHERE code='DRSV_DIARIO'),'amedina@complejoavante.com','BCC','A. Medina','Gerencia',true),
((SELECT id FROM avante.report_definitions WHERE code='FARMACIA_CPFR'),'eaguirre@complejoavante.com','TO','Erick Aguirre','Direccion',false),
((SELECT id FROM avante.report_definitions WHERE code='FARMACIA_CPFR'),'fbustamante@complejoavante.com','BCC','F. Bustamante','Farmacia',true),
((SELECT id FROM avante.report_definitions WHERE code='FARMACIA_CPFR'),'brodriguez@complejoavante.com','BCC','B. Rodriguez','Gerencia',true),
((SELECT id FROM avante.report_definitions WHERE code='FARMACIA_CPFR'),'amedina@complejoavante.com','BCC','A. Medina','Gerencia',true),
((SELECT id FROM avante.report_definitions WHERE code='FARMACIA_PERF'),'eaguirre@complejoavante.com','TO','Erick Aguirre','Direccion',false),
((SELECT id FROM avante.report_definitions WHERE code='FARMACIA_PERF'),'fbustamante@complejoavante.com','BCC','F. Bustamante','Farmacia',true),
((SELECT id FROM avante.report_definitions WHERE code='FARMACIA_PERF'),'brodriguez@complejoavante.com','BCC','B. Rodriguez','Gerencia',true),
((SELECT id FROM avante.report_definitions WHERE code='FARMACIA_PERF'),'amedina@complejoavante.com','BCC','A. Medina','Gerencia',true),
((SELECT id FROM avante.report_definitions WHERE code='FARMACIA_PERF'),'agarcia@complejoavante.com','BCC','A. Garcia','Farmacia',true),
((SELECT id FROM avante.report_definitions WHERE code='PROY_FACT_AM'),'eaguirre@complejoavante.com','TO','Erick Aguirre','Direccion',false),
((SELECT id FROM avante.report_definitions WHERE code='PROY_FACT_AM'),'brodriguez@complejoavante.com','BCC','B. Rodriguez','Gerencia',true),
((SELECT id FROM avante.report_definitions WHERE code='PROY_FACT_AM'),'amedina@complejoavante.com','BCC','A. Medina','Gerencia',true),
((SELECT id FROM avante.report_definitions WHERE code='PROY_FACT_PM'),'eaguirre@complejoavante.com','TO','Erick Aguirre','Direccion',false),
((SELECT id FROM avante.report_definitions WHERE code='PROY_FACT_PM'),'brodriguez@complejoavante.com','BCC','B. Rodriguez','Gerencia',true),
((SELECT id FROM avante.report_definitions WHERE code='FARMACIA_DIARIO'),'amedina@complejoavante.com','TO','A. Medina','Gerencia',false),
((SELECT id FROM avante.report_definitions WHERE code='FARMACIA_DIARIO'),'gsaravia@complejoavante.com','TO','G. Saravia','Compras',false),
((SELECT id FROM avante.report_definitions WHERE code='NUTRI_AM'),'eaguirre@complejoavante.com','TO','Erick Aguirre','Direccion',false),
((SELECT id FROM avante.report_definitions WHERE code='NUTRI_AM'),'brodriguez@complejoavante.com','BCC','B. Rodriguez','Gerencia',true),
((SELECT id FROM avante.report_definitions WHERE code='NUTRI_AM'),'jflores@complejoavante.com','BCC','J. Flores','Nutricion',true),
((SELECT id FROM avante.report_definitions WHERE code='NUTRI_AM'),'evasquez@complejoavante.com','BCC','E. Vasquez','Operaciones',true),
((SELECT id FROM avante.report_definitions WHERE code='NUTRI_AM'),'amedina@complejoavante.com','BCC','A. Medina','Gerencia',true),
((SELECT id FROM avante.report_definitions WHERE code='NUTRI_AM'),'gfigueroa@complejoavante.com','BCC','G. Figueroa','Nutricion',true),
((SELECT id FROM avante.report_definitions WHERE code='NUTRI_PM'),'eaguirre@complejoavante.com','TO','Erick Aguirre','Direccion',false),
((SELECT id FROM avante.report_definitions WHERE code='NUTRI_PM'),'brodriguez@complejoavante.com','BCC','B. Rodriguez','Gerencia',true),
((SELECT id FROM avante.report_definitions WHERE code='NUTRI_PM'),'jflores@complejoavante.com','BCC','J. Flores','Nutricion',true),
((SELECT id FROM avante.report_definitions WHERE code='NUTRI_PM'),'evasquez@complejoavante.com','BCC','E. Vasquez','Operaciones',true),
((SELECT id FROM avante.report_definitions WHERE code='NUTRI_PM'),'amedina@complejoavante.com','BCC','A. Medina','Gerencia',true),
((SELECT id FROM avante.report_definitions WHERE code='NUTRI_PM'),'gfigueroa@complejoavante.com','BCC','G. Figueroa','Nutricion',true),
((SELECT id FROM avante.report_definitions WHERE code='OCUPACION_HOR'),'eaguirre@complejoavante.com','TO','Erick Aguirre','Direccion',false),
((SELECT id FROM avante.report_definitions WHERE code='OCUPACION_HOR'),'gsaravia@complejoavante.com','BCC','G. Saravia','Operaciones',true),
((SELECT id FROM avante.report_definitions WHERE code='OCUPACION_HOR'),'jamaya@complejoavante.com','BCC','J. Amaya','Operaciones',true),
((SELECT id FROM avante.report_definitions WHERE code='OCUPACION_HOR'),'dmaldonado@complejoavante.com','BCC','D. Maldonado','Operaciones',true),
((SELECT id FROM avante.report_definitions WHERE code='OCUPACION_HOR'),'caquino@complejoavante.com','BCC','C. Aquino','Operaciones',true),
((SELECT id FROM avante.report_definitions WHERE code='OCUPACION_HOR'),'amontano@complejoavante.com','BCC','A. Montano','Operaciones',true),
((SELECT id FROM avante.report_definitions WHERE code='OCUPACION_HOR'),'amedina@complejoavante.com','BCC','A. Medina','Gerencia',true),
((SELECT id FROM avante.report_definitions WHERE code='OCUPACION_HOR'),'emartinez@complejoavante.com','BCC','E. Martinez','Operaciones',true),
((SELECT id FROM avante.report_definitions WHERE code='OCUPACION_HOR'),'brodriguez@complejoavante.com','BCC','B. Rodriguez','Gerencia',true),
((SELECT id FROM avante.report_definitions WHERE code='OCUPACION_HOR'),'jflores@complejoavante.com','BCC','J. Flores','Nutricion',true),
((SELECT id FROM avante.report_definitions WHERE code='OCUPACION_HOR'),'evasquez@complejoavante.com','BCC','E. Vasquez','Operaciones',true),
((SELECT id FROM avante.report_definitions WHERE code='OCUPACION_HOR'),'ahenriquez@complejoavante.com','BCC','A. Henriquez','Dir. Medica',true),
((SELECT id FROM avante.report_definitions WHERE code='OCUPACION_HOR'),'cvaldez@complejoavante.com','BCC','C. Valdez','Operaciones',true),
((SELECT id FROM avante.report_definitions WHERE code='OCUPACION_HOR'),'kgranados@complejoavante.com','BCC','K. Granados','Operaciones',true),
((SELECT id FROM avante.report_definitions WHERE code='OCUPACION_HOR'),'iturcios@complejoavante.com','BCC','I. Turcios','Operaciones',true),
((SELECT id FROM avante.report_definitions WHERE code='OCUPACION_HOR'),'hlara@complejoavante.com','BCC','H. Lara','Dir. Medica',true),
((SELECT id FROM avante.report_definitions WHERE code='OCUPACION_HOR'),'jcervino@complejoavante.com','BCC','J. Cervino','Aseguradoras',true),
((SELECT id FROM avante.report_definitions WHERE code='RFQS_DIARIO'),'gsaravia@complejoavante.com','TO','G. Saravia','Compras',false),
((SELECT id FROM avante.report_definitions WHERE code='RFQS_DIARIO'),'amedina@complejoavante.com','TO','A. Medina','Gerencia',false),
((SELECT id FROM avante.report_definitions WHERE code='SEGUROS_3X'),'eaguirre@complejoavante.com','TO','Erick Aguirre','Direccion',false),
((SELECT id FROM avante.report_definitions WHERE code='SEGUROS_3X'),'evasquez@complejoavante.com','BCC','E. Vasquez','Operaciones',true),
((SELECT id FROM avante.report_definitions WHERE code='SEGUROS_3X'),'jcervino@complejoavante.com','BCC','J. Cervino','Aseguradoras',true),
((SELECT id FROM avante.report_definitions WHERE code='SEGUROS_3X'),'hlara@complejoavante.com','BCC','H. Lara','Dir. Medica',true),
((SELECT id FROM avante.report_definitions WHERE code='SEGUROS_3X'),'msosa@complejoavante.com','BCC','M. Sosa','Aseguradoras',true),
((SELECT id FROM avante.report_definitions WHERE code='SEGUROS_3X'),'brodriguez@complejoavante.com','BCC','B. Rodriguez','Gerencia',true),
((SELECT id FROM avante.report_definitions WHERE code='SEGUROS_3X'),'amedina@complejoavante.com','BCC','A. Medina','Gerencia',true),
((SELECT id FROM avante.report_definitions WHERE code='SEGUROS_3X'),'javila@complejoavante.com','BCC','J. Avila','Auditoria',true);

-- ===================== PARAMETROS =====================
INSERT INTO avante.parameters (report_id, param_key, param_value, param_type, description) VALUES
((SELECT id FROM avante.report_definitions WHERE code='DRSV_DIARIO'),'fecha_inicio','2026-04-14','date','Fecha inicio acumulado (RESET ANUAL)'),
((SELECT id FROM avante.report_definitions WHERE code='DRSV_DIARIO'),'drsv_partner_id','99049','int','ID Odoo del Dr. Sv en res.partner'),
((SELECT id FROM avante.report_definitions WHERE code='DRSV_DIARIO'),'tarifario_path','/data/catalogs/TARIFARIO_DRSV.xlsx','string','Ruta del Excel tarifario'),
((SELECT id FROM avante.report_definitions WHERE code='DRSV_DIARIO'),'companies_ids','[1,2,3]','json','Cias incluidas (CM, HE, SC)'),
((SELECT id FROM avante.report_definitions WHERE code='CUENTAS_HOSP'),'companies_ids','[1,2,3]','json','Cias hospitalarias'),
((SELECT id FROM avante.report_definitions WHERE code='CUENTAS_HOSP'),'estados_validos','["hosp"]','json','Estados de hospitalizaciones a incluir'),
((SELECT id FROM avante.report_definitions WHERE code='FARMACIA_CPFR'),'rolling_weeks','12','int','Ventanas para CPFR'),
((SELECT id FROM avante.report_definitions WHERE code='FARMACIA_CPFR'),'location_fcm','121','int','Stock location Farmacia CM'),
((SELECT id FROM avante.report_definitions WHERE code='FARMACIA_CPFR'),'location_fsc','52','int','Stock location Farmacia SC'),
((SELECT id FROM avante.report_definitions WHERE code='SEGUROS_3X'),'companies_ids','[1,2,3]','json','Cias hospitalarias'),
((SELECT id FROM avante.report_definitions WHERE code='SEGUROS_3X'),'umbral_critico_dias','90','int','Dias antiguedad critica');

-- ===================== DEPENDENCIAS =====================
INSERT INTO avante.dependencies (report_id, dep_type, dep_name, dep_version, purpose) VALUES
((SELECT id FROM avante.report_definitions WHERE code='CUENTAS_HOSP'),'python','requests','2.32.3','HTTP Odoo'),
((SELECT id FROM avante.report_definitions WHERE code='CUENTAS_HOSP'),'python','pandas','2.2.3','Data wrangling'),
((SELECT id FROM avante.report_definitions WHERE code='CUENTAS_HOSP'),'python','openpyxl','3.1.5','Excel write'),
((SELECT id FROM avante.report_definitions WHERE code='CUENTAS_HOSP'),'python','jinja2','3.1.4','HTML template'),
((SELECT id FROM avante.report_definitions WHERE code='CUENTAS_HOSP'),'python','playwright','1.49.0','PDF generation'),
((SELECT id FROM avante.report_definitions WHERE code='DRSV_DIARIO'),'python','requests','2.32.3','HTTP Odoo'),
((SELECT id FROM avante.report_definitions WHERE code='DRSV_DIARIO'),'python','pandas','2.2.3','Data'),
((SELECT id FROM avante.report_definitions WHERE code='DRSV_DIARIO'),'python','openpyxl','3.1.5','Excel read tarifario'),
((SELECT id FROM avante.report_definitions WHERE code='DRSV_DIARIO'),'python','matplotlib','3.9.2','Charts'),
((SELECT id FROM avante.report_definitions WHERE code='FARMACIA_CPFR'),'python','scipy','1.14.1','Statistical forecasting'),
((SELECT id FROM avante.report_definitions WHERE code='FARMACIA_CPFR'),'python','numpy','2.1.3','Numerical');

-- ===================== RBAC (perfiles + alta automatica) =====================
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

-- ===================== EJECUCIONES DE EJEMPLO (opcional) =====================
INSERT INTO avante.executions (report_id, triggered_by, started_at, finished_at, status, duration_sec, rows_processed, emails_sent, output_files) VALUES
((SELECT id FROM avante.report_definitions WHERE code='DRSV_DIARIO'),    'scheduler', NOW() - INTERVAL '6 hours',  NOW() - INTERVAL '6 hours' + INTERVAL '142 seconds', 'success', 142, 318, 7, '{"pdf":"DRSV.pdf"}'),
((SELECT id FROM avante.report_definitions WHERE code='CUENTAS_HOSP'),   'scheduler', NOW() - INTERVAL '5 hours',  NOW() - INTERVAL '5 hours' + INTERVAL '88 seconds',  'success', 88,  124, 13, '{"xlsx":"CUENTAS.xlsx"}'),
((SELECT id FROM avante.report_definitions WHERE code='SEGUROS_3X'),     'scheduler', NOW() - INTERVAL '13 hours', NOW() - INTERVAL '13 hours' + INTERVAL '98 seconds',  'failed',  98,  0,   0, NULL),
((SELECT id FROM avante.report_definitions WHERE code='SEGUROS_3X'),     'scheduler', NOW() - INTERVAL '4 hours',  NULL, 'running', NULL, NULL, NULL, NULL);
