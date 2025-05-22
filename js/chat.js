// frontend/js/chat.js

// Ensure global variables are accessible if not already defined in main.js
// let currentChatId = null; // Defined in main.js
// let streamEventSource = null; // Defined in main.js
// const API_BASE_URL = '...'; // Defined in main.js

// DOM Element references (assuming they are cached in main.js and available globally here)
// If not, you'd pass them as arguments or re-fetch them.
// For this example, assuming main.js makes them available like:
// initChatButton, currentChatIdDisplaySpan, chatHistoryDisplayDiv, chatMessageInput, 
// sendChatMessageButton, chatUserStatusP, adminChatIdInput, adminLoadChatHistoryButton, 
// adminSelectedChatHistoryDisplayDiv, adminChatMessagesDisplayDiv, adminChatViewStatusP,
// loadAllChatsButton, allChatsListDiv (from main.js)

function setupChatListeners() {
    if (initChatButton) {
        initChatButton.addEventListener('click', handleInitChat);
    }
    if (sendChatMessageButton) {
        sendChatMessageButton.addEventListener('click', handleSendChatMessage);
    }
    if (chatMessageInput) {
        chatMessageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendChatMessage();
            }
        });
    }
    if (adminLoadChatHistoryButton) {
        // This button is for manually typing a chat ID
        adminLoadChatHistoryButton.addEventListener('click', () => {
            const chatIdToLoad = adminChatIdInput.value.trim();
            handleAdminLoadSpecificChat(chatIdToLoad); // Pass the value from input
        });
    }
    if (loadAllChatsButton) { // Listener for the "Load All Chats" button
        loadAllChatsButton.addEventListener('click', loadAllUserChatSummaries);
    }
}

async function handleInitChat() {
    displayFeedback(chatUserStatusP, 'Initializing new chat session...', false);
    if (chatHistoryDisplayDiv) chatHistoryDisplayDiv.innerHTML = '';
    if (currentChatIdDisplaySpan) currentChatIdDisplaySpan.textContent = 'Current Chat ID: Initializing...';

    if (streamEventSource) { // Using global streamEventSource from main.js
        streamEventSource.close();
        console.log("Closed previous chat stream (if any).");
    }

    const token = getAuthToken(); // From auth.js or main.js
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/chat/init`, {
            method: 'POST',
            headers: headers
        });
        const data = await response.json();
        if (response.ok && data.chat_id) {
            currentChatId = data.chat_id; // Update global currentChatId
            if (currentChatIdDisplaySpan) currentChatIdDisplaySpan.textContent = `Current Chat ID: ${currentChatId}`;
            displayFeedback(chatUserStatusP, `Chat session ready (ID: ${currentChatId}).`, false);
            fetchAndDisplayChatHistory(currentChatId, chatHistoryDisplayDiv);
        } else {
            displayFeedback(chatUserStatusP, `Failed to initialize chat: ${data.detail || 'Unknown error'}`, true);
            if (currentChatIdDisplaySpan) currentChatIdDisplaySpan.textContent = 'Current Chat ID: Error';
        }
    } catch (error) {
        displayFeedback(chatUserStatusP, 'Network error initializing chat.', true);
        if (currentChatIdDisplaySpan) currentChatIdDisplaySpan.textContent = 'Current Chat ID: Network Error';
        console.error("Init chat error:", error);
    }
}

function formatMessageTextForDisplay(text) {
    if (typeof text !== 'string') return '';
    // Basic security: escape HTML to prevent XSS if messages could contain HTML
    const escapedText = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    return escapedText.replace(/\n/g, '<br>'); // Then replace newlines
}

function appendMessageToDisplay(messageText, sender, targetDisplayDivElement) {
    if (!targetDisplayDivElement || typeof messageText === 'undefined') return;

    const messageContainer = document.createElement('div');
    messageContainer.classList.add('chat-message', sender === 'user' ? 'user-message' : 'assistant-message');
    
    messageContainer.innerHTML = formatMessageTextForDisplay(messageText); 

    targetDisplayDivElement.appendChild(messageContainer);
    targetDisplayDivElement.scrollTop = targetDisplayDivElement.scrollHeight;
}

async function fetchAndDisplayChatHistory(chatId, targetDisplayDivElement) {
    if (!chatId || !targetDisplayDivElement) {
        console.warn("fetchAndDisplayChatHistory called with invalid chatId or targetDisplayDivElement");
        if(targetDisplayDivElement) targetDisplayDivElement.innerHTML = '<p class="feedback-message error">Invalid parameters to load history.</p>';
        return;
    }
    targetDisplayDivElement.innerHTML = `<p class="info-text">Loading history for Chat ID: ${chatId}...</p>`;

    const token = getAuthToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/chat/history/${chatId}`, { headers: headers });
        const responseText = await response.text(); // Get text first for better error diagnosis

        if (response.ok) {
            const historyItems = JSON.parse(responseText);
            targetDisplayDivElement.innerHTML = ''; 
            if (historyItems.length === 0) {
                targetDisplayDivElement.innerHTML = '<p class="info-text">No messages in this chat yet.</p>';
            } else {
                historyItems.forEach(item => {
                    appendMessageToDisplay(item.user_message, 'user', targetDisplayDivElement);
                    appendMessageToDisplay(item.assistant_message, 'assistant', targetDisplayDivElement);
                });
            }
        } else {
            let errorDetail = "Unknown error";
            try {
                const errorData = JSON.parse(responseText);
                errorDetail = errorData.detail || response.statusText;
            } catch (e) {
                errorDetail = responseText || response.statusText;
            }
            targetDisplayDivElement.innerHTML = `<p class="feedback-message error">Failed to load history: ${errorDetail}</p>`;
            console.error(`Failed to load history for ${chatId}:`, errorDetail);
        }
    } catch (error) {
        console.error("Error fetching chat history:", error);
        targetDisplayDivElement.innerHTML = '<p class="feedback-message error">Network error fetching history.</p>';
    }
}

