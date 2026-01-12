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

    // Function to check if we're on a valid GLPI 11 form page
    // ONLY /Form/Render/[id] is valid
    function isValidFormPage() {
        const path = window.location.pathname;
        // Only valid URL format: /Form/Render/[id]
        return path.includes('/Form/Render/');
    }

    // Function to extract form ID from URL path (GLPI 11 Form Creator format: /Form/Render/36)
    function extractFormIdFromPath() {
        const path = window.location.pathname;
        // Only match /Form/Render/[id]
        const match = path.match(/\/Form\/Render\/(\d+)/);
        if (match) {
            return match[1];
        }
        return null;
    }

    // Function to process message with replacements and special logic for ITT/IB departments
    function processMessage(configMessage, ticketId, departmentName) {
        // If department name contains "ITT" or "IB", use special message
        if (departmentName && (departmentName.includes('ITT') || departmentName.includes('IB'))) {
            let specialMessage = 'Contacte con la centralita para contactar con la <strong>[NOMBRE_DEPARTAMENTO]</strong>.';
            // Replace department name in special message
            specialMessage = specialMessage.replace(/\[NOMBRE_DEPARTAMENTO\]/g, departmentName);
            // Also replace ticket ID if available
            if (ticketId) {
                specialMessage = specialMessage.replace(/\[ID_DE_INCIDENCIA\]/g, ticketId);
            }
            return specialMessage;
        }

        // If department name contains "Jefe/a de día o Supervisor/a de guardia", use special message
        if (departmentName && (departmentName.includes('Jefe/a de día o Supervisor/a de guardia') || departmentName.includes('Jefe de día o Supervisor de guardia'))) {
            let specialMessage = 'Esta incidencia debe ser tramitada por el <strong>[NOMBRE_DEPARTAMENTO]</strong> a través de la centralita para la <strong>Guardia de Microinformática</strong>.';
            // Replace department name in special message
            specialMessage = specialMessage.replace(/\[NOMBRE_DEPARTAMENTO\]/g, departmentName);
            // Also replace ticket ID if available
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

    // Function to check if form should trigger modal
    function checkFormSubmit(form) {
        // ONLY process if we're on /Form/Render/[id]
        if (!isValidFormPage()) {
            return;
        }

        // Extract form ID from URL path: /Form/Render/[id]
        const pathFormId = extractFormIdFromPath();
        if (!pathFormId) {
            return;
        }

        // Find configuration that matches the form ID from URL
        const config = formModalConfigs.find(c => c.form_id === pathFormId || c.form_id === String(pathFormId));

        if (config && config.message) {
            // Store the configuration to show after submission with timestamp
            // This allows us to expire old pending modals
            const pendingData = {
                config: config,
                timestamp: Date.now(),
                formUrl: window.location.href
            };
            sessionStorage.setItem('formmodal_pending', JSON.stringify(pendingData));

            // Set up observer to detect when success message appears
            setupSuccessMessageObserver(config);
        }
    }

    // Function to extract ticket/item ID from URL (e.g., /front/ticket.form.php?id=371600)
    function extractItemIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }

    // Function to extract department/item name from ticket link innerHTML
    // The name is in the innerHTML of the anchor link to the ticket
    // @param {HTMLElement} ticketLink - Optional: the ticket link element (if already available)
    function extractDepartmentNameFromSuccessMessage(ticketLink = null) {
        let linkElement = ticketLink;

        // If no link provided, search for it in the DOM
        if (!linkElement) {
            const ticketLinks = document.querySelectorAll('a[href*="ticket.form.php?id="]');
            if (ticketLinks.length > 0) {
                linkElement = ticketLinks[0];
            } else {
                return null;
            }
        }

        // Get the innerHTML of the ticket link
        const innerHTML = linkElement.innerHTML || linkElement.textContent || '';
        if (innerHTML) {
            // Extract text after ":" if present, otherwise return the full innerHTML
            const colonIndex = innerHTML.indexOf(':');
            if (colonIndex !== -1 && colonIndex < innerHTML.length - 1) {
                return innerHTML.substring(colonIndex + 1).trim();
            }
            return innerHTML.trim();
        }

        return null;
    }

    // Function to setup MutationObserver to detect success messages
    function setupSuccessMessageObserver(config) {
        // Use provided config or get from sessionStorage
        if (!config) {
            const pending = sessionStorage.getItem('formmodal_pending');
            if (pending) {
                try {
                    const pendingData = JSON.parse(pending);
                    // Handle both old format (just config) and new format (with timestamp)
                    config = pendingData.config || pendingData;
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
                    let ticketLinkElement = null;
                    if (ticketLinks.length > 0) {
                        ticketLinkElement = ticketLinks[0];
                        const href = ticketLinkElement.getAttribute('href');
                        const match = href.match(/id=(\d+)/);
                        if (match) {
                            ticketId = match[1];
                        }
                    }

                    // Extract department name from ticket link innerHTML
                    const departmentName = extractDepartmentNameFromSuccessMessage(ticketLinkElement);

                    // Process message with replacements and special logic for ITT/IB
                    const message = processMessage(config.message, ticketId, departmentName);

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

                const ticketLinkElement = ticketLinks[0];
                const href = ticketLinkElement.getAttribute('href');
                const match = href.match(/id=(\d+)/);
                let ticketId = match ? match[1] : null;

                // Extract department name from ticket link innerHTML
                const departmentName = extractDepartmentNameFromSuccessMessage(ticketLinkElement);

                // Process message with replacements and special logic for ITT/IB
                const message = processMessage(config.message, ticketId, departmentName);

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
                const pendingData = JSON.parse(pending);

                // Check if pending data is too old (more than 5 minutes)
                // This prevents showing modals from old form submissions
                const maxAge = 1 * 60 * 1000; // 1 minute in milliseconds
                if (!pendingData.timestamp || (Date.now() - pendingData.timestamp) > maxAge) {
                    sessionStorage.removeItem('formmodal_pending');
                    sessionStorage.removeItem('formmodal_current_config');
                    return;
                }

                // Only process if we're on a valid form page OR we're on an item page
                // AND we came from a form submission (indicated by formUrl)
                const isFormPage = isValidFormPage();
                const isItemPage = isItemPageAfterSubmit();
                const itemId = extractItemIdFromUrl();

                // If we're on a form page, the observer will handle it
                // Only show modal from checkPendingModal if we're on an item page after redirect
                if (isFormPage) {
                    // We're back on the form page, let the observer handle it
                    // Don't show modal here
                    return;
                }

                // Only show modal if we're on an item page (ticket created) with an ID
                // AND we have a valid formUrl that indicates we came from /Form/Render/[id]
                if (isItemPage && itemId && pendingData.formUrl) {
                    // Verify that the formUrl was actually /Form/Render/[id]
                    const formUrlPath = new URL(pendingData.formUrl).pathname;
                    if (formUrlPath.match(/\/Form\/Render\/(\d+)/)) {
                        sessionStorage.removeItem('formmodal_pending');
                        sessionStorage.removeItem('formmodal_current_config'); // Clean up

                        const config = pendingData.config;
                        // Replace placeholders in message if we have item ID
                        const departmentName = extractDepartmentNameFromSuccessMessage();
                        // Process message with replacements and special logic for ITT/IB
                        const message = processMessage(config.message, itemId, departmentName);

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
                        // Wait a bit longer to let GLPI's notification appear first
                        setTimeout(showModal, 1500);
                    } else {
                        // formUrl is not valid or missing, clean up
                        sessionStorage.removeItem('formmodal_pending');
                        sessionStorage.removeItem('formmodal_current_config');
                    }
                } else {
                    // We're not on a form page or item page, clean up
                    sessionStorage.removeItem('formmodal_pending');
                    sessionStorage.removeItem('formmodal_current_config');
                }
            } catch (e) {
                sessionStorage.removeItem('formmodal_pending');
                sessionStorage.removeItem('formmodal_current_config');
            }
        }
    }

    // Initialize form listeners
    function initFormListeners() {
        // ONLY set up listeners if we're on a valid GLPI 11 form page
        // This prevents false positives from other pages
        if (!isValidFormPage()) {
            return;
        }

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
                            const pendingData = JSON.parse(pendingConfig);
                            // Handle both old format (just config) and new format (with timestamp)
                            config = pendingData.config || pendingData;
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
                                        let ticketLinkElement = null;
                                        if (!ticketId) {
                                            // Look for links to ticket.form.php in the page
                                            const ticketLinks = document.querySelectorAll('a[href*="ticket.form.php?id="]');
                                            if (ticketLinks.length > 0) {
                                                ticketLinkElement = ticketLinks[0];
                                                const href = ticketLinkElement.getAttribute('href');
                                                const match = href.match(/id=(\d+)/);
                                                if (match) {
                                                    ticketId = match[1];
                                                }
                                            }
                                        } else {
                                            // If ticketId was already found, get the link element
                                            const ticketLinks = document.querySelectorAll('a[href*="ticket.form.php?id="]');
                                            if (ticketLinks.length > 0) {
                                                ticketLinkElement = ticketLinks[0];
                                            }
                                        }

                                        // Show modal with ticket ID if found
                                        const departmentName = extractDepartmentNameFromSuccessMessage(ticketLinkElement);
                                        // Process message with replacements and special logic for ITT/IB
                                        const message = processMessage(config.message, ticketId, departmentName);

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
                                const departmentName = extractDepartmentNameFromSuccessMessage();
                                // Process message with replacements and special logic for ITT/IB
                                const message = processMessage(config.message, null, departmentName);
                                setTimeout(() => {
                                    showFormModal(message);
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

                    // Only process if we're currently on a /Form/Render/[id] page
                    // This ensures we only handle submissions from valid form pages
                    if (!isValidFormPage()) {
                        return originalFetch.apply(this, args);
                    }

                    // Extract form ID from current page URL (must be /Form/Render/[id])
                    const currentFormId = extractFormIdFromPath();
                    if (!currentFormId) {
                        return originalFetch.apply(this, args);
                    }

                    // Find config for this form ID
                    let config = formModalConfigs.find(c => c.form_id === currentFormId || c.form_id === String(currentFormId));

                    // If we don't have config from current page, try to get from sessionStorage
                    if (!config) {
                        const currentConfig = sessionStorage.getItem('formmodal_current_config');
                        if (currentConfig) {
                            try {
                                config = JSON.parse(currentConfig);
                            } catch (e) {
                                // Silently fail
                            }
                        }
                    }

                    // Only process if it's a SubmitAnswers request and we have a config
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
                                let ticketLinkElement = null;
                                if (!ticketId) {
                                    // Look for links to ticket.form.php in the page
                                    const ticketLinks = document.querySelectorAll('a[href*="ticket.form.php?id="]');
                                    if (ticketLinks.length > 0) {
                                        ticketLinkElement = ticketLinks[0];
                                        const href = ticketLinkElement.getAttribute('href');
                                        const match = href.match(/id=(\d+)/);
                                        if (match) {
                                            ticketId = match[1];
                                        }
                                    }
                                } else {
                                    // If ticketId was already found, get the link element
                                    const ticketLinks = document.querySelectorAll('a[href*="ticket.form.php?id="]');
                                    if (ticketLinks.length > 0) {
                                        ticketLinkElement = ticketLinks[0];
                                    }
                                }

                                // Show modal with ticket ID if found
                                const departmentName = extractDepartmentNameFromSuccessMessage(ticketLinkElement);
                                // Process message with replacements and special logic for ITT/IB
                                const message = processMessage(config.message, ticketId, departmentName);

                                // Wait a bit for GLPI's success message to appear
                                setTimeout(() => {
                                    showFormModal(message);
                                    sessionStorage.removeItem('formmodal_pending');
                                    sessionStorage.removeItem('formmodal_current_config');
                                }, 1500);
                            }, 500);
                        }).catch(err => {
                            // Show modal anyway without ticket ID
                            const departmentName = extractDepartmentNameFromSuccessMessage();
                            // Process message with replacements and special logic for ITT/IB
                            const message = processMessage(config.message, null, departmentName);
                            setTimeout(() => {
                                showFormModal(message);
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
    // BUT only check if we're on a valid form page or item page
    // This prevents unnecessary checks on every page
    let lastUrl = window.location.href;
    setInterval(() => {
        const currentUrl = window.location.href;
        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            // Only check pending modal if we're on a valid form page or item page
            // This prevents checking on random pages like ticket list views
            if (isValidFormPage() || isItemPageAfterSubmit()) {
                setTimeout(() => checkPendingModal(), 300);
            } else {
                // If we're not on a valid page, clean up any pending modals
                sessionStorage.removeItem('formmodal_pending');
                sessionStorage.removeItem('formmodal_current_config');
            }
        }
    }, 500);

})();

