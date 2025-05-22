// frontend/js/auth.js

function setupAuthListeners() {
    if (loginButton) {
        loginButton.addEventListener('click', handleLogin);
    }
    if (signupButton) {
        signupButton.addEventListener('click', handleAdminSignup);
    }
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
}

async function handleLogin() {
    const email = loginEmailInput.value.trim();
    const password = loginPasswordInput.value.trim();
    displayFeedback(loginErrorP, ''); // Clear previous error

    if (!email || !password) {
        displayFeedback(loginErrorP, 'Email and password are required.', true);
        return;
    }

    const formData = new FormData();
    formData.append('username', email); // FastAPI OAuth2PasswordRequestForm expects 'username'
    formData.append('password', password);

    try {
        displayFeedback(loginErrorP, 'Logging in...', false);
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            body: formData,
        });
        const data = await response.json();
        if (response.ok && data.access_token) {
            localStorage.setItem('vimanaAdminToken', data.access_token);
            localStorage.setItem('vimanaAdminRole', data.role); // Optional: store role
            localStorage.setItem('vimanaAdminUserId', data.user_id); // Optional: store user ID
            currentAdminToken = data.access_token; // Update global token
            displayFeedback(loginErrorP, 'Login successful!', false);
            showAdminPanel();
        } else {
            displayFeedback(loginErrorP, data.detail || 'Login failed. Check credentials.', true);
        }
    } catch (error) {
        displayFeedback(loginErrorP, 'Network error or server unavailable.', true);
        console.error('Login error:', error);
    }
}

async function handleAdminSignup() {
    const email = signupEmailInput.value.trim();
    const password = signupPasswordInput.value.trim();
    const secret = signupSecretInput.value.trim();
    displayFeedback(signupErrorP, '');

    if (!email || !password || !secret) {
        displayFeedback(signupErrorP, 'All fields are required for admin signup.', true);
        return;
    }

    try {
        displayFeedback(signupErrorP, 'Signing up admin...', false);
        const response = await fetch(`${API_BASE_URL}/admin/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, secrets: secret }),
        });
        const data = await response.json();
        if (response.ok) {
            displayFeedback(signupErrorP, 'Admin signup successful! You can now login.', false);
            signupEmailInput.value = '';
            signupPasswordInput.value = '';
            signupSecretInput.value = '';
        } else {
            displayFeedback(signupErrorP, data.detail || 'Admin signup failed.', true);
        }
    } catch (error) {
        displayFeedback(signupErrorP, 'Network error or server unavailable.', true);
        console.error('Admin Signup error:', error);
    }
}

function handleLogout() {
    localStorage.removeItem('vimanaAdminToken');
    localStorage.removeItem('vimanaAdminRole');
    localStorage.removeItem('vimanaAdminUserId');
    currentAdminToken = null;
    currentChatId = null; // Reset chat ID on logout
    if(streamEventSource) streamEventSource.close(); // Close any active chat stream
    if(currentChatIdDisplaySpan) currentChatIdDisplaySpan.textContent = 'Current Chat ID: None';
    if(chatHistoryDisplayDiv) chatHistoryDisplayDiv.innerHTML = '';
    alert('Logged out successfully.');
    showAuthSection();
}