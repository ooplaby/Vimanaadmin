// frontend/js/panel.js

function setupPanelListeners() {
    if (uploadGeneralButton) {
        uploadGeneralButton.addEventListener('click', () => uploadFile('general', generalFileInput, generalUploadStatusP));
    }
    if (uploadSpecButton) {
        uploadSpecButton.addEventListener('click', () => uploadFile('specification', specFileInput, specUploadStatusP));
    }

    // Add listener for the new "Load Contact Requests" button
    const loadContactRequestsButton = document.getElementById('loadContactRequestsButton');
    if (loadContactRequestsButton) {
        loadContactRequestsButton.addEventListener('click', loadContactRequests);
    }
}

async function uploadFile(docType, fileInputElement, statusElement) {
    const token = getAuthToken();
    if (!token) {
        alert('Authentication token not found. Please login.');
        showAuthSection(); // Redirect to login
        return;
    }

    displayFeedback(statusElement, ''); // Clear previous status

    if (!fileInputElement.files || fileInputElement.files.length === 0) {
        displayFeedback(statusElement, 'Please select a file to upload.', true);
        return;
    }

    const file = fileInputElement.files[0];
    const formData = new FormData();
    formData.append('file', file);

    displayFeedback(statusElement, `Uploading ${docType} document: ${file.name}...`, false);

    try {
        const response = await fetch(`${API_BASE_URL}/documents/upload?document_type=${docType}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
                // Content-Type for FormData is set by the browser
            },
            body: formData,
        });

        const data = await response.json();

        if (response.ok) {
            displayFeedback(statusElement, `Upload successful! Doc ID: ${data.document_id}. File ID (Drive): ${data.file_id}.`, false);
            fileInputElement.value = ''; // Clear the file input
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
    const token = getAuthToken();
    if (!token) {
        alert('Authentication token not found. Please login.');
        if (typeof showAuthSection === 'function') showAuthSection();
        return;
    }

    const contactRequestsListDiv = document.getElementById('contactRequestsList');
    const contactRequestsStatusP = document.getElementById('contactRequestsStatus');

    if (!contactRequestsListDiv || !contactRequestsStatusP) {
        console.error("Contact requests display elements not found in DOM.");
        return;
    }

    displayFeedback(contactRequestsStatusP, 'Loading contact requests...', false);
    contactRequestsListDiv.innerHTML = ''; // Clear previous list

    try {
        const response = await fetch(`${API_BASE_URL}/admin/contact`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        const responseData = await response.json();

        if (response.ok) {
            if (responseData.length === 0) {
                contactRequestsListDiv.innerHTML = '<p class="info-text">No contact requests found.</p>';
                displayFeedback(contactRequestsStatusP, 'No contact requests available.', false);
                return;
            }

            const ul = document.createElement('ul');
            ul.className = 'contact-requests-ul'; // Add a class for potential specific styling

            responseData.forEach(request => {
                const li = document.createElement('li');
                const requestDate = new Date(request.created_at).toLocaleString();
                
                // Using innerHTML for easier formatting of multiple lines and basic structure
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

        } else {
            const errorMsg = `Failed to load contact requests: ${responseData.detail || response.statusText}`;
            contactRequestsListDiv.innerHTML = `<p class="feedback-message error">${errorMsg}</p>`;
            displayFeedback(contactRequestsStatusP, errorMsg, true);
        }
    } catch (error) {
        console.error("Error loading contact requests:", error);
        const errorMsg = 'Network error while loading contact requests.';
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
