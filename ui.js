// Set today's date in the date input
document.addEventListener('DOMContentLoaded', function() {
    const dateInput = document.getElementById('date-input');
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
});

// Settings dropdown toggle
const settingsToggle = document.getElementById('settings-toggle');
const themeOptions = document.getElementById('theme-options');

settingsToggle.addEventListener('click', function(e) {
    e.preventDefault();
    themeOptions.classList.toggle('show');
    settingsToggle.classList.toggle('settings-open');
});

// Theme switching
const themeItems = document.querySelectorAll('.theme-item');

themeItems.forEach(item => {
    item.addEventListener('click', function(e) {
        e.preventDefault();
        const theme = this.getAttribute('data-theme');
        
        // Remove all theme classes
        document.body.classList.remove('dark-mode', 'light-mode');
        
        // Apply selected theme
        if(theme === 'dark') {
            document.body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
        } else if(theme === 'light') {
            document.body.classList.add('light-mode');
            localStorage.setItem('theme', 'light');
        } else {
            localStorage.setItem('theme', 'default');
        }
        
        // Visual feedback
        themeItems.forEach(t => t.classList.remove('active'));
        this.classList.add('active');
    });
});

// Load saved theme on page load
const savedTheme = localStorage.getItem('theme');
if(savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
} else if(savedTheme === 'light') {
    document.body.classList.add('light-mode');
}

// Sidebar navigation active state
const sidebarLinks = document.querySelectorAll('.sidebar a:not(#settings-toggle):not(.theme-item)');

sidebarLinks.forEach(link => {
    link.addEventListener('click', function(e) {
        // Don't prevent default for logout and help
        if(!this.querySelector('h3').textContent.includes('Logout') && 
           !this.querySelector('h3').textContent.includes('Help')) {
            e.preventDefault();
        }
        
        // Remove active class from all links
        sidebarLinks.forEach(l => l.classList.remove('active'));
        
        // Add active class to clicked link
        this.classList.add('active');
    });
});




// ========== INITIALIZE CHARTS ==========
    

