// Main application logic
import { loadCSVData, searchJoshuaProject } from './api.js';
import { calculateDistance, convertToKilometers } from './utils.js';
import { loadTop100List, addToTop100, removeFromTop100 } from './top100.js';
import { displayResults, updateTop100Display, createSortButtons } from './ui.js';

let peopleGroupsData = {
    fpg: [],
    uupg: []
};

// Initialize the application
async function initApp() {
    peopleGroupsData = await loadCSVData();
    loadTop100List();
    
    const countrySelect = document.getElementById('country');
    const upgSelect = document.getElementById('upg');
    const searchButton = document.getElementById('search');
    
    // Event listeners
    countrySelect.addEventListener('change', () => {
        if(countrySelect.value) {
            populateUPGDropdown(countrySelect.value);
        }
    });
    
    searchButton.addEventListener('click', performSearch);
    
    // Initialize sort buttons
    const sortButtonsContainer = document.querySelector('.sort-buttons-container');
    if (sortButtonsContainer) {
        sortButtonsContainer.appendChild(createSortButtons());
    }
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);
