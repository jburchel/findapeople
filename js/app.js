// Main application logic
let peopleGroupsData = [];

// Initialize the application
async function initApp() {
    const countrySelect = document.getElementById('country');
    const upgSelect = document.getElementById('upg');
    const searchButton = document.getElementById('search');
    
    // Event listeners for search functionality
    if (searchButton) {
        searchButton.addEventListener('click', performSearch);
    }
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);