async function handleSendChatMessage() {
    const message = chatMessageInput.value.trim();
    if (!message) return;
    if (!currentChatId) {
        displayFeedback(chatUserStatusP, 'Please initialize a chat session first.', true);
        return;
    }

    appendMessageToDisplay(message, 'user', chatHistoryDisplayDiv);
    chatMessageInput.value = ''; 
    displayFeedback(chatUserStatusP, 'Sending message...', false);

    if (streamEventSource) { // Using global streamEventSource from main.js
        streamEventSource.close();
        console.log("Closed previous stream before sending new message.");
    }

    let assistantResponseContainer = document.createElement('div');
    assistantResponseContainer.classList.add('chat-message', 'assistant-message');
    chatHistoryDisplayDiv.appendChild(assistantResponseContainer);
    chatHistoryDisplayDiv.scrollTop = chatHistoryDisplayDiv.scrollHeight;

    const token = getAuthToken();
    const headers = { 
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    let fullAssistantResponse = "";

    try {
        const response = await fetch(`${API_BASE_URL}/chat/message/${currentChatId}/stream`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ message: message })
        });

        if (!response.ok && response.headers.get("content-type")?.includes("application/json")) {
            const errorData = await response.json(); 
            displayFeedback(chatUserStatusP, `Error: ${errorData.detail || response.statusText}`, true);
            assistantResponseContainer.innerHTML = formatMessageTextForDisplay(`Error: ${errorData.detail || response.statusText}`);
            return;
        } else if (!response.ok) {
             displayFeedback(chatUserStatusP, `Error: ${response.statusText}`, true);
             assistantResponseContainer.innerHTML = formatMessageTextForDisplay(`Error: ${response.statusText}`);
             return;
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                displayFeedback(chatUserStatusP, 'Response stream finished.', false);
                break;
            }
            
            buffer += decoder.decode(value, { stream: true });
            let lines = buffer.split('\n\n'); // SSE events are separated by double newlines
            buffer = lines.pop(); 

            for (const event of lines) {
                if (event.startsWith('data: ')) {
                    const jsonData = event.substring(6).trim();
                    if (jsonData === "[DONE]") { // This was a custom end signal, backend now uses is_complete in last chunk
                        console.log("Stream signaled [DONE] (legacy, check is_complete now).");
                        continue;
                    }
                    try {
                        const chunkData = JSON.parse(jsonData);
                        if (chunkData.error) {
                            fullAssistantResponse += ` [Error: ${chunkData.error}]`;
                            assistantResponseContainer.innerHTML = formatMessageTextForDisplay(fullAssistantResponse);
                            displayFeedback(chatUserStatusP, `Stream error: ${chunkData.error}`, true);
                            return; 
                        }
                        if (chunkData.chunk) {
                            fullAssistantResponse += chunkData.chunk;
                            assistantResponseContainer.innerHTML = formatMessageTextForDisplay(fullAssistantResponse); 
                            chatHistoryDisplayDiv.scrollTop = chatHistoryDisplayDiv.scrollHeight;
                        }
                        if (chunkData.is_complete) {
                            if (chunkData.assistant_message_complete && fullAssistantResponse !== chunkData.assistant_message_complete) {
                                fullAssistantResponse = chunkData.assistant_message_complete;
                                assistantResponseContainer.innerHTML = formatMessageTextForDisplay(fullAssistantResponse);
                            }
                            displayFeedback(chatUserStatusP, 'Response fully received.', false);
                            console.log("Stream processing complete flag received from backend.");
                        }
                    } catch (e) {
                        console.warn("Error parsing stream JSON or malformed SSE event:", event, e);
                    }
                }
            }
        }
        // Process any remaining buffer content if it forms a valid event
        if (buffer.startsWith('data: ')) {
             const jsonData = buffer.substring(6).trim();
             try {
                const chunkData = JSON.parse(jsonData);
                if(chunkData.chunk && !fullAssistantResponse.endsWith(chunkData.chunk)) { 
                    fullAssistantResponse += chunkData.chunk;
                    assistantResponseContainer.innerHTML = formatMessageTextForDisplay(fullAssistantResponse);
                }
                if (chunkData.is_complete) {
                     displayFeedback(chatUserStatusP, 'Response fully received (final buffer).', false);
                }
             } catch(e){ /* ignore parsing error on final incomplete buffer */ }
        }
        chatHistoryDisplayDiv.scrollTop = chatHistoryDisplayDiv.scrollHeight;

    } catch (error) {
        console.error('Chat stream fetch error:', error);
        displayFeedback(chatUserStatusP, 'Network error during chat stream.', true);
        assistantResponseContainer.innerHTML = formatMessageTextForDisplay(fullAssistantResponse + " [Network Error]");
    }
}

