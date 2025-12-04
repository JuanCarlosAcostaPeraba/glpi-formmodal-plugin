-- SQL Script for manual installation of FormModal plugin
-- This script creates the necessary table if installation fails

CREATE TABLE IF NOT EXISTS `glpi_plugin_formmodal_configs` (
    `id` int unsigned NOT NULL auto_increment,
    `form_id` varchar(255) collate utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT 'ID del formulario a interceptar',
    `message` text collate utf8mb4_unicode_ci COMMENT 'Mensaje con formato HTML',
    `is_active` tinyint NOT NULL DEFAULT 1 COMMENT 'Si está activo o no',
    PRIMARY KEY (`id`),
    KEY `form_id` (`form_id`),
    KEY `is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

-- Example data for testing
-- INSERT INTO `glpi_plugin_formmodal_configs` (`form_id`, `message`, `is_active`) 
-- VALUES ('ticket-form', '<p><strong>¡Gracias por enviar tu solicitud!</strong></p><p>Tu ticket ha sido creado correctamente.</p>', 1);

