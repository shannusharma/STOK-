const container = document.getElementById('container');
const registerBtn = document.getElementById('register');
const loginBtn = document.getElementById('login');

registerBtn.addEventListener('click', () => {
    container.classList.add("active");
});

loginBtn.addEventListener('click', () => {
    container.classList.remove("active");
});

// Backend URL
const BACKEND_URL = 'https://markstro-backend.vercel.app/api';

// Signup form
document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    try {
        const response = await fetch(`${BACKEND_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username: email.split('@')[0],  // Email se username banaya
                email: email,
                password: password,
                full_name: name
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Signup failed');
        }

        // Token save karo
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        alert('Signup successful! Redirecting to dashboard...');
        window.location.href = 'dashboard.html';  // Redirect to dashboard
        
    } catch (error) {
        console.error('Signup Error:', error);
        alert(`Error: ${error.message}`);
    }
});

// Login form
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${BACKEND_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username: email.split('@')[0],  // Email se username banaya
                password: password
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Login failed');
        }

        // Token save karo
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        alert('Login successful! Redirecting to dashboard...');
        window.location.href = 'dashboard.html';  // Redirect to dashboard
        
    } catch (error) {
        console.error('Login Error:', error);
        alert(`Error: ${error.message}`);
    }
});

// Page load pe check karo - agar already logged in hai
window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (token) {
        // Token verify karo
        fetch(`${BACKEND_URL}/auth/verify`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (response.ok) {
                // Already logged in, redirect to dashboard
                window.location.href = 'dashboard.html';
            }
        })
        .catch(err => {
            console.log('Token invalid, staying on login page');
        });
    }
});