// --- Admin: View All Chat Summaries & Specific Chat History ---
async function loadAllUserChatSummaries() { // Renamed function for clarity
    const token = getAuthToken();
    if (!token) {
        alert("Admin token not found. Please login.");
        if (typeof showAuthSection === 'function') showAuthSection();
        return;
    }
    if (!allChatsListDiv) {
        console.error("allChatsListDiv DOM element not found");
        return;
    }

    allChatsListDiv.innerHTML = '<p class="info-text">Loading all chat summaries...</p>';
    displayFeedback(adminChatViewStatusP, ''); 

    try {
        // Calls the new endpoint: /api/chat/admin/chats/summary
        const response = await fetch(`${API_BASE_URL}/chat/admin/chats/summary`, {
            method: 'GET',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            const chatSummaries = await response.json();
            if (chatSummaries.length === 0) {
                allChatsListDiv.innerHTML = '<p class="info-text">No chat sessions found.</p>';
                return;
            }

            const ul = document.createElement('ul');
            chatSummaries.forEach(chat => {
                const li = document.createElement('li');
                let userDisplay = chat.is_authenticated_chat ? (chat.user_email || `User ID: ${chat.user_id}`) : 'Anonymous';
                let startTime = chat.chat_starttime ? new Date(chat.chat_starttime).toLocaleString() : 'N/A';
                let lastMsgTime = chat.last_message_timestamp ? new Date(chat.last_message_timestamp).toLocaleString() : 'N/A';
                
                // Using innerHTML for easier formatting of multiple lines
                li.innerHTML = `
                    <strong>Chat ID: ${chat.chat_id}</strong> 
                    <span class="chat-type-indicator">(${chat.chat_type_display || (chat.is_authenticated_chat ? 'Auth' : 'Anon')})</span><br>
                    User: ${userDisplay}<br>
                    Started: ${startTime}<br>
                    Last Activity: ${lastMsgTime} (${chat.message_count} messages)
                `;
                
                li.dataset.chatId = chat.chat_id; 
                li.addEventListener('click', () => handleAdminLoadSpecificChat(chat.chat_id));
                ul.appendChild(li);
            });
            allChatsListDiv.innerHTML = ''; 
            allChatsListDiv.appendChild(ul);
            displayFeedback(adminChatViewStatusP, `Loaded ${chatSummaries.length} chat summaries. Click to view history.`, false);
        } else {
            const errorData = await response.json();
            const errorMsg = `Failed to load chat summaries: ${errorData.detail || response.statusText}`;
            allChatsListDiv.innerHTML = `<p class="feedback-message error">${errorMsg}</p>`;
            displayFeedback(adminChatViewStatusP, errorMsg, true);
        }
    } catch (error) {
        console.error("Error loading all user chat summaries:", error);
        const errorMsg = 'Network error while loading chat summaries.';
        allChatsListDiv.innerHTML = `<p class="feedback-message error">${errorMsg}</p>`;
        displayFeedback(adminChatViewStatusP, errorMsg, true);
    }
}

async function handleAdminLoadSpecificChat(chatIdToLoadParam = null) {
    // This function is called either by clicking a summary (chatIdToLoadParam is set)
    // or by the manual input field (chatIdToLoadParam is null).
    const chatIdToLoad = chatIdToLoadParam || (adminChatIdInput ? adminChatIdInput.value.trim() : null);
    
    displayFeedback(adminChatViewStatusP, '');
    if (!chatIdToLoad) {
        displayFeedback(adminChatViewStatusP, 'Please enter or select a Chat ID.', true);
        return;
    }

    if(adminChatMessagesDisplayDiv && adminLoadedChatId) { 
        adminChatMessagesDisplayDiv.innerHTML = ''; // Clear previous specific history
        adminLoadedChatId.textContent = chatIdToLoad; // Update display of which chat ID is loaded
    } else {
        console.error("Admin chat display elements not found.");
        return;
    }
    
    // Reuse the generic history fetching function
    fetchAndDisplayChatHistory(chatIdToLoad, adminChatMessagesDisplayDiv); 
}