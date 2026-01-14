-- ============================================================================
-- FormModal Plugin - MySQL Event Scheduler Installation (MySQL Workbench Version)
-- ============================================================================
-- 
-- This event automatically deletes records older than 10 days from
-- glpi_plugin_formmodal_pending table every day at 02:00 AM.
--
-- IMPORTANT: MySQL Event Scheduler must be enabled for this to work.
-- Check with: SHOW VARIABLES LIKE 'event_scheduler';
-- Enable with: SET GLOBAL event_scheduler = ON;
--
-- ============================================================================
-- INSTRUCCIONES PARA MYSQL WORKBENCH:
-- 1. Abre MySQL Workbench y conéctate a tu base de datos GLPI
-- 2. Selecciona la base de datos GLPI en el panel izquierdo
-- 3. Verifica que el Event Scheduler está habilitado (ver sección abajo)
-- 4. Abre este archivo en MySQL Workbench (File > Open SQL Script)
-- 5. Ejecuta el script completo (Ctrl+Shift+Enter o botón Execute)
-- ============================================================================

-- First, check if the event already exists and drop it
DROP EVENT IF EXISTS `glpi_plugin_formmodal_cleanup_old_records`;

-- Create the event
-- Note: MySQL Workbench handles DELIMITER automatically, but we include it for clarity
DELIMITER //

CREATE EVENT `glpi_plugin_formmodal_cleanup_old_records`
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_DATE + INTERVAL 1 DAY + INTERVAL 2 HOUR
ON COMPLETION PRESERVE
ENABLE
COMMENT 'Delete FormModal pending records older than 10 days'
DO
BEGIN
    -- Delete records older than 10 days
    DELETE FROM glpi_plugin_formmodal_pending 
    WHERE created_at < DATE_SUB(NOW(), INTERVAL 10 DAY);
END;
//

DELIMITER ;

-- ============================================================================
-- Verificación: Ejecuta esta consulta para verificar que el evento se creó
-- ============================================================================
-- SHOW EVENTS WHERE Name = 'glpi_plugin_formmodal_cleanup_old_records';
-- ============================================================================
-- Para desinstalar el evento, ejecuta:
-- DROP EVENT IF EXISTS `glpi_plugin_formmodal_cleanup_old_records`;
-- ============================================================================
