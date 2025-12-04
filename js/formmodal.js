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

(function() {
    'use strict';

    // Get plugin configurations
    let formModalConfigs = [];

    // Function to load configurations from backend
    function loadConfigurations() {
        const pluginRoot = '../plugins/formmodal';
        
        fetch(pluginRoot + '/ajax/get_configs.php')
            .then(response => response.json())
            .then(data => {
                if (data.success && Array.isArray(data.configs)) {
                    formModalConfigs = data.configs;
                    initFormListeners();
                }
            })
            .catch(error => {
                console.error('FormModal: Error loading configurations:', error);
            });
    }

    // Function to show modal with message
    function showFormModal(message) {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'formmodal-overlay';
        overlay.innerHTML = `
            <div class="formmodal-container">
                <div class="formmodal-header">
                    <h2 class="formmodal-title">
                        <i class="ti ti-info-circle"></i>
                        <span>Información</span>
                    </h2>
                    <button class="formmodal-close" aria-label="Cerrar">
                        <i class="ti ti-x"></i>
                    </button>
                </div>
                <div class="formmodal-body">
                    ${message}
                </div>
                <div class="formmodal-footer">
                    <button class="formmodal-btn formmodal-btn-primary">
                        <i class="ti ti-check"></i>
                        <span>Aceptar</span>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Add animation
        setTimeout(() => {
            overlay.classList.add('formmodal-active');
        }, 10);

        // Close handlers
        const closeModal = () => {
            overlay.classList.remove('formmodal-active');
            setTimeout(() => {
                document.body.removeChild(overlay);
            }, 300);
        };

        overlay.querySelector('.formmodal-close').addEventListener('click', closeModal);
        overlay.querySelector('.formmodal-btn-primary').addEventListener('click', closeModal);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal();
            }
        });

        // Close on ESC key
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    // Function to check if form should trigger modal
    function checkFormSubmit(form) {
        const formId = form.id || form.getAttribute('data-form-id') || form.getAttribute('name');
        
        if (!formId) {
            return;
        }

        // Find matching configuration
        const config = formModalConfigs.find(c => c.form_id === formId);
        
        if (config && config.message) {
            // Store the configuration to show after submission
            sessionStorage.setItem('formmodal_pending', JSON.stringify(config));
        }
    }

    // Function to show pending modal after page load (after redirect)
    function checkPendingModal() {
        const pending = sessionStorage.getItem('formmodal_pending');
        
        if (pending) {
            try {
                const config = JSON.parse(pending);
                sessionStorage.removeItem('formmodal_pending');
                
                // Show modal after a short delay to ensure page is fully loaded
                setTimeout(() => {
                    showFormModal(config.message);
                }, 500);
            } catch (e) {
                console.error('FormModal: Error parsing pending modal:', e);
                sessionStorage.removeItem('formmodal_pending');
            }
        }
    }

    // Initialize form listeners
    function initFormListeners() {
        // Listen to all form submissions
        document.addEventListener('submit', function(e) {
            const form = e.target;
            if (form.tagName === 'FORM') {
                checkFormSubmit(form);
            }
        }, true);

        // Also listen to AJAX form submissions (if using GLPI's AJAX system)
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
            return originalFetch.apply(this, args).then(response => {
                // Check if this was a form submission
                if (args[0] && typeof args[0] === 'string') {
                    const url = args[0];
                    formModalConfigs.forEach(config => {
                        if (url.includes(config.form_id)) {
                            sessionStorage.setItem('formmodal_pending', JSON.stringify(config));
                        }
                    });
                }
                return response;
            });
        };
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            loadConfigurations();
            checkPendingModal();
        });
    } else {
        loadConfigurations();
        checkPendingModal();
    }

})();

