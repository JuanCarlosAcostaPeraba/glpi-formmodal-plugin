-- ============================================================================
-- FormModal Plugin - SQL Trigger Installation
-- ============================================================================
-- 
-- WARNING: This is an invasive solution that modifies GLPI's database
-- by adding a trigger to the glpi_forms_destinations_answerssets_formdestinationitems table.
--
-- This trigger will automatically create a pending modal entry when
-- a form answer is linked to a Ticket for forms_forms_id = 49 (preproduction).
-- NOTE: For production, change to forms_forms_id = 46
--
-- IMPORTANT: This trigger uses users_id from glpi_forms_answerssets to identify
-- the user. The PHP endpoint will match this with the current session.
--
-- GLPI 11 Structure:
-- - Answer sets table: glpi_forms_answerssets
-- - Form ID field: forms_forms_id (not forms_id)
-- - Ticket relation: glpi_forms_destinations_answerssets_formdestinationitems
--
-- Why this table? The ticket is created AFTER the answer set, so we trigger
-- when the relationship is created, ensuring the ticket_id exists.
--
-- ============================================================================

-- First, check if the trigger already exists and drop it
DROP TRIGGER IF EXISTS `glpi_plugin_formmodal_after_formanswer_insert`;

-- Create the trigger
DELIMITER //

CREATE TRIGGER `glpi_plugin_formmodal_after_formanswer_insert`
AFTER INSERT ON `glpi_forms_destinations_answerssets_formdestinationitems`
FOR EACH ROW
BEGIN
    -- Only process if this is a Ticket relationship and the form is 49
    IF NEW.itemtype = 'Ticket' THEN
        -- Get form_id from the related answer set
        SET @formmodal_form_id = NULL;
        SELECT forms_forms_id INTO @formmodal_form_id
        FROM glpi_forms_answerssets
        WHERE id = NEW.forms_answerssets_id
        LIMIT 1;
        
        -- Only process if forms_forms_id is 49 (hardcoded - preproduction)
        -- NOTE: For production, change to: IF @formmodal_form_id = 46 THEN
        IF @formmodal_form_id = 49 THEN
            -- Get user_id from the answer set
            SET @formmodal_user_id = NULL;
            SELECT users_id INTO @formmodal_user_id
            FROM glpi_forms_answerssets
            WHERE id = NEW.forms_answerssets_id
            LIMIT 1;
            
            -- Ticket ID is directly available from NEW.items_id
            SET @formmodal_ticket_id = NEW.items_id;
            
            -- Get ticket name (title) from glpi_tickets table
            -- This is what appears in the success notification link
            SET @formmodal_department_name = NULL;
            SELECT name INTO @formmodal_department_name
            FROM glpi_tickets
            WHERE id = @formmodal_ticket_id
            LIMIT 1;
            
            -- If ticket name is empty or null, set to NULL
            IF @formmodal_department_name IS NULL OR @formmodal_department_name = '' THEN
                SET @formmodal_department_name = NULL;
            END IF;
            
            -- Hardcoded message (can be customized in the PHP code)
            SET @formmodal_message = '<p>Su incidencia con ID <strong>[ID_DE_INCIDENCIA]</strong> se ha subido correctamente. Puede llamar al teléfono de guardias y preguntar por el departamento: <strong>[NOMBRE_DEPARTAMENTO]</strong>.</p><p>ID de incidencia: <strong>[ID_DE_INCIDENCIA]</strong></p>';
            
            -- Clean old pending modals (older than 5 minutes)
            DELETE FROM glpi_plugin_formmodal_pending 
            WHERE created_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE);
            
            -- Insert pending modal
            -- Note: We use users_id as session_id placeholder - PHP will match by user
            INSERT INTO glpi_plugin_formmodal_pending (
                session_id,
                form_id,
                ticket_id,
                department_name,
                message,
                created_at,
                shown
            ) VALUES (
                CONCAT('user_', @formmodal_user_id),
                @formmodal_form_id,
                @formmodal_ticket_id,
                @formmodal_department_name,
                @formmodal_message,
                NOW(),
                0
            );
        END IF;
    END IF;
END;
//

DELIMITER ;

-- ============================================================================
-- To uninstall the trigger, run:
-- DROP TRIGGER IF EXISTS `glpi_plugin_formmodal_after_formanswer_insert`;
-- ============================================================================
