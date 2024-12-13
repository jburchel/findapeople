// Main application logic
let peopleGroupsData = [];

// Function to display search results
function displayResults(results) {
    const resultsContainer = document.getElementById('results');
    if (!resultsContainer) return;

    if (!results || results.length === 0) {
        resultsContainer.innerHTML = '<p>No UPGs found within the specified radius.</p>';
        return;
    }

    let html = '<div class="results-grid">';
    results.forEach(upg => {
        const distance = Math.round(upg.distance * 10) / 10; // Round to 1 decimal place
        html += `
            <div class="upg-card">
                <h3>${upg.name}</h3>
                <p><strong>Country:</strong> ${upg.country}</p>
                <p><strong>Population:</strong> ${upg.population || 'Unknown'}</p>
                <p><strong>Religion:</strong> ${upg.religion || 'Unknown'}</p>
                <p><strong>Language:</strong> ${upg.language || 'Unknown'}</p>
                <p><strong>Distance:</strong> ${distance} km</p>
            </div>
        `;
    });
    html += '</div>';
    resultsContainer.innerHTML = html;
}

// Function to perform the search
function performSearch() {
    const countrySelect = document.getElementById('country');
    const upgSelect = document.getElementById('upg');
    const proximityInput = document.getElementById('proximity');
    const distanceUnit = document.querySelector('input[name="distanceUnit"]:checked');

    if (!upgSelect.value) {
        alert('Please select a UPG first');
        return;
    }

    const selectedOption = upgSelect.options[upgSelect.selectedIndex];
    const selectedLat = parseFloat(selectedOption.dataset.latitude);
    const selectedLng = parseFloat(selectedOption.dataset.longitude);
    const radius = convertToKilometers(parseFloat(proximityInput.value), distanceUnit.value);

    // Search through all UPGs to find those within the radius
    const results = peopleGroupsData.filter(upg => {
        if (!upg.latitude || !upg.longitude) return false;
        
        const distance = calculateDistance(
            selectedLat,
            selectedLng,
            parseFloat(upg.latitude),
            parseFloat(upg.longitude)
        );
        
        if (distance <= radius) {
            return { ...upg, distance };
        }
        return false;
    }).map(upg => ({
        ...upg,
        distance: calculateDistance(
            selectedLat,
            selectedLng,
            parseFloat(upg.latitude),
            parseFloat(upg.longitude)
        )
    }));

    // Sort results by distance
    results.sort((a, b) => a.distance - b.distance);

    // Display the results
    displayResults(results);
}

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
