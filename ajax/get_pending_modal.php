<?php

/**
 * -------------------------------------------------------------------------
 * FormModal plugin for GLPI
 * Get pending modal from database
 * -------------------------------------------------------------------------
 */

include('../../../inc/includes.php');

header('Content-Type: application/json');

global $DB;

// Get current user ID
$user_id = Session::getLoginUserID();

if (!$user_id) {
    echo json_encode([
        'success' => false,
        'error' => 'Not logged in'
    ]);
    exit;
}

// The trigger stores session_id as 'user_{user_id}', so we match by current user
$user_session_pattern = 'user_' . $user_id;

// Buscar modales pendientes para este usuario que no se hayan mostrado
$iterator = $DB->request([
    'FROM' => 'glpi_plugin_formmodal_pending',
    'WHERE' => [
        'session_id' => $user_session_pattern,
        'shown' => 0
    ],
    'ORDER' => 'created_at DESC',
    'LIMIT' => 1
]);

// Get first result from iterator
$data = null;
foreach ($iterator as $row) {
    $data = $row;
    break; // Only need first result
}

if ($data !== null) {
    // Marcar como mostrado
    $DB->update('glpi_plugin_formmodal_pending', [
        'shown' => 1
    ], [
        'id' => $data['id']
    ]);

    echo json_encode([
        'success' => true,
        'has_pending' => true,
        'form_id' => $data['form_id'] ?? null,
        'ticket_id' => $data['ticket_id'] ?? null,
        'department_name' => $data['department_name'] ?? null,
        'message' => $data['message'] ?? null
    ]);
} else {
    echo json_encode([
        'success' => true,
        'has_pending' => false
    ]);
}
