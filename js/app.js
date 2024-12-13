// Main application logic
let peopleGroupsData = [];
let uupgData = [];

// Function to load UUPG data
async function loadUUPGData() {
    try {
        const response = await fetch('./data/updated_uupg.csv');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();
        uupgData = parseCSV(csvText);
        console.log('Loaded UUPG data:', uupgData.length, 'entries');
        return uupgData;
    } catch (error) {
        console.error('Error loading UUPG data:', error);
        return [];
    }
}

// Function to fetch FPG data from Joshua Project API
async function fetchFPGData(lat, lng, radius) {
    try {
        const baseUrl = 'https://api.joshuaproject.net/v1/people_groups.json';
        const params = new URLSearchParams({
            api_key: window.appConfig.joshuaProjectApiKey,
            latitude: lat,
            longitude: lng,
            radius: radius,
            frontier_people_group: 1, // Changed to 1 for true
            select: 'PeopleID,PeopleName,Latitude,Longitude,Population,PrimaryReligion,PrimaryLanguageName,CountryName'
        });

        console.log('Fetching FPGs with params:', Object.fromEntries(params));
        const response = await fetch(`${baseUrl}?${params}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('FPG API Response:', data);
        
        return data.map(fpg => ({
            name: fpg.PeopleName,
            country: fpg.CountryName,
            latitude: fpg.Latitude,
            longitude: fpg.Longitude,
            population: fpg.Population,
            religion: fpg.PrimaryReligion,
            language: fpg.PrimaryLanguageName,
            distance: calculateDistance(lat, lng, fpg.Latitude, fpg.Longitude),
            isFPG: true
        }));
    } catch (error) {
        console.error('Error fetching FPG data:', error);
        return [];
    }
}

// Function to display search results
function displayResults(results) {
    const resultsContainer = document.getElementById('results');
    if (!resultsContainer) return;

    if (!results || results.length === 0) {
        resultsContainer.innerHTML = '<p>No people groups found within the specified radius.</p>';
        return;
    }

    let html = '<div class="results-grid">';
    results.forEach(group => {
        const distance = Math.round(group.distance * 10) / 10; // Round to 1 decimal place
        const type = group.isUUPG ? 'UUPG' : 'FPG';
        html += `
            <div class="upg-card ${type.toLowerCase()}" data-type="${type}">
                <h3>${group.name || group.PeopleName}</h3>
                <p><strong>Type:</strong> ${type}</p>
                <p><strong>Country:</strong> ${group.country || group.Country}</p>
                <p><strong>Population:</strong> ${group.population || group.Population || 'Unknown'}</p>
                <p><strong>Religion:</strong> ${group.religion || group.Religion || 'Unknown'}</p>
                <p><strong>Language:</strong> ${group.language || group.Language || 'Unknown'}</p>
                <p><strong>Distance:</strong> ${distance} km</p>
            </div>
        `;
    });
    html += '</div>';
    resultsContainer.innerHTML = html;
}

// Function to perform the search
async function performSearch() {
    const countrySelect = document.getElementById('country');
    const upgSelect = document.getElementById('upg');
    const proximityInput = document.getElementById('proximity');
    const distanceUnit = document.querySelector('input[name="distanceUnit"]:checked');
    const searchType = document.querySelector('input[name="searchType"]:checked').value;

    if (!upgSelect.value) {
        alert('Please select a UPG first');
        return;
    }

    const selectedOption = upgSelect.options[upgSelect.selectedIndex];
    const selectedLat = parseFloat(selectedOption.dataset.latitude);
    const selectedLng = parseFloat(selectedOption.dataset.longitude);
    const radius = convertToKilometers(parseFloat(proximityInput.value), distanceUnit.value);

    console.log('Search parameters:', {
        country: countrySelect.value,
        upg: upgSelect.value,
        latitude: selectedLat,
        longitude: selectedLng,
        radius: radius,
        searchType: searchType
    });

    let results = [];
    
    // Search FPGs from Joshua Project API
    if (searchType === 'all' || searchType === 'fpg') {
        const fpgResults = await fetchFPGData(selectedLat, selectedLng, radius);
        results = results.concat(fpgResults);
    }

    // Search UUPGs from updated_uupg.csv
    if (searchType === 'all' || searchType === 'uupg') {
        const uupgResults = uupgData.filter(upg => {
            if (!upg.Latitude || !upg.Longitude) return false;
            
            const distance = calculateDistance(
                selectedLat,
                selectedLng,
                parseFloat(upg.Latitude),
                parseFloat(upg.Longitude)
            );
            
            return distance <= radius;
        }).map(upg => ({
            ...upg,
            distance: calculateDistance(
                selectedLat,
                selectedLng,
                parseFloat(upg.Latitude),
                parseFloat(upg.Longitude)
            ),
            isUUPG: true
        }));
        results = results.concat(uupgResults);
    }

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
    
    // Load UUPG data
    await loadUUPGData();
    
    // Event listeners for search functionality
    if (searchButton) {
        searchButton.addEventListener('click', performSearch);
    }
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);
