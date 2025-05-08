document.addEventListener('DOMContentLoaded', () => {
    const loginTab = document.getElementById('loginTab');
    const signupTab = document.getElementById('signupTab');
    const authForm = document.getElementById('authForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const nameInput = document.getElementById('name');
    const nameFields = document.getElementById('nameFields');
    const authSubmit = document.getElementById('authSubmit');
    const switchLink = document.getElementById('switchLink');
    const switchAuth = document.getElementById('switchAuth');
    const authTitle = document.getElementById('auth-title');
    const authSubtitle = document.getElementById('auth-subtitle');
    
    // Check URL for mode parameter
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    
    if (mode === 'signup') {
        showSignup();
    } else {
        showLogin();
    }
    
    // Tab switching
    loginTab.addEventListener('click', showLogin);
    signupTab.addEventListener('click', showSignup);
    
    // Switch between login and signup
    switchLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (authSubmit.textContent.includes('Login')) {
            showSignup();
        } else {
            showLogin();
        }
    });
    
    // Form submission
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = emailInput.value;
        const password = passwordInput.value;
        const name = nameInput.value;
        
        authSubmit.disabled = true;
        authSubmit.innerHTML = '<div class="spinner"></div>';
        
        try {
            let response;
            
            if (authSubmit.textContent.includes('Sign Up')) {
                // Sign up
                response = await fetch('/api/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: name,
                        email,
                        password
                    })
                });
            } else {
                // Login
                response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email,
                        password
                    })
                });
            }
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Authentication failed');
            }
            
            // Store user data in session storage
            sessionStorage.setItem('currentUser', JSON.stringify({
                userId: data.userId,
                username: data.username,
                email
            }));
            
            // Redirect to chat
            window.location.href = '/chat';
        } catch (error) {
            showError(error.message);
            authSubmit.disabled = false;
            authSubmit.textContent = authSubmit.textContent.includes('Sign Up') ? 'Sign Up' : 'Login';
        }
    });
    
    function showLogin() {
        loginTab.classList.add('active');
        signupTab.classList.remove('active');
        nameFields.style.display = 'none';
        authSubmit.textContent = 'Login';
        authTitle.textContent = 'Login';
        authSubtitle.textContent = 'Welcome back to ClassChat';
        switchAuth.innerHTML = 'Don\'t have an account? <a href="#" id="switchLink">Sign Up</a>';
    }
    
    function showSignup() {
        loginTab.classList.remove('active');
        signupTab.classList.add('active');
        nameFields.style.display = 'block';
        authSubmit.textContent = 'Sign Up';
        authTitle.textContent = 'Sign Up';
        authSubtitle.textContent = 'Create your ClassChat account';
        switchAuth.innerHTML = 'Already have an account? <a href="#" id="switchLink">Login</a>';
    }
    
    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        errorDiv.style.color = 'var(--error-color)';
        errorDiv.style.marginTop = '1rem';
        errorDiv.style.textAlign = 'center';
        
        const existingError = document.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        
        authForm.appendChild(errorDiv);
    }
});