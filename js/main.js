// frontend/js/main.js

const API_BASE_URL = 'https://vimanabackendlite.onrender.com/api';
let currentAdminToken = null;
let currentChatId = null;
let streamEventSource = null;

// Declare all DOM element variables that will be "globally" available to other scripts
// loaded after main.js, assuming they don't re-declare them with `let` or `const` in their own scope.
var authSection, adminPanelSection, logoutButton; // Using 'var' for wider accessibility for simplicity in this case
var loginEmailInput, loginPasswordInput, loginButton, loginErrorP;
var signupEmailInput, signupPasswordInput, signupSecretInput, signupButton, signupErrorP;
var generalFileInput, uploadGeneralButton, generalUploadStatusP;
var specFileInput, uploadSpecButton, specUploadStatusP;
var initChatButton, currentChatIdDisplaySpan, chatHistoryDisplayDiv, chatMessageInput, sendChatMessageButton, chatUserStatusP;
var adminChatIdInput, adminLoadChatHistoryButton, adminSelectedChatHistoryDisplayDiv, adminChatMessagesDisplayDiv, adminChatViewStatusP, adminLoadedChatId;
var loadAllChatsButton, allChatsListDiv;
var loadContactRequestsButton, contactRequestsListDiv, contactRequestsStatusP;
document.addEventListener('DOMContentLoaded', () => {
    // Cache ALL DOM Elements
    authSection = document.getElementById('authSection');
    adminPanelSection = document.getElementById('adminPanelSection');
    logoutButton = document.getElementById('logoutButton');

    loginEmailInput = document.getElementById('loginEmail');
    loginPasswordInput = document.getElementById('loginPassword');
    loginButton = document.getElementById('loginButton');
    loginErrorP = document.getElementById('loginError');

    signupEmailInput = document.getElementById('signupEmail');
    signupPasswordInput = document.getElementById('signupPassword');
    signupSecretInput = document.getElementById('signupSecret');
    signupButton = document.getElementById('signupButton');
    signupErrorP = document.getElementById('signupError');

    generalFileInput = document.getElementById('generalFile');
    uploadGeneralButton = document.getElementById('uploadGeneralButton');
    generalUploadStatusP = document.getElementById('generalUploadStatus');

    specFileInput = document.getElementById('specFile');
    uploadSpecButton = document.getElementById('uploadSpecButton');
    specUploadStatusP = document.getElementById('specUploadStatus');

    loadContactRequestsButton = document.getElementById('loadContactRequestsButton');
    contactRequestsListDiv = document.getElementById('contactRequestsList');
    contactRequestsStatusP = document.getElementById('contactRequestsStatus');
    
    initChatButton = document.getElementById('initChatButton');
    currentChatIdDisplaySpan = document.getElementById('currentChatIdDisplay');
    chatHistoryDisplayDiv = document.getElementById('chatHistoryDisplay');
    chatMessageInput = document.getElementById('chatMessageInput');
    sendChatMessageButton = document.getElementById('sendChatMessageButton');
    chatUserStatusP = document.getElementById('chatUserStatus');

    adminChatIdInput = document.getElementById('adminChatIdInput');
    adminLoadChatHistoryButton = document.getElementById('adminLoadChatHistoryButton');
    adminSelectedChatHistoryDisplayDiv = document.getElementById('adminSelectedChatHistoryDisplay');
    adminChatMessagesDisplayDiv = document.getElementById('adminChatMessagesDisplay');
    adminChatViewStatusP = document.getElementById('adminChatViewStatus');
    adminLoadedChatId = document.getElementById('adminLoadedChatId');

    loadAllChatsButton = document.getElementById('loadAllChatsButton'); // Crucial for the button
    allChatsListDiv = document.getElementById('allChatsList');      // Crucial for the display area

    // Initial UI setup
    currentAdminToken = localStorage.getItem('vimanaAdminToken');
    if (currentAdminToken) {
        showAdminPanel();
    } else {
        showAuthSection();
    }

    // Call setup functions from other modules AFTER DOM elements are cached
    if (typeof setupAuthListeners === 'function') {
        console.log("Main.js: Calling setupAuthListeners()");
        setupAuthListeners();
    } else {
        console.error("setupAuthListeners not found. Check auth.js and script load order.");
    }

    if (typeof setupPanelListeners === 'function') {
        console.log("Main.js: Calling setupPanelListeners()");
        setupPanelListeners();
    } else {
        console.error("setupPanelListeners not found. Check panel.js and script load order.");
    }

    if (typeof setupChatListeners === 'function') {
        console.log("Main.js: Calling setupChatListeners()");
        setupChatListeners();
    } else {
        console.error("setupChatListeners not found. Check chat.js and script load order.");
    }
});

function showAdminPanel() {
    if (authSection) authSection.style.display = 'none';
    if (adminPanelSection) adminPanelSection.style.display = 'block';
}

function showAuthSection() {
    if (authSection) authSection.style.display = 'block';
    if (adminPanelSection) adminPanelSection.style.display = 'none';
    currentAdminToken = null; 
    localStorage.removeItem('vimanaAdminToken');
    localStorage.removeItem('vimanaAdminRole');
    localStorage.removeItem('vimanaAdminUserId');
}

// These helper functions are used by other modules, so ensure they are globally accessible
function getAuthToken() {
    return localStorage.getItem('vimanaAdminToken');
}

function displayFeedback(element, message, isError = false) {
    if (element) {
        element.textContent = message;
        element.className = 'feedback-message ' + (isError ? 'error' : 'success');
        if (!isError && message) {
            setTimeout(() => {
                if (element.textContent === message) { 
                    element.textContent = '';
                    element.className = 'feedback-message';
                }
            }, 5000);
        }
    }
}
