-- SQL Script for manual uninstallation of FormModal plugin

-- Drop the plugin table
DROP TABLE IF EXISTS `glpi_plugin_formmodal_configs`;

-- Clean GLPI tables
DELETE FROM `glpi_displaypreferences` WHERE `itemtype` = 'PluginFormmodalConfig';
DELETE FROM `glpi_logs` WHERE `itemtype` = 'PluginFormmodalConfig';
DELETE FROM `glpi_savedsearches` WHERE `itemtype` = 'PluginFormmodalConfig';

