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

include('../../../inc/includes.php');

header('Content-Type: application/json');

try {
    $configs = PluginFormmodalConfig::getAllActiveConfigs();
    
    echo json_encode([
        'success' => true,
        'configs' => $configs
    ]);
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

