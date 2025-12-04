<?php

/**
 * -------------------------------------------------------------------------
 * FormModal plugin for GLPI
 * -------------------------------------------------------------------------
 *
 * LICENSE
 *
 * This file is part of FormModal.
 *
 * FormModal is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * FormModal is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with FormModal. If not, see <http://www.gnu.org/licenses/>.
 * -------------------------------------------------------------------------
 */

use Glpi\Plugin\Hooks;

define('PLUGIN_FORMMODAL_VERSION', '1.0.0');

// Minimal GLPI version, inclusive
define('PLUGIN_FORMMODAL_MIN_GLPI', '10.0.0');
// Maximum GLPI version, exclusive
define('PLUGIN_FORMMODAL_MAX_GLPI', '11.0.99');

/**
 * Init hooks of the plugin.
 * REQUIRED
 *
 * @return void
 */
function plugin_init_formmodal()
{
    /**
     * @var array $PLUGIN_HOOKS
     */
    global $PLUGIN_HOOKS;

    $PLUGIN_HOOKS['csrf_compliant']['formmodal'] = true;

    if (Plugin::isPluginActive('formmodal')) {
        // Register class for GLPI core
        Plugin::registerClass('PluginFormmodalConfig');

        // Add JavaScript and CSS files
        $PLUGIN_HOOKS['add_javascript']['formmodal'][] = 'js/formmodal.js';
        $PLUGIN_HOOKS['add_css']['formmodal'][] = 'css/formmodal.css';

        // Add config page
        $PLUGIN_HOOKS['config_page']['formmodal'] = 'front/config.form.php';
    }
}

/**
 * Get the name and the version of the plugin
 * REQUIRED
 *
 * @return array
 */
function plugin_version_formmodal()
{
    return [
        'name' => 'Form Modal Messages',
        'version' => PLUGIN_FORMMODAL_VERSION,
        'author' => '<a href="mailto:juancarlos.ap.dev@gmail.com">Juan Carlos Acosta Perabá</a>',
        'license' => 'GPLv3+',
        'homepage' => 'https://github.com/your-repo/formmodal',
        'requirements' => [
            'glpi' => [
                'min' => PLUGIN_FORMMODAL_MIN_GLPI,
                'max' => PLUGIN_FORMMODAL_MAX_GLPI,
            ]
        ]
    ];
}

/**
 * Check pre-requisites before install
 * OPTIONNAL, but recommanded
 *
 * @return boolean
 */
function plugin_formmodal_check_prerequisites()
{
    if (version_compare(GLPI_VERSION, PLUGIN_FORMMODAL_MIN_GLPI, 'lt')
        || version_compare(GLPI_VERSION, PLUGIN_FORMMODAL_MAX_GLPI, 'ge')
    ) {
        if (method_exists('Plugin', 'messageIncompatible')) {
            echo Plugin::messageIncompatible('core', PLUGIN_FORMMODAL_MIN_GLPI, PLUGIN_FORMMODAL_MAX_GLPI);
        }
        return false;
    }
    return true;
}

/**
 * Check configuration process
 *
 * @param boolean $verbose Whether to display message on failure. Defaults to false
 *
 * @return boolean
 */
function plugin_formmodal_check_config($verbose = false)
{
    if (true) { // Your configuration check
        return true;
    }

    if ($verbose) {
        echo __('Installed / not configured', 'formmodal');
    }
    return false;
}

/**
 * Check and upgrade database structure if needed
 * This runs on every page load when plugin is active
 *
 * @return void
 */
function plugin_formmodal_check_and_upgrade()
{
    global $DB;

    // Verificar si la tabla de configuración existe
    if (!$DB->tableExists('glpi_plugin_formmodal_configs')) {
        // Crear tabla de configuración
        $query = "CREATE TABLE IF NOT EXISTS `glpi_plugin_formmodal_configs` (
            `id` int unsigned NOT NULL AUTO_INCREMENT,
            `form_id` varchar(255) collate utf8mb4_unicode_ci NOT NULL DEFAULT '',
            `message` text collate utf8mb4_unicode_ci,
            `is_active` tinyint NOT NULL DEFAULT 1,
            PRIMARY KEY (`id`),
            KEY `form_id` (`form_id`),
            KEY `is_active` (`is_active`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;";

        $DB->query($query);
    }
}

/**
 * Install hook
 * REQUIRED BY GLPI
 *
 * @return bool
 */
function plugin_formmodal_install()
{
    global $DB;

    // Crear tabla de configuración
    $query = "CREATE TABLE IF NOT EXISTS `glpi_plugin_formmodal_configs` (
        `id` int unsigned NOT NULL AUTO_INCREMENT,
        `form_id` varchar(255) collate utf8mb4_unicode_ci NOT NULL DEFAULT '',
        `message` text collate utf8mb4_unicode_ci,
        `is_active` tinyint NOT NULL DEFAULT 1,
        PRIMARY KEY (`id`),
        KEY `form_id` (`form_id`),
        KEY `is_active` (`is_active`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;";

    if (!$DB->query($query)) {
        return false;
    }

    return true;
}

/**
 * Uninstall hook
 * REQUIRED BY GLPI
 *
 * @return bool
 */
function plugin_formmodal_uninstall()
{
    global $DB;

    // Drop plugin tables
    $tables = [
        'glpi_plugin_formmodal_configs'
    ];

    foreach ($tables as $table) {
        $DB->query("DROP TABLE IF EXISTS `$table`");
    }

    // Clean other GLPI tables
    $tables_glpi = [
        'glpi_displaypreferences',
        'glpi_logs',
        'glpi_savedsearches'
    ];

    foreach ($tables_glpi as $table_glpi) {
        $DB->query("DELETE FROM `$table_glpi` WHERE `itemtype` = 'PluginFormmodalConfig'");
    }

    return true;
}

