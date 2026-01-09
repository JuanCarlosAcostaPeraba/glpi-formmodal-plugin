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

(function () {
    'use strict';

    // Get plugin configurations
    let formModalConfigs = [];

    // Function to load configurations from backend
    function loadConfigurations() {
        // Usar ruta absoluta desde la raíz de GLPI
        const ajaxUrl = '/plugins/formmodal/ajax/get_configs.php';

        fetch(ajaxUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.success && Array.isArray(data.configs)) {
                    formModalConfigs = data.configs;
                    initFormListeners();
                }
            })
            .catch(error => {
                // Silently fail - configurations might not be available yet
            });
    }

    // Function to decode HTML entities
    function decodeHtmlEntities(text) {
        const textArea = document.createElement('textarea');
        textArea.innerHTML = text;
        return textArea.value;
    }

    // Function to show modal with message
    function showFormModal(message) {
        // Check if modal already exists in DOM (prevent duplicates)
        const existingModal = document.querySelector('.formmodal-overlay');
        if (existingModal) {
            return;
        }

        // Decode HTML entities to show proper HTML
        const decodedMessage = decodeHtmlEntities(message);

        // Check if body exists
        if (!document.body) {
            setTimeout(() => showFormModal(message), 100);
            return;
        }

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
    }

    // Function to extract form ID from URL path (GLPI 11 Form Creator format: /Form/Render/36)
    function extractFormIdFromPath() {
        const path = window.location.pathname;
        // Match patterns like /Form/Render/36 or /Form/SubmitAnswers/36
        const match = path.match(/\/Form\/(?:Render|SubmitAnswers|View)\/(\d+)/);
        if (match) {
            return match[1];
        }
        return null;
    }

    // Function to check if form should trigger modal
    function checkFormSubmit(form) {
        // Obtener IDs posibles del formulario
        const htmlFormId = form.id || form.getAttribute('data-form-id') || form.getAttribute('name');

        // Extraer ID de la ruta de la URL (GLPI 11 Form Creator: /Form/Render/36)
        const pathFormId = extractFormIdFromPath();

        // Obtener el ID del parámetro de URL (para formularios antiguos)
        const urlParams = new URLSearchParams(window.location.search);
        const urlFormId = urlParams.get('id');

        // También buscar en el hash de la URL (algunos formularios usan #id)
        const hashMatch = window.location.hash.match(/[#&]id=(\d+)/);
        const hashFormId = hashMatch ? hashMatch[1] : null;

        // Buscar configuración que coincida con el ID de la URL o el ID del HTML
        let config = null;

        // Primero intentar con el ID de la ruta (GLPI 11 Form Creator - PRIORIDAD)
        if (pathFormId) {
            config = formModalConfigs.find(c => c.form_id === pathFormId || c.form_id === String(pathFormId));
        }

        // Si no se encontró, intentar con el ID de la query string
        if (!config && urlFormId) {
            config = formModalConfigs.find(c => c.form_id === urlFormId || c.form_id === String(urlFormId));
        }

        // Si no se encontró, intentar con el hash
        if (!config && hashFormId) {
            config = formModalConfigs.find(c => c.form_id === hashFormId || c.form_id === String(hashFormId));
        }

        // Si no se encontró por URL, intentar con el ID del HTML
        if (!config && htmlFormId) {
            config = formModalConfigs.find(c => c.form_id === htmlFormId || c.form_id === String(htmlFormId));
        }

        // También intentar buscar por action o cualquier atributo relevante
        if (!config && form.action) {
            const actionUrl = form.action;
            // Extraer ID de la acción también (puede ser /Form/SubmitAnswers/36)
            const actionMatch = actionUrl.match(/\/Form\/(?:SubmitAnswers|Render|View)\/(\d+)/);
            if (actionMatch) {
                const actionFormId = actionMatch[1];
                config = formModalConfigs.find(c => c.form_id === actionFormId || c.form_id === String(actionFormId));
            } else {
                config = formModalConfigs.find(c => actionUrl.includes(c.form_id));
            }
        }

        // Para FormCreator específicamente, buscar en campos ocultos del formulario
        if (!config) {
            const hiddenInputs = form.querySelectorAll('input[type="hidden"]');
            hiddenInputs.forEach(input => {
                if (input.name === 'formcreator_form' || input.name === 'id' || input.name === 'form_id' || input.name === 'forms_id') {
                    const formId = input.value;
                    config = formModalConfigs.find(c => c.form_id === formId || c.form_id === String(formId));
                }
            });
        }

        if (config && config.message) {
            // Store the configuration to show after submission
            sessionStorage.setItem('formmodal_pending', JSON.stringify(config));

            // Set up observer to detect when success message appears
            setupSuccessMessageObserver(config);
        }
    }

    // Function to extract ticket/item ID from URL (e.g., /front/ticket.form.php?id=371600)
    function extractItemIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }

    // Function to setup MutationObserver to detect success messages
    function setupSuccessMessageObserver(config) {
        // Use provided config or get from sessionStorage
        if (!config) {
            const pending = sessionStorage.getItem('formmodal_pending');
            if (pending) {
                try {
                    config = JSON.parse(pending);
                } catch (e) {
                    return;
                }
            } else {
                return;
            }
        }

        let observerActive = true;
        let modalShown = false;
        let processing = false;
        let intervalCheck = null;

        // Create observer to watch for success messages
        const observer = new MutationObserver((mutations) => {
            // Early return checks - do these first to prevent any processing
            if (modalShown || !observerActive || processing) {
                return;
            }

            // Also check if modal already exists in DOM (double safety)
            if (document.querySelector('.formmodal-overlay')) {
                modalShown = true;
                observerActive = false;
                observer.disconnect();
                if (intervalCheck) {
                    clearInterval(intervalCheck);
                    intervalCheck = null;
                }
                return;
            }

            // Look for success messages or ticket links in the DOM
            const ticketLinks = document.querySelectorAll('a[href*="ticket.form.php?id="]');
            const successMessages = document.querySelectorAll('.alert-success, .toast-success, [class*="success"]');

            if (ticketLinks.length > 0 || successMessages.length > 0) {
                // Double-check flags after DOM query (race condition protection)
                if (modalShown || processing) {
                    return;
                }

                // Set flags IMMEDIATELY before any other processing to prevent race conditions
                processing = true;
                modalShown = true;
                observerActive = false;

                // Disconnect observer immediately
                observer.disconnect();

                // Stop interval check if it exists
                if (intervalCheck) {
                    clearInterval(intervalCheck);
                    intervalCheck = null;
                }

                // Use requestAnimationFrame to process asynchronously and ensure only one execution
                requestAnimationFrame(() => {
                    // Double-check one more time in case of race condition
                    if (document.querySelector('.formmodal-overlay')) {
                        return;
                    }

                    // Extract ticket ID from link if available
                    let ticketId = null;
                    if (ticketLinks.length > 0) {
                        const href = ticketLinks[0].getAttribute('href');
                        const match = href.match(/id=(\d+)/);
                        if (match) {
                            ticketId = match[1];
                        }
                    }

                    let message = config.message;
                    if (ticketId) {
                        message = message.replace(/\[ID_DE_INCIDENCIA\]/g, ticketId);
                    }

                    // Wait a bit for GLPI's message to fully appear
                    setTimeout(() => {
                        showFormModal(message);
                        sessionStorage.removeItem('formmodal_pending');
                        sessionStorage.removeItem('formmodal_current_config');
                    }, 1000);
                });
            }
        });

        // Start observing
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Also check periodically as fallback
        let checkCount = 0;
        const maxChecks = 30; // Check for 15 seconds (30 * 500ms)
        intervalCheck = setInterval(() => {
            checkCount++;

            const ticketLinks = document.querySelectorAll('a[href*="ticket.form.php?id="]');
            if (ticketLinks.length > 0 && !modalShown) {
                // Set flag immediately to prevent duplicate
                modalShown = true;
                clearInterval(intervalCheck);
                observer.disconnect();

                const href = ticketLinks[0].getAttribute('href');
                const match = href.match(/id=(\d+)/);
                let ticketId = match ? match[1] : null;

                let message = config.message;
                if (ticketId) {
                    message = message.replace(/\[ID_DE_INCIDENCIA\]/g, ticketId);
                }

                setTimeout(() => {
                    showFormModal(message);
                    sessionStorage.removeItem('formmodal_pending');
                    sessionStorage.removeItem('formmodal_current_config');
                }, 1000);
            } else if (checkCount >= maxChecks) {
                clearInterval(intervalCheck);
                observer.disconnect();
            }
        }, 500);
    }

    // Function to check if we're on a ticket/item page after form submission
    function isItemPageAfterSubmit() {
        const path = window.location.pathname;
        // Check if we're on a ticket form page, or other item pages that might be created from forms
        return path.includes('/front/ticket.form.php') ||
            path.includes('/front/') && path.includes('.form.php');
    }

    // Function to show pending modal after page load (after redirect)
    function checkPendingModal() {
        const pending = sessionStorage.getItem('formmodal_pending');

        if (pending) {
            try {
                const config = JSON.parse(pending);

                // Check if we're on a form page
                const currentPathFormId = extractFormIdFromPath();
                const isFormPage = currentPathFormId && formModalConfigs.some(c =>
                    c.form_id === currentPathFormId || c.form_id === String(currentPathFormId)
                );

                // Check if we're on an item page (ticket, etc.) after submit
                const isItemPage = isItemPageAfterSubmit();
                const itemId = extractItemIdFromUrl();

                // Show modal if:
                // 1. We're on an item page (ticket created) - this means form was submitted successfully
                // 2. OR we're not on the form page anymore (redirected somewhere else)
                if (isItemPage || !isFormPage) {
                    sessionStorage.removeItem('formmodal_pending');
                    sessionStorage.removeItem('formmodal_current_config'); // Clean up

                    // Replace placeholders in message if we have item ID
                    let message = config.message;
                    if (itemId) {
                        message = message.replace(/\[ID_DE_INCIDENCIA\]/g, itemId);
                    }

                    // Show modal after a short delay to ensure page is fully loaded
                    let attempts = 0;
                    const maxAttempts = 10;
                    const showModal = () => {
                        attempts++;
                        if (document.body && document.body.offsetHeight > 0) {
                            showFormModal(message);
                        } else if (attempts < maxAttempts) {
                            setTimeout(showModal, 200);
                        } else {
                            showFormModal(message);
                        }
                    };
                    // Wait a bit longer if we're on an item page to let GLPI's notification appear first
                    const delay = isItemPage ? 1500 : 300;
                    setTimeout(showModal, delay);
                }
            } catch (e) {
                sessionStorage.removeItem('formmodal_pending');
                sessionStorage.removeItem('formmodal_current_config');
            }
        }
    }

    // Initialize form listeners
    function initFormListeners() {
        // Get current form ID from URL path
        const currentPathFormId = extractFormIdFromPath();

        // If we're on a form page that matches our config, set up listeners
        if (currentPathFormId) {
            const matchingConfig = formModalConfigs.find(c => c.form_id === currentPathFormId || c.form_id === String(currentPathFormId));
            if (matchingConfig) {
                // Store config immediately for this page
                sessionStorage.setItem('formmodal_current_config', JSON.stringify(matchingConfig));

                // Set up MutationObserver to detect when GLPI shows success message
                setupSuccessMessageObserver(matchingConfig);
            }
        }

        // Listen to all form submissions
        document.addEventListener('submit', function (e) {
            const form = e.target;
            if (form.tagName === 'FORM') {
                checkFormSubmit(form);
            }
        }, true);

        // Also intercept form submissions by clicking submit buttons
        document.addEventListener('click', function (e) {
            const target = e.target;
            // Check if it's a submit button or button inside a form
            if (target.type === 'submit' || (target.tagName === 'BUTTON' && target.closest('form'))) {
                const form = target.closest('form');
                if (form) {
                    // Small delay to let the form submit event fire first
                    setTimeout(() => {
                        checkFormSubmit(form);
                    }, 100);
                }
            }
        }, true);

        // Also listen to AJAX form submissions (if using GLPI's AJAX system)
        const originalFetch = window.fetch;
        window.fetch = function (...args) {
            const url = (args[0] && typeof args[0] === 'string') ? args[0] :
                (args[0] && args[0].url) ? args[0].url : null;

            if (url) {
                // Check if it's a SubmitAnswers request (check both full URL and path)
                const isSubmitAnswers = url.includes('/Form/SubmitAnswers') ||
                    url.includes('SubmitAnswers') ||
                    (typeof args[0] === 'object' && args[0].url && args[0].url.includes('SubmitAnswers'));

                if (isSubmitAnswers) {
                    // Get config from pending or current config
                    let config = null;
                    const pendingConfig = sessionStorage.getItem('formmodal_pending');
                    const currentConfig = sessionStorage.getItem('formmodal_current_config');

                    if (pendingConfig) {
                        try {
                            config = JSON.parse(pendingConfig);
                        } catch (e) {
                            // Silently fail
                        }
                    }

                    if (!config && currentConfig) {
                        try {
                            config = JSON.parse(currentConfig);
                        } catch (e) {
                            // Silently fail
                        }
                    }

                    // If we have a config, process the response
                    if (config) {
                        return originalFetch.apply(this, args).then(response => {
                            // Clone response to read it without consuming it
                            const responseClone = response.clone();

                            // Try to extract ticket ID from response
                            responseClone.text().then(text => {
                                let ticketId = null;

                                // Method 1: Look for ticket.form.php?id=XXXX in the response
                                const ticketMatch = text.match(/ticket\.form\.php\?id=(\d+)/);
                                if (ticketMatch) {
                                    ticketId = ticketMatch[1];
                                }

                                // Method 2: Look for data-item-id or similar attributes
                                if (!ticketId) {
                                    const itemIdMatch = text.match(/data-item-id=["'](\d+)["']/);
                                    if (itemIdMatch) {
                                        ticketId = itemIdMatch[1];
                                    }
                                }

                                // Method 3: Look for "id=" followed by numbers in various patterns
                                if (!ticketId) {
                                    const idPatterns = [
                                        /"id":\s*(\d+)/,
                                        /id["']?\s*[:=]\s*["']?(\d+)/,
                                        /\/ticket\/.*?(\d+)/,
                                    ];
                                    for (const pattern of idPatterns) {
                                        const match = text.match(pattern);
                                        if (match) {
                                            ticketId = match[1];
                                            break;
                                        }
                                    }
                                }

                                // Method 4: Look in the DOM after a delay (GLPI might inject the message)
                                const checkDOM = () => {
                                    setTimeout(() => {
                                        if (!ticketId) {
                                            // Look for links to ticket.form.php in the page
                                            const ticketLinks = document.querySelectorAll('a[href*="ticket.form.php?id="]');
                                            if (ticketLinks.length > 0) {
                                                const href = ticketLinks[0].getAttribute('href');
                                                const match = href.match(/id=(\d+)/);
                                                if (match) {
                                                    ticketId = match[1];
                                                }
                                            }
                                        }

                                        // Show modal with ticket ID if found
                                        let message = config.message;
                                        if (ticketId) {
                                            message = message.replace(/\[ID_DE_INCIDENCIA\]/g, ticketId);
                                        }

                                        // Wait a bit for GLPI's success message to appear
                                        setTimeout(() => {
                                            showFormModal(message);
                                            sessionStorage.removeItem('formmodal_pending');
                                            sessionStorage.removeItem('formmodal_current_config');
                                        }, 1500);
                                    }, 500);
                                };

                                checkDOM();
                            }).catch(err => {
                                // Show modal anyway without ticket ID
                                setTimeout(() => {
                                    showFormModal(config.message);
                                    sessionStorage.removeItem('formmodal_pending');
                                    sessionStorage.removeItem('formmodal_current_config');
                                }, 1500);
                            });

                            return response;
                        });
                    }
                }
            }

            return originalFetch.apply(this, args).then(response => {
                // Check if this was a form submission
                if (args[0] && typeof args[0] === 'string') {
                    const url = args[0];

                    // Extract form ID from fetch URL (GLPI 11 format: /Form/SubmitAnswers/36)
                    const urlMatch = url.match(/\/Form\/(?:SubmitAnswers|Render|View)\/(\d+)/);
                    let config = null;

                    if (urlMatch) {
                        const fetchFormId = urlMatch[1];
                        config = formModalConfigs.find(c => c.form_id === fetchFormId || c.form_id === String(fetchFormId));
                    } else if (url.includes('/Form/SubmitAnswers')) {
                        // If it's a SubmitAnswers request, use the current config we stored
                        const currentConfig = sessionStorage.getItem('formmodal_current_config');
                        if (currentConfig) {
                            try {
                                config = JSON.parse(currentConfig);
                            } catch (e) {
                                // Silently fail
                            }
                        }
                    }

                    // If we have a config and it's a SubmitAnswers request, show modal after response
                    if (config && url.includes('/Form/SubmitAnswers')) {
                        // Clone response to read it without consuming it
                        const responseClone = response.clone();

                        // Try to extract ticket ID from response
                        responseClone.text().then(text => {
                            // Try to extract ticket ID from the response
                            // GLPI might return HTML with a link like /front/ticket.form.php?id=371600
                            let ticketId = null;

                            // Method 1: Look for ticket.form.php?id=XXXX in the response
                            const ticketMatch = text.match(/ticket\.form\.php\?id=(\d+)/);
                            if (ticketMatch) {
                                ticketId = ticketMatch[1];
                            }

                            // Method 2: Look for data-item-id or similar attributes
                            if (!ticketId) {
                                const itemIdMatch = text.match(/data-item-id=["'](\d+)["']/);
                                if (itemIdMatch) {
                                    ticketId = itemIdMatch[1];
                                }
                            }

                            // Method 3: Look in the DOM after a delay (GLPI might inject the message)
                            setTimeout(() => {
                                // Check if ticket ID was found in response, if not, try to find it in DOM
                                if (!ticketId) {
                                    // Look for links to ticket.form.php in the page
                                    const ticketLinks = document.querySelectorAll('a[href*="ticket.form.php?id="]');
                                    if (ticketLinks.length > 0) {
                                        const href = ticketLinks[0].getAttribute('href');
                                        const match = href.match(/id=(\d+)/);
                                        if (match) {
                                            ticketId = match[1];
                                        }
                                    }
                                }

                                // Show modal with ticket ID if found
                                let message = config.message;
                                if (ticketId) {
                                    message = message.replace(/\[ID_DE_INCIDENCIA\]/g, ticketId);
                                }

                                // Wait a bit for GLPI's success message to appear
                                setTimeout(() => {
                                    showFormModal(message);
                                    sessionStorage.removeItem('formmodal_pending');
                                    sessionStorage.removeItem('formmodal_current_config');
                                }, 1500);
                            }, 500);
                        }).catch(err => {
                            // Show modal anyway without ticket ID
                            setTimeout(() => {
                                showFormModal(config.message);
                                sessionStorage.removeItem('formmodal_pending');
                                sessionStorage.removeItem('formmodal_current_config');
                            }, 1500);
                        });
                    } else if (config) {
                        // Store for later (redirect case)
                        sessionStorage.setItem('formmodal_pending', JSON.stringify(config));
                    }
                }
                return response;
            });
        };

    }

    // Initialize when DOM is ready
    // Check for pending modal immediately (in case page already loaded)
    checkPendingModal();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            loadConfigurations();
            // Check again after DOM is loaded
            setTimeout(() => {
                checkPendingModal();
            }, 100);
        });
    } else {
        loadConfigurations();
        // Check again after a short delay
        setTimeout(() => {
            checkPendingModal();
        }, 100);
    }

    // Also check after window load (all resources loaded)
    window.addEventListener('load', () => {
        setTimeout(() => checkPendingModal(), 500);
    });

    // Also listen for page visibility changes (in case of SPA navigation)
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            setTimeout(() => checkPendingModal(), 200);
        }
    });

    // Listen for popstate (back/forward navigation)
    window.addEventListener('popstate', () => {
        setTimeout(() => checkPendingModal(), 200);
    });

    // Monitor URL changes (for SPA navigation)
    let lastUrl = window.location.href;
    setInterval(() => {
        const currentUrl = window.location.href;
        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            setTimeout(() => checkPendingModal(), 300);
        }
    }, 500);

})();

