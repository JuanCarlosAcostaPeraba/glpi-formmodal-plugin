<?php

/**
 * -------------------------------------------------------------------------
 * FormModal plugin for GLPI
 * -------------------------------------------------------------------------
 */

// GLPI 10.x requires manual include, GLPI 11.x auto-loads
if (!defined('GLPI_ROOT')) {
    include('../../../inc/includes.php');
}

global $CFG_GLPI;

Session::checkRight('config', UPDATE);

// Handle form submissions
if (isset($_POST['add_config'])) {
    $result = PluginFormmodalConfig::addConfig($_POST);
    if ($result) {
        Html::redirect($CFG_GLPI['root_doc'] . '/plugins/formmodal/front/config.form.php');
    } else {
        Html::back();
    }
} elseif (isset($_POST['update_config'])) {
    $result = PluginFormmodalConfig::updateConfig($_POST);
    Html::back();
} elseif (isset($_GET['delete']) && isset($_GET['id'])) {
    $result = PluginFormmodalConfig::deleteConfig($_GET['id']);
    Html::redirect($CFG_GLPI['root_doc'] . '/plugins/formmodal/front/config.form.php');
} else {
    // Display page
    Html::header(
        __('Form Modal Messages', 'formmodal'),
        $CFG_GLPI['root_doc'] . '/plugins/formmodal/front/config.form.php',
        "config",
        "plugins"
    );

    // Show add new button
    if (!isset($_GET['id'])) {
        echo "<div class='center' style='margin: 20px 0;'>";
        echo "<a href='" . $CFG_GLPI['root_doc'] . "/plugins/formmodal/front/config.form.php?id=0' class='btn btn-primary'>";
        echo "<i class='fas fa-plus'></i> " . __('Add new configuration', 'formmodal');
        echo "</a>";
        echo "</div>";
    }

    // Show form if ID is set
    if (isset($_GET['id'])) {
        PluginFormmodalConfig::showConfigForm($_GET['id']);

        echo "<div class='center' style='margin-top: 20px;'>";
        echo "<a href='" . $CFG_GLPI['root_doc'] . "/plugins/formmodal/front/config.form.php' class='btn btn-secondary'>";
        echo "<i class='fas fa-arrow-left'></i> " . __('Back to list');
        echo "</a>";
        echo "</div>";
    }

    // Show list of configurations
    PluginFormmodalConfig::showConfigList();

    Html::footer();
}
