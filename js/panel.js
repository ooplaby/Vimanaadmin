// frontend/js/panel.js

function setupPanelListeners() {
    console.log("panel.js: setupPanelListeners() called."); // Debug log

    if (typeof uploadGeneralButton !== 'undefined' && uploadGeneralButton) { // Check if global var exists
        console.log("panel.js: Attaching listener to uploadGeneralButton.");
        uploadGeneralButton.addEventListener('click', () => uploadFile('general', generalFileInput, generalUploadStatusP));
    } else {
        console.warn("panel.js: uploadGeneralButton not found or not globally defined from main.js.");
    }

    if (typeof uploadSpecButton !== 'undefined' && uploadSpecButton) { // Check if global var exists
        console.log("panel.js: Attaching listener to uploadSpecButton.");
        uploadSpecButton.addEventListener('click', () => uploadFile('specification', specFileInput, specUploadStatusP));
    } else {
        console.warn("panel.js: uploadSpecButton not found or not globally defined from main.js.");
    }

    // Use the globally defined 'loadContactRequestsButton' from main.js
    // Do NOT re-declare it with const or let here.
    if (typeof loadContactRequestsButton !== 'undefined' && loadContactRequestsButton) {
        console.log("panel.js: Attaching listener to GLOBAL loadContactRequestsButton.");
        loadContactRequestsButton.addEventListener('click', loadContactRequests);
    } else {
        console.error("panel.js: GLOBAL loadContactRequestsButton is not defined or not found. Check main.js and script load order.");
    }
}

async function uploadFile(docType, fileInputElement, statusElement) {
    const token = getAuthToken(); // Assumes getAuthToken is global from main.js
    if (!token) {
        alert('Authentication token not found. Please login.');
        if (typeof showAuthSection === 'function') showAuthSection(); // Assumes showAuthSection is global
        return;
    }

    // Access global statusElement from main.js
    if (typeof statusElement === 'undefined' || !statusElement) {
        console.error(`uploadFile: statusElement for ${docType} is not defined.`);
        return;
    }
    // Access global fileInputElement from main.js
    if (typeof fileInputElement === 'undefined' || !fileInputElement) {
        console.error(`uploadFile: fileInputElement for ${docType} is not defined.`);
        return;
    }


    displayFeedback(statusElement, ''); // Assumes displayFeedback is global

    if (!fileInputElement.files || fileInputElement.files.length === 0) {
        displayFeedback(statusElement, 'Please select a file to upload.', true);
        return;
    }

    const file = fileInputElement.files[0];
    const formData = new FormData();
    formData.append('file', file);

    displayFeedback(statusElement, `Uploading ${docType} document: ${file.name}...`, false);

    try {
        const response = await fetch(`${API_BASE_URL}/documents/upload?document_type=${docType}`, { // Assumes API_BASE_URL is global
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData,
        });

        const data = await response.json();

        if (response.ok) {
            displayFeedback(statusElement, `Upload successful! Doc ID: ${data.document_id}. File ID (Drive): ${data.file_id}.`, false);
            fileInputElement.value = ''; 
            alert(`Document '${data.filename}' (ID: ${data.document_id}) uploaded successfully.
You can now trigger its processing via the backend API documentation (e.g., /docs) using this document ID.
General Docs: /api/training/process/${data.document_id}
Spec Docs: /api/specifications/process/${data.document_id}`);
        } else {
            displayFeedback(statusElement, `Upload failed: ${data.detail || response.statusText}`, true);
        }
    } catch (error) {
        displayFeedback(statusElement, 'Network error or server unavailable during upload.', true);
        console.error(`Upload error (${docType}):`, error);
    }
}


async function loadContactRequests() {
    console.log("panel.js: loadContactRequests function called.");

    const token = getAuthToken();
    if (!token) {
        alert('Authentication token not found. Please login.');
        console.error("panel.js: loadContactRequests - Auth token not found.");
        if (typeof showAuthSection === 'function') showAuthSection();
        return;
    }
    console.log("panel.js: loadContactRequests - Token found.");

    // Access global DOM elements cached by main.js
    if (typeof contactRequestsListDiv === 'undefined' || !contactRequestsListDiv) {
        console.error("panel.js: loadContactRequests - GLOBAL contactRequestsListDiv DOM element not found.");
        return;
    }
    if (typeof contactRequestsStatusP === 'undefined' || !contactRequestsStatusP) {
        console.error("panel.js: loadContactRequests - GLOBAL contactRequestsStatusP DOM element not found.");
        return;
    }
    console.log("panel.js: loadContactRequests - Global DOM elements for display found.");

    displayFeedback(contactRequestsStatusP, 'Loading contact requests...', false);
    contactRequestsListDiv.innerHTML = ''; 

    try {
        console.log(`panel.js: loadContactRequests - Fetching from ${API_BASE_URL}/admin/contact`);
        const response = await fetch(`${API_BASE_URL}/admin/contact`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        console.log("panel.js: loadContactRequests - Fetch response status:", response.status);

        const responseData = await response.json();
        console.log("panel.js: loadContactRequests - Response data:", responseData);

        if (response.ok) {
            if (responseData.length === 0) {
                contactRequestsListDiv.innerHTML = '<p class="info-text">No contact requests found.</p>';
                displayFeedback(contactRequestsStatusP, 'No contact requests available.', false);
                console.log("panel.js: loadContactRequests - No contact requests found from API.");
                return;
            }

            const ul = document.createElement('ul');
            ul.className = 'contact-requests-ul';

            responseData.forEach(request => {
                const li = document.createElement('li');
                const requestDate = new Date(request.created_at).toLocaleString();
                
                li.innerHTML = `
                    <div class="contact-request-header">
                        <strong>From: ${escapeHTML(request.name)}</strong> (${escapeHTML(request.email)})
                        <span class="contact-request-date">Received: ${requestDate}</span>
                    </div>
                    <div class="contact-request-message">
                        <p>${escapeHTML(request.message).replace(/\n/g, '<br>')}</p>
                    </div>
                `;
                ul.appendChild(li);
            });
            contactRequestsListDiv.appendChild(ul);
            displayFeedback(contactRequestsStatusP, `Loaded ${responseData.length} contact requests.`, false);
            console.log(`panel.js: loadContactRequests - Successfully loaded ${responseData.length} requests.`);

        } else {
            const errorMsg = `Failed to load contact requests: ${responseData.detail || response.statusText}`;
            contactRequestsListDiv.innerHTML = `<p class="feedback-message error">${errorMsg}</p>`;
            displayFeedback(contactRequestsStatusP, errorMsg, true);
            console.error(`panel.js: loadContactRequests - API error - ${errorMsg}`);
        }
    } catch (error) {
        console.error("panel.js: loadContactRequests - Network or parsing error:", error);
        const errorMsg = 'Network error or error parsing response while loading contact requests.';
        contactRequestsListDiv.innerHTML = `<p class="feedback-message error">${errorMsg}</p>`;
        displayFeedback(contactRequestsStatusP, errorMsg, true);
    }
}

// Helper function to escape HTML content to prevent XSS
function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"']/g, function (match) {
        return {
            '&': '&',
            '<': '<',
            '>': '>',
            '"': '"',
            "'": '''
        }[match];
    });
}
