/**
 * -------------------------------------------------------------------------
 * FormModal plugin for GLPI
 * Backend Implementation with SQL Trigger - Single check on page load
 * -------------------------------------------------------------------------
 */

(function () {
    'use strict';

    let modalShown = false;

    // Function to decode HTML entities
    function decodeHtmlEntities(text) {
        const textArea = document.createElement('textarea');
        textArea.innerHTML = text;
        return textArea.value;
    }

    // Function to show modal
    function showFormModal(message) {
        if (modalShown) {
            return;
        }

        modalShown = true;

        const decodedMessage = decodeHtmlEntities(message);

        if (!document.body) {
            setTimeout(() => showFormModal(message), 100);
            return;
        }

        const overlay = document.createElement('div');
        overlay.className = 'formmodal-overlay';
        overlay.innerHTML = `
            <div class="formmodal-container">
                <div class="formmodal-header">
                    <h2 class="formmodal-title">
                        <i class="ti ti-alert-triangle" style="color:#e63946;font-size:2em;vertical-align:middle;"></i>
                        <span style="color:#e63946;font-weight:bold;font-size:1.4em;margin-left:0.5em;text-transform:uppercase;letter-spacing:2px;">¡ATENCIÓN!</span>
                    </h2>
                    <button class="formmodal-close" aria-label="Cerrar">
                        <i class="ti ti-x"></i>
                    </button>
                </div>
                <div class="formmodal-body">
                    ${decodedMessage}
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

        setTimeout(() => {
            overlay.classList.add('formmodal-active');
        }, 10);

        const closeModal = () => {
            overlay.classList.remove('formmodal-active');
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
                modalShown = false;
            }, 300);
        };

        overlay.querySelector('.formmodal-close').addEventListener('click', closeModal);
        overlay.querySelector('.formmodal-btn-primary').addEventListener('click', closeModal);

        // Prevent closing by clicking outside or pressing ESC
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                e.stopPropagation();
            }
        });
    }

    // Function to process message with replacements and special logic
    function processMessage(configMessage, ticketId, departmentName) {
        // If department name contains "ITT" or "IB", use special message
        if (departmentName && (departmentName.includes('ITT') || departmentName.includes('IB'))) {
            let specialMessage = 'Contacte con la centralita para contactar con la <strong>[NOMBRE_DEPARTAMENTO]</strong>.';
            specialMessage = specialMessage.replace(/\[NOMBRE_DEPARTAMENTO\]/g, departmentName);
            if (ticketId) {
                specialMessage = specialMessage.replace(/\[ID_DE_INCIDENCIA\]/g, ticketId);
            }
            return specialMessage;
        }

        // If department name contains "Jefe/a de día o Supervisor/a de guardia", use special message
        if (departmentName && (departmentName.includes('Jefe/a de día o Supervisor/a de guardia') || departmentName.includes('Jefe de día o Supervisor de guardia'))) {
            let specialMessage = 'Debe contactar con el <strong>[NOMBRE_DEPARTAMENTO]</strong> para que tramite la incidencia a la <strong>Guardia de Microinformática</strong> a través de la centralita.';
            specialMessage = specialMessage.replace(/\[NOMBRE_DEPARTAMENTO\]/g, departmentName);
            if (ticketId) {
                specialMessage = specialMessage.replace(/\[ID_DE_INCIDENCIA\]/g, ticketId);
            }
            return specialMessage;
        }

        // Otherwise, use the configured message with normal replacements
        let message = configMessage;
        if (ticketId) {
            message = message.replace(/\[ID_DE_INCIDENCIA\]/g, ticketId);
        }
        if (departmentName) {
            message = message.replace(/\[NOMBRE_DEPARTAMENTO\]/g, departmentName);
        }
        return message;
    }

    // Function to check for pending modal from backend
    function checkPendingModal() {
        if (modalShown) {
            return;
        }

        fetch('/plugins/formmodal/ajax/get_pending_modal.php')
            .then(response => response.json())
            .then(data => {
                if (data.success && data.has_pending) {
                    // Process message with data from backend
                    const message = processMessage(
                        data.message,
                        data.ticket_id,
                        data.department_name
                    );
                    // Show modal
                    showFormModal(message);
                }
            })
            .catch(err => {
                // Silently fail
            });
    }

    // Function to check if we're on a valid form page
    function isValidFormPage() {
        const path = window.location.pathname;
        return /\/Form\/Render\/\d+/.test(path);
    }

    // Setup MutationObserver to detect GLPI success message
    function setupSuccessMessageObserver() {
        if (!isValidFormPage()) {
            return;
        }

        // Observer to detect when success message appears
        const observer = new MutationObserver((mutations) => {
            // Look for success notification with ticket link
            const ticketLink = document.querySelector('a[href*="ticket.form.php?id="]');
            if (ticketLink && !modalShown) {
                // Success message detected, check for pending modal
                // Use a small delay to ensure backend has processed the trigger
                setTimeout(() => {
                    checkPendingModal();
                }, 500);
            }
        });

        // Start observing the document body for changes
        if (document.body) {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        } else {
            // Wait for body to be available
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    observer.observe(document.body, {
                        childList: true,
                        subtree: true
                    });
                });
            }
        }
    }

    // Initialize: Setup observer and check for pending modals on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setupSuccessMessageObserver();
            // Also check once on load (for page reloads)
            setTimeout(checkPendingModal, 500);
        });
    } else {
        setupSuccessMessageObserver();
        // Also check once on load (for page reloads)
        setTimeout(checkPendingModal, 500);
    }

})();
