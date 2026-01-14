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

if (!defined('GLPI_ROOT')) {
    die("Sorry. You can't access this file directly");
}

/**
 * Configuration class for FormModal plugin
 */
class PluginFormmodalConfig extends CommonDBTM
{
    public static $rightname = 'config';

    /**
     * Get translated name
     *
     * @param integer $nb Number of items
     * @return string Name
     */
    public static function getTypeName($nb = 0)
    {
        return __('Form Modal Configuration', 'formmodal');
    }

    /**
     * Get all configurations
     *
     * @return array Array of configurations
     */
    public static function getAllConfigs()
    {
        global $DB;

        $configs = [];
        $iterator = $DB->request([
            'FROM' => 'glpi_plugin_formmodal_configs',
            'ORDER' => 'id DESC'
        ]);

        foreach ($iterator as $data) {
            $configs[] = $data;
        }

        return $configs;
    }

    /**
     * Get all active configurations
     *
     * @return array Array of active configurations
     */
    public static function getAllActiveConfigs()
    {
        global $DB;

        $configs = [];
        $iterator = $DB->request([
            'FROM' => 'glpi_plugin_formmodal_configs',
            'WHERE' => ['is_active' => 1]
        ]);

        foreach ($iterator as $data) {
            $configs[] = [
                'form_id' => $data['form_id'],
                'message' => $data['message']
            ];
        }

        return $configs;
    }

    /**
     * Get a specific configuration by ID
     *
     * @param int $id Configuration ID
     * @return array|false Configuration data or false if not found
     */
    public static function getConfigById($id)
    {
        global $DB;

        $iterator = $DB->request([
            'FROM' => 'glpi_plugin_formmodal_configs',
            'WHERE' => ['id' => $id],
            'LIMIT' => 1
        ]);

        if (count($iterator) > 0) {
            return $iterator->current();
        }

        return false;
    }

    /**
     * Save a new configuration
     *
     * @param array $input Configuration data
     * @return int|false New ID or false on error
     */
    public static function addConfig($input)
    {
        global $DB;

        // Validate required fields
        if (empty($input['form_id'])) {
            Session::addMessageAfterRedirect(__('Form ID is required', 'formmodal'), false, ERROR);
            return false;
        }

        if (empty($input['message'])) {
            Session::addMessageAfterRedirect(__('Message is required', 'formmodal'), false, ERROR);
            return false;
        }

        // El mensaje viene del editor HTML, lo guardamos tal cual
        $message = $input['message'];
        $form_id = $input['form_id'];
        $is_active = isset($input['is_active']) ? (int)$input['is_active'] : 1;

        $result = $DB->insert(
            'glpi_plugin_formmodal_configs',
            [
                'form_id' => $form_id,
                'message' => $message,
                'is_active' => $is_active
            ]
        );

        if ($result) {
            Session::addMessageAfterRedirect(__('Configuration added successfully', 'formmodal'), false, INFO);
            return $DB->insertId();
        }

        Session::addMessageAfterRedirect(__('Error adding configuration', 'formmodal'), false, ERROR);
        return false;
    }

    /**
     * Update an existing configuration
     *
     * @param array $input Configuration data with ID
     * @return bool Success
     */
    public static function updateConfig($input)
    {
        global $DB;

        if (empty($input['id'])) {
            Session::addMessageAfterRedirect(__('ID is required', 'formmodal'), false, ERROR);
            return false;
        }

        // Validate required fields
        if (empty($input['form_id'])) {
            Session::addMessageAfterRedirect(__('Form ID is required', 'formmodal'), false, ERROR);
            return false;
        }

        if (empty($input['message'])) {
            Session::addMessageAfterRedirect(__('Message is required', 'formmodal'), false, ERROR);
            return false;
        }

        // El mensaje viene del editor HTML, lo guardamos tal cual
        $message = $input['message'];
        $form_id = $input['form_id'];
        $is_active = isset($input['is_active']) ? (int)$input['is_active'] : 1;

        $result = $DB->update(
            'glpi_plugin_formmodal_configs',
            [
                'form_id' => $form_id,
                'message' => $message,
                'is_active' => $is_active
            ],
            ['id' => $input['id']]
        );

        if ($result) {
            Session::addMessageAfterRedirect(__('Configuration updated successfully', 'formmodal'), false, INFO);
            return true;
        }

        Session::addMessageAfterRedirect(__('Error updating configuration', 'formmodal'), false, ERROR);
        return false;
    }

    /**
     * Delete a configuration
     *
     * @param int $id Configuration ID
     * @return bool Success
     */
    public static function deleteConfig($id)
    {
        global $DB;

        if (empty($id)) {
            Session::addMessageAfterRedirect(__('ID is required', 'formmodal'), false, ERROR);
            return false;
        }

        $result = $DB->delete(
            'glpi_plugin_formmodal_configs',
            ['id' => $id]
        );

        if ($result) {
            Session::addMessageAfterRedirect(__('Configuration deleted successfully', 'formmodal'), false, INFO);
            return true;
        }

        Session::addMessageAfterRedirect(__('Error deleting configuration', 'formmodal'), false, ERROR);
        return false;
    }

