-- ============================================================================
-- FormModal Plugin - MySQL Event Scheduler Installation
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

-- First, check if the event already exists and drop it
DROP EVENT IF EXISTS `glpi_plugin_formmodal_cleanup_old_records`;

-- Create the event
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
-- To verify the event was created, run:
-- SHOW EVENTS WHERE Name = 'glpi_plugin_formmodal_cleanup_old_records';
-- ============================================================================
-- To uninstall the event, run:
-- DROP EVENT IF EXISTS `glpi_plugin_formmodal_cleanup_old_records`;
-- ============================================================================
