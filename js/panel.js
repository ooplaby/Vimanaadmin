// frontend/js/panel.js

function setupPanelListeners() {
    if (uploadGeneralButton) {
        uploadGeneralButton.addEventListener('click', () => uploadFile('general', generalFileInput, generalUploadStatusP));
    }
    if (uploadSpecButton) {
        uploadSpecButton.addEventListener('click', () => uploadFile('specification', specFileInput, specUploadStatusP));
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