    /**
     * Display configuration list
     *
     * @return void
     */
    public static function showConfigList()
    {
        global $CFG_GLPI;

        if (!Config::canUpdate()) {
            return;
        }

        $configs = self::getAllConfigs();
        $number = count($configs);

        echo "<div class='center' style='margin-top: 20px;'>";
        echo "<table class='tab_cadre_fixehov'>";
        echo "<tr class='noHover'>";
        echo "<th colspan='5'>" . __('Form Modal Configurations', 'formmodal') . " ($number)</th>";
        echo "</tr>";

        if ($number > 0) {
            echo "<tr>";
            echo "<th>" . __('ID') . "</th>";
            echo "<th>" . __('Form ID', 'formmodal') . "</th>";
            echo "<th>" . __('Message', 'formmodal') . "</th>";
            echo "<th>" . __('Active', 'formmodal') . "</th>";
            echo "<th>" . __('Actions') . "</th>";
            echo "</tr>";

            foreach ($configs as $data) {
                echo "<tr class='tab_bg_1'>";
                echo "<td>" . $data['id'] . "</td>";
                echo "<td>" . $data['form_id'] . "</td>";
                echo "<td>" . substr(htmlspecialchars(strip_tags($data['message'])), 0, 100) . "...</td>";
                echo "<td>" . Dropdown::getYesNo($data['is_active']) . "</td>";
                echo "<td>";
                echo "<a href='" . $CFG_GLPI['root_doc'] . "/plugins/formmodal/front/config.form.php?id=" . $data['id'] . "' class='btn btn-sm btn-primary'>";
                echo "<i class='fas fa-edit'></i> " . __('Edit');
                echo "</a> ";
                echo "<a href='" . $CFG_GLPI['root_doc'] . "/plugins/formmodal/front/config.form.php?delete=1&id=" . $data['id'] . "' class='btn btn-sm btn-danger' onclick='return confirm(\"" . __('Are you sure?') . "\")'>";
                echo "<i class='fas fa-trash'></i> " . __('Delete');
                echo "</a>";
                echo "</td>";
                echo "</tr>";
            }
        } else {
            echo "<tr class='tab_bg_1'>";
            echo "<td colspan='5' class='center'>" . __('No item found') . "</td>";
            echo "</tr>";
        }

        echo "</table>";
        echo "</div>";
    }

    /**
     * Display configuration form
     *
     * @param int $id Configuration ID (0 for new)
     * @return void
     */
    public static function showConfigForm($id = 0)
    {
        global $CFG_GLPI;

        if (!Config::canUpdate()) {
            return;
        }

        $config = [];
        if ($id > 0) {
            $config = self::getConfigById($id);
            if (!$config) {
                echo "<div class='center'><p>" . __('Configuration not found', 'formmodal') . "</p></div>";
                return;
            }
        } else {
            $config = [
                'id' => 0,
                'form_id' => '',
                'message' => '',
                'is_active' => 1
            ];
        }

        echo "<div class='center'>";
        echo "<form name='form' method='post' action='" . $CFG_GLPI['root_doc'] . "/plugins/formmodal/front/config.form.php'>";
        echo Html::hidden('_glpi_csrf_token', ['value' => Session::getNewCSRFToken()]);

        if ($id > 0) {
            echo Html::hidden('id', ['value' => $id]);
        }

        echo "<table class='tab_cadre_fixe'>";
        echo "<tr class='tab_bg_1'>";
        echo "<th colspan='2'>" . ($id > 0 ? __('Edit Configuration', 'formmodal') : __('Add new configuration', 'formmodal')) . "</th>";
        echo "</tr>";

        // Form ID
        echo "<tr class='tab_bg_1'>";
        echo "<td width='30%'>" . __('Form ID', 'formmodal') . " *</td>";
        echo "<td>";
        echo "<input type='text' name='form_id' value='" . htmlspecialchars($config['form_id']) . "' 
              size='50' required='required' 
              placeholder='" . __('Example: ticket-form, asset-form-123', 'formmodal') . "'>";
        echo "</td>";
        echo "</tr>";

        // Active
        echo "<tr class='tab_bg_1'>";
        echo "<td>" . __('Active', 'formmodal') . "</td>";
        echo "<td>";
        Dropdown::showYesNo('is_active', $config['is_active']);
        echo "</td>";
        echo "</tr>";

        // Message
        echo "<tr class='tab_bg_1'>";
        echo "<td>" . __('Message', 'formmodal') . " *</td>";
        echo "<td>";
        Html::textarea([
            'name' => 'message',
            'value' => $config['message'],
            'editor_id' => 'message',
            'enable_richtext' => true,
            'enable_images' => false,
            'cols' => 100,
            'rows' => 15
        ]);
        echo "</td>";
        echo "</tr>";

        // Buttons
        echo "<tr class='tab_bg_1'>";
        echo "<td colspan='2' class='center'>";
        if ($id > 0) {
            echo "<input type='submit' name='update_config' value='" . __('Save') . "' class='btn btn-primary'>";
        } else {
            echo "<input type='submit' name='add_config' value='" . __('Add') . "' class='btn btn-primary'>";
        }
        echo " ";
        echo "<a href='" . $CFG_GLPI['root_doc'] . "/plugins/formmodal/front/config.form.php' class='btn btn-secondary'>" . __('Cancel') . "</a>";
        echo "</td>";
        echo "</tr>";

        echo "</table>";
        Html::closeForm();
        echo "</div>";
    }

    // Hook onTicketAdd removed - using SQL trigger instead
}
