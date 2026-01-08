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

        console.log('FormModal: Loading configurations from', ajaxUrl);

        fetch(ajaxUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('FormModal: Configurations loaded:', data);
                if (data.success && Array.isArray(data.configs)) {
                    formModalConfigs = data.configs;
                    console.log('FormModal: Active configurations:', formModalConfigs.length);
                    initFormListeners();
                } else {
                    console.warn('FormModal: No configurations found or invalid response');
                }
            })
            .catch(error => {
                console.error('FormModal: Error loading configurations:', error);
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
        console.log('FormModal: showFormModal called with message:', message);

        // Check if modal already exists in DOM (prevent duplicates)
        const existingModal = document.querySelector('.formmodal-overlay');
        if (existingModal) {
            console.log('FormModal: Modal already exists, skipping duplicate');
            return;
        }

        // Decode HTML entities to show proper HTML
        const decodedMessage = decodeHtmlEntities(message);
        console.log('FormModal: Decoded message:', decodedMessage);

        // Check if body exists
        if (!document.body) {
            console.error('FormModal: document.body not available, waiting...');
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
        console.log('FormModal: Modal overlay added to DOM');

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
        console.log('FormModal: Form submitted', form);
        console.log('FormModal: Current URL:', window.location.href);

        // Obtener IDs posibles del formulario
        const htmlFormId = form.id || form.getAttribute('data-form-id') || form.getAttribute('name');
        console.log('FormModal: Form ID from HTML:', htmlFormId);

        // Extraer ID de la ruta de la URL (GLPI 11 Form Creator: /Form/Render/36)
        const pathFormId = extractFormIdFromPath();
        console.log('FormModal: Form ID from URL path:', pathFormId);

        // Obtener el ID del parámetro de URL (para formularios antiguos)
        const urlParams = new URLSearchParams(window.location.search);
        const urlFormId = urlParams.get('id');
        console.log('FormModal: Form ID from URL query:', urlFormId);

        // También buscar en el hash de la URL (algunos formularios usan #id)
        const hashMatch = window.location.hash.match(/[#&]id=(\d+)/);
        const hashFormId = hashMatch ? hashMatch[1] : null;
        console.log('FormModal: Form ID from hash:', hashFormId);

        // Buscar configuración que coincida con el ID de la URL o el ID del HTML
        let config = null;

        // Primero intentar con el ID de la ruta (GLPI 11 Form Creator - PRIORIDAD)
        if (pathFormId) {
            config = formModalConfigs.find(c => c.form_id === pathFormId || c.form_id === String(pathFormId));
            console.log('FormModal: Config found by path ID:', config ? 'Yes' : 'No', pathFormId);
        }

        // Si no se encontró, intentar con el ID de la query string
        if (!config && urlFormId) {
            config = formModalConfigs.find(c => c.form_id === urlFormId || c.form_id === String(urlFormId));
            console.log('FormModal: Config found by URL query ID:', config ? 'Yes' : 'No', urlFormId);
        }

        // Si no se encontró, intentar con el hash
        if (!config && hashFormId) {
            config = formModalConfigs.find(c => c.form_id === hashFormId || c.form_id === String(hashFormId));
            console.log('FormModal: Config found by hash ID:', config ? 'Yes' : 'No', hashFormId);
        }

        // Si no se encontró por URL, intentar con el ID del HTML
        if (!config && htmlFormId) {
            config = formModalConfigs.find(c => c.form_id === htmlFormId || c.form_id === String(htmlFormId));
            console.log('FormModal: Config found by HTML ID:', config ? 'Yes' : 'No', htmlFormId);
        }

        // También intentar buscar por action o cualquier atributo relevante
        if (!config && form.action) {
            const actionUrl = form.action;
            // Extraer ID de la acción también (puede ser /Form/SubmitAnswers/36)
            const actionMatch = actionUrl.match(/\/Form\/(?:SubmitAnswers|Render|View)\/(\d+)/);
            if (actionMatch) {
                const actionFormId = actionMatch[1];
                config = formModalConfigs.find(c => c.form_id === actionFormId || c.form_id === String(actionFormId));
                console.log('FormModal: Config found by action URL path:', config ? 'Yes' : 'No', actionFormId);
            } else {
                config = formModalConfigs.find(c => actionUrl.includes(c.form_id));
                console.log('FormModal: Config found by action URL:', config ? 'Yes' : 'No');
            }
        }

        // Para FormCreator específicamente, buscar en campos ocultos del formulario
        if (!config) {
            const hiddenInputs = form.querySelectorAll('input[type="hidden"]');
            hiddenInputs.forEach(input => {
                if (input.name === 'formcreator_form' || input.name === 'id' || input.name === 'form_id' || input.name === 'forms_id') {
                    const formId = input.value;
                    config = formModalConfigs.find(c => c.form_id === formId || c.form_id === String(formId));
                    if (config) {
                        console.log('FormModal: Config found by hidden input:', input.name, '=', formId);
                    }
                }
            });
        }

        if (config && config.message) {
            console.log('FormModal: Storing pending modal config:', config);
            // Store the configuration to show after submission
            sessionStorage.setItem('formmodal_pending', JSON.stringify(config));

            // Set up observer to detect when success message appears
            console.log('FormModal: Setting up observer to detect success message');
            setupSuccessMessageObserver(config);

            // If form action is SubmitAnswers, the form might submit via AJAX
            // In that case, we'll show the modal after the fetch response
            // Otherwise, we'll show it after page redirect
            if (form.action && form.action.includes('/Form/SubmitAnswers')) {
                console.log('FormModal: Form will submit to SubmitAnswers, observer will detect success message');
            } else {
                console.log('FormModal: Form will submit normally, observer will detect success message');
            }
        } else {
            console.log('FormModal: No matching configuration found.');
            console.log('FormModal: Searched for:', { pathFormId, urlFormId, hashFormId, htmlFormId });
            console.log('FormModal: Available form_ids in config:', formModalConfigs.map(c => c.form_id));
        }
    }

    // Function to extract ticket/item ID from URL (e.g., /front/ticket.form.php?id=371600)
    function extractItemIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }

    // Function to setup MutationObserver to detect success messages
    function setupSuccessMessageObserver(config) {
        console.log('FormModal: Setting up MutationObserver for success messages');

        // Use provided config or get from sessionStorage
        if (!config) {
            const pending = sessionStorage.getItem('formmodal_pending');
            if (pending) {
                try {
                    config = JSON.parse(pending);
                } catch (e) {
                    console.error('FormModal: Error parsing pending config for observer:', e);
                    return;
                }
            } else {
                console.log('FormModal: No config provided and no pending modal, skipping observer');
                return;
            }
        }

        let observerActive = true;
        let modalShown = false;
        let intervalCheck = null;

        // Create observer to watch for success messages
        const observer = new MutationObserver((mutations) => {
            if (modalShown || !observerActive) {
                return;
            }

            // Look for success messages or ticket links in the DOM
            const ticketLinks = document.querySelectorAll('a[href*="ticket.form.php?id="]');
            const successMessages = document.querySelectorAll('.alert-success, .toast-success, [class*="success"]');

            if (ticketLinks.length > 0 || successMessages.length > 0) {
                console.log('FormModal: Success message or ticket link detected in DOM');

                // Extract ticket ID from link if available
                let ticketId = null;
                if (ticketLinks.length > 0) {
                    const href = ticketLinks[0].getAttribute('href');
                    const match = href.match(/id=(\d+)/);
                    if (match) {
                        ticketId = match[1];
                        console.log('FormModal: Found ticket ID in DOM:', ticketId);
                    }
                }

                // Show modal - set flag immediately to prevent duplicate triggers
                modalShown = true;
                observerActive = false;
                observer.disconnect();

                // Stop interval check if it exists
                if (intervalCheck) {
                    clearInterval(intervalCheck);
                    intervalCheck = null;
                }

                let message = config.message;
                if (ticketId) {
                    message = message.replace(/\[ID_DE_INCIDENCIA\]/g, ticketId);
                    console.log('FormModal: Replaced ID_DE_INCIDENCIA with:', ticketId);
                }

                // Wait a bit for GLPI's message to fully appear
                setTimeout(() => {
                    console.log('FormModal: Showing modal after detecting success message');
                    showFormModal(message);
                    sessionStorage.removeItem('formmodal_pending');
                    sessionStorage.removeItem('formmodal_current_config');
                }, 1000);
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
                console.log('FormModal: Ticket link found in periodic check');
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
                console.log('FormModal: Max checks reached, stopping observer');
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
        console.log('FormModal: Checking for pending modal:', pending ? 'Yes' : 'No');
        console.log('FormModal: Current URL:', window.location.href);

        if (pending) {
            try {
                const config = JSON.parse(pending);
                console.log('FormModal: Found pending modal config');

                // Check if we're on a form page
                const currentPathFormId = extractFormIdFromPath();
                const isFormPage = currentPathFormId && formModalConfigs.some(c =>
                    c.form_id === currentPathFormId || c.form_id === String(currentPathFormId)
                );

                // Check if we're on an item page (ticket, etc.) after submit
                const isItemPage = isItemPageAfterSubmit();
                const itemId = extractItemIdFromUrl();

                console.log('FormModal: isFormPage:', isFormPage, 'isItemPage:', isItemPage, 'itemId:', itemId);

                // Show modal if:
                // 1. We're on an item page (ticket created) - this means form was submitted successfully
                // 2. OR we're not on the form page anymore (redirected somewhere else)
                if (isItemPage || !isFormPage) {
                    console.log('FormModal: Showing modal - isItemPage:', isItemPage, '!isFormPage:', !isFormPage);
                    sessionStorage.removeItem('formmodal_pending');
                    sessionStorage.removeItem('formmodal_current_config'); // Clean up

                    // Replace placeholders in message if we have item ID
                    let message = config.message;
                    if (itemId) {
                        message = message.replace(/\[ID_DE_INCIDENCIA\]/g, itemId);
                        console.log('FormModal: Replaced ID_DE_INCIDENCIA with:', itemId);
                    }

                    // Show modal after a short delay to ensure page is fully loaded
                    let attempts = 0;
                    const maxAttempts = 10;
                    const showModal = () => {
                        attempts++;
                        console.log(`FormModal: Attempt ${attempts} to show modal`);
                        if (document.body && document.body.offsetHeight > 0) {
                            console.log('FormModal: Page ready, showing modal');
                            showFormModal(message);
                        } else if (attempts < maxAttempts) {
                            setTimeout(showModal, 200);
                        } else {
                            console.log('FormModal: Max attempts reached, showing modal anyway');
                            showFormModal(message);
                        }
                    };
                    // Wait a bit longer if we're on an item page to let GLPI's notification appear first
                    const delay = isItemPage ? 1500 : 300;
                    setTimeout(showModal, delay);
                } else {
                    console.log('FormModal: Still on form page, waiting for submit/redirect');
                    // Don't remove pending yet, wait for submit to complete
                }
            } catch (e) {
                console.error('FormModal: Error parsing pending modal:', e);
                sessionStorage.removeItem('formmodal_pending');
                sessionStorage.removeItem('formmodal_current_config');
            }
        }
    }

    // Initialize form listeners
    function initFormListeners() {
        console.log('FormModal: Initializing form listeners...');
        console.log('FormModal: Available form_ids in config:', formModalConfigs.map(c => c.form_id));

        // Get current form ID from URL path
        const currentPathFormId = extractFormIdFromPath();

        // If we're on a form page that matches our config, set up listeners
        if (currentPathFormId) {
            const matchingConfig = formModalConfigs.find(c => c.form_id === currentPathFormId || c.form_id === String(currentPathFormId));
            if (matchingConfig) {
                console.log('FormModal: Found matching config for current page, setting up listeners');

                // Store config immediately for this page
                sessionStorage.setItem('formmodal_current_config', JSON.stringify(matchingConfig));

                // Set up MutationObserver to detect when GLPI shows success message
                setupSuccessMessageObserver(matchingConfig);
            }
        }

        // Listen to all form submissions
        document.addEventListener('submit', function (e) {
            console.log('FormModal: Submit event detected', e.target);
            const form = e.target;
            if (form.tagName === 'FORM') {
                console.log('FormModal: Processing form submission');
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
                    console.log('FormModal: Submit button clicked, form:', form);
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
                console.log('FormModal: Fetch request detected:', url);

                // Check if it's a SubmitAnswers request (check both full URL and path)
                const isSubmitAnswers = url.includes('/Form/SubmitAnswers') ||
                    url.includes('SubmitAnswers') ||
                    (typeof args[0] === 'object' && args[0].url && args[0].url.includes('SubmitAnswers'));

                if (isSubmitAnswers) {
                    console.log('FormModal: SubmitAnswers request detected! URL:', url);

                    // Get config from pending or current config
                    let config = null;
                    const pendingConfig = sessionStorage.getItem('formmodal_pending');
                    const currentConfig = sessionStorage.getItem('formmodal_current_config');

                    if (pendingConfig) {
                        try {
                            config = JSON.parse(pendingConfig);
                            console.log('FormModal: Using pending config for SubmitAnswers');
                        } catch (e) {
                            console.error('FormModal: Error parsing pending config:', e);
                        }
                    }

                    if (!config && currentConfig) {
                        try {
                            config = JSON.parse(currentConfig);
                            console.log('FormModal: Using stored config for SubmitAnswers');
                        } catch (e) {
                            console.error('FormModal: Error parsing stored config:', e);
                        }
                    }

                    // If we have a config, process the response
                    if (config) {
                        return originalFetch.apply(this, args).then(response => {
                            console.log('FormModal: SubmitAnswers response received, status:', response.status);

                            // Clone response to read it without consuming it
                            const responseClone = response.clone();

                            // Try to extract ticket ID from response
                            responseClone.text().then(text => {
                                console.log('FormModal: SubmitAnswers response text (first 1000 chars):', text.substring(0, 1000));

                                let ticketId = null;

                                // Method 1: Look for ticket.form.php?id=XXXX in the response
                                const ticketMatch = text.match(/ticket\.form\.php\?id=(\d+)/);
                                if (ticketMatch) {
                                    ticketId = ticketMatch[1];
                                    console.log('FormModal: Found ticket ID in response:', ticketId);
                                }

                                // Method 2: Look for data-item-id or similar attributes
                                if (!ticketId) {
                                    const itemIdMatch = text.match(/data-item-id=["'](\d+)["']/);
                                    if (itemIdMatch) {
                                        ticketId = itemIdMatch[1];
                                        console.log('FormModal: Found item ID in response:', ticketId);
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
                                            console.log('FormModal: Found ticket ID with pattern:', ticketId);
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
                                                    console.log('FormModal: Found ticket ID in DOM link:', ticketId);
                                                }
                                            }
                                        }

                                        // Show modal with ticket ID if found
                                        let message = config.message;
                                        if (ticketId) {
                                            message = message.replace(/\[ID_DE_INCIDENCIA\]/g, ticketId);
                                            console.log('FormModal: Replaced ID_DE_INCIDENCIA with:', ticketId);
                                        } else {
                                            console.log('FormModal: Ticket ID not found, will show placeholder');
                                        }

                                        // Wait a bit for GLPI's success message to appear
                                        setTimeout(() => {
                                            console.log('FormModal: Showing modal after SubmitAnswers');
                                            showFormModal(message);
                                            sessionStorage.removeItem('formmodal_pending');
                                            sessionStorage.removeItem('formmodal_current_config');
                                        }, 1500);
                                    }, 500);
                                };

                                checkDOM();
                            }).catch(err => {
                                console.error('FormModal: Error reading response:', err);
                                // Show modal anyway without ticket ID
                                setTimeout(() => {
                                    console.log('FormModal: Showing modal after SubmitAnswers (error reading response)');
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
                        if (config) {
                            console.log('FormModal: Matching config found in fetch URL path:', fetchFormId);
                        }
                    } else if (url.includes('/Form/SubmitAnswers')) {
                        // If it's a SubmitAnswers request, use the current config we stored
                        const currentConfig = sessionStorage.getItem('formmodal_current_config');
                        if (currentConfig) {
                            try {
                                config = JSON.parse(currentConfig);
                                console.log('FormModal: Using stored config for SubmitAnswers:', config);
                            } catch (e) {
                                console.error('FormModal: Error parsing stored config:', e);
                            }
                        }
                    }

                    // If we have a config and it's a SubmitAnswers request, show modal after response
                    if (config && url.includes('/Form/SubmitAnswers')) {
                        console.log('FormModal: SubmitAnswers detected, will show modal after response');

                        // Clone response to read it without consuming it
                        const responseClone = response.clone();

                        // Try to extract ticket ID from response
                        responseClone.text().then(text => {
                            console.log('FormModal: SubmitAnswers response text:', text.substring(0, 500));

                            // Try to extract ticket ID from the response
                            // GLPI might return HTML with a link like /front/ticket.form.php?id=371600
                            let ticketId = null;

                            // Method 1: Look for ticket.form.php?id=XXXX in the response
                            const ticketMatch = text.match(/ticket\.form\.php\?id=(\d+)/);
                            if (ticketMatch) {
                                ticketId = ticketMatch[1];
                                console.log('FormModal: Found ticket ID in response:', ticketId);
                            }

                            // Method 2: Look for data-item-id or similar attributes
                            if (!ticketId) {
                                const itemIdMatch = text.match(/data-item-id=["'](\d+)["']/);
                                if (itemIdMatch) {
                                    ticketId = itemIdMatch[1];
                                    console.log('FormModal: Found item ID in response:', ticketId);
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
                                            console.log('FormModal: Found ticket ID in DOM link:', ticketId);
                                        }
                                    }
                                }

                                // Show modal with ticket ID if found
                                let message = config.message;
                                if (ticketId) {
                                    message = message.replace(/\[ID_DE_INCIDENCIA\]/g, ticketId);
                                    console.log('FormModal: Replaced ID_DE_INCIDENCIA with:', ticketId);
                                } else {
                                    console.log('FormModal: Ticket ID not found, will show placeholder');
                                }

                                // Wait a bit for GLPI's success message to appear
                                setTimeout(() => {
                                    console.log('FormModal: Showing modal after SubmitAnswers');
                                    showFormModal(message);
                                    sessionStorage.removeItem('formmodal_pending');
                                    sessionStorage.removeItem('formmodal_current_config');
                                }, 1500);
                            }, 500);
                        }).catch(err => {
                            console.error('FormModal: Error reading response:', err);
                            // Show modal anyway without ticket ID
                            setTimeout(() => {
                                console.log('FormModal: Showing modal after SubmitAnswers (error reading response)');
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

        // Also check all existing forms on the page
        const existingForms = document.querySelectorAll('form');
        console.log('FormModal: Found', existingForms.length, 'forms on the page');

        // Extract form ID from current URL path (GLPI 11 format)
        const pathFormId = extractFormIdFromPath();
        const urlParams = new URLSearchParams(window.location.search);
        const urlId = urlParams.get('id');

        console.log('FormModal: Current page - Path ID:', pathFormId || 'none', 'Query ID:', urlId || 'none');

        // Check if current page matches any configuration
        const currentFormId = pathFormId || urlId;
        if (currentFormId) {
            const matchingConfig = formModalConfigs.find(c => c.form_id === currentFormId || c.form_id === String(currentFormId));
            if (matchingConfig) {
                console.log(`FormModal: Current page MATCHES configuration with form_id: ${matchingConfig.form_id}`);
            } else {
                console.log(`FormModal: Current page does NOT match any configuration (form_id: ${currentFormId})`);
            }
        }

        existingForms.forEach((form, index) => {
            const formId = form.id || form.getAttribute('name') || form.getAttribute('data-form-id') || 'no-id';
            console.log(`FormModal: Form ${index + 1} - ID: ${formId}, Action: ${form.action || 'none'}`);
        });
    }

    // Initialize when DOM is ready
    console.log('FormModal: Initializing plugin...');
    console.log('FormModal: Document ready state:', document.readyState);
    console.log('FormModal: Current URL on init:', window.location.href);

    // Check for pending modal immediately (in case page already loaded)
    checkPendingModal();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('FormModal: DOM loaded, initializing...');
            loadConfigurations();
            // Check again after DOM is loaded
            setTimeout(() => {
                console.log('FormModal: Checking pending modal after DOM loaded');
                checkPendingModal();
            }, 100);
        });
    } else {
        console.log('FormModal: DOM already ready, initializing...');
        loadConfigurations();
        // Check again after a short delay
        setTimeout(() => {
            console.log('FormModal: Checking pending modal after init');
            checkPendingModal();
        }, 100);
    }

    // Also check after window load (all resources loaded)
    window.addEventListener('load', () => {
        console.log('FormModal: Window loaded, checking for pending modal');
        setTimeout(() => checkPendingModal(), 500);
    });

    // Also listen for page visibility changes (in case of SPA navigation)
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            console.log('FormModal: Page visible, checking for pending modal');
            setTimeout(() => checkPendingModal(), 200);
        }
    });

    // Listen for popstate (back/forward navigation)
    window.addEventListener('popstate', () => {
        console.log('FormModal: Popstate event, checking for pending modal');
        setTimeout(() => checkPendingModal(), 200);
    });

    // Monitor URL changes (for SPA navigation)
    let lastUrl = window.location.href;
    setInterval(() => {
        const currentUrl = window.location.href;
        if (currentUrl !== lastUrl) {
            console.log('FormModal: URL changed from', lastUrl, 'to', currentUrl);
            lastUrl = currentUrl;
            setTimeout(() => checkPendingModal(), 300);
        }
    }, 500);

})();

