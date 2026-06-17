-- ============================================================
-- AVANTE REPORTS PLATFORM - Datos iniciales (13 reportes)
-- Ejecutar despues de supabase/schema.sql
-- ============================================================
INSERT INTO avante.report_definitions (code, name, description, script_path, runtime, timeout_minutes, business_unit, owner_email) VALUES
('CUENTAS_HOSP','Cuentas Hospitalarias','Snapshot de cuentas activas con cobranza y semaforo','reports/cuentas_hospitalarias.py','python',30,'Hospitalizacion','eaguirre@complejoavante.com'),
('CUENTAS_HOSP_NOC','Cuentas Hospitalarias Nocturno','Cierre nocturno de cuentas a evasquez','reports/cuentas_hospitalarias.py','python',30,'Hospitalizacion','eaguirre@complejoavante.com'),
('DRSV_DIARIO','DR.Sv Seguimiento Diario','Pacientes referidos TeleSalud + proyeccion PDV','reports/drsv_diario.py','python',20,'Comercial','eaguirre@complejoavante.com'),
('FARMACIA_CPFR','Farmacias CPFR','Reabastecimiento cada 3 dias','reports/farmacias_cpfr.py','python',45,'Farmacia','eaguirre@complejoavante.com'),
('FARMACIA_PERF','Farmacias Performance','Performance, GMROI y rotacion','reports/farmacias_performance.py','python',30,'Farmacia','eaguirre@complejoavante.com'),
('PROY_FACT_AM','Proyeccion Facturacion 05:00','Proyeccion mensual de facturacion matutina','reports/proyeccion_facturacion.py','python',40,'Finanzas','eaguirre@complejoavante.com'),
('PROY_FACT_PM','Proyeccion Facturacion 22:00','Proyeccion mensual de facturacion nocturna','reports/proyeccion_facturacion.py','python',40,'Finanzas','eaguirre@complejoavante.com'),
('FARMACIA_DIARIO','Farmacias Diario','Compras y movimientos del dia anterior','reports/farmacias_diario.py','python',20,'Farmacia','eaguirre@complejoavante.com'),
('NUTRI_AM','Nutricion 06:00','Interconsultas de nutricion matutino','reports/nutricion.py','python',15,'Nutricion','eaguirre@complejoavante.com'),
('NUTRI_PM','Nutricion 18:00','Interconsultas de nutricion vespertino','reports/nutricion.py','python',15,'Nutricion','eaguirre@complejoavante.com'),
('OCUPACION_HOR','Ocupacion Horaria','Ocupacion de camas y cirugias programadas 3x/dia','reports/ocupacion_horaria.py','python',25,'Hospitalizacion','eaguirre@complejoavante.com'),
('RFQS_DIARIO','RFQs Pendientes','Cotizaciones pendientes de compras','reports/rfqs_pendientes.py','python',15,'Compras','eaguirre@complejoavante.com'),
('SEGUROS_3X','Seguros y Aseguradoras','Facturacion y cobranza a aseguradoras 3x/dia','reports/seguros.py','python',25,'Finanzas','eaguirre@complejoavante.com');

-- NOTA: Las inserciones completas de schedules, recipients (78), parameters y dependencies
-- estan en docs/03_Database_Schema.sql (version original) y ya fueron cargadas en el proyecto ARP.
-- Reutiliza ese archivo (cambiando los nombres de tabla a avante.<tabla>) para recargar todo el set.
