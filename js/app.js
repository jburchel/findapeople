// Global variables to store data
let existingUPGData = [];
let uupgData = [];

// Function to load UUPG data
async function loadUUPGData() {
    try {
        const response = await fetch('data/updated_uupg.csv');
        const csvText = await response.text();
        uupgData = Papa.parse(csvText, { header: true }).data;
        console.log('Loaded UUPG data:', uupgData.length, 'entries');
    } catch (error) {
        console.error('Error loading UUPG data:', error);
    }
}

// Load the existing UPG data
async function loadExistingUPGData() {
    try {
        const response = await fetch('data/CG-Existing-UPG-Q1-2024.csv');
        const csvText = await response.text();
        existingUPGData = Papa.parse(csvText, { header: true }).data;
        console.log('Loaded existing UPG data:', existingUPGData.length, 'entries');
        populateCountryDropdown();
    } catch (error) {
        console.error('Error loading existing UPG data:', error);
    }
}

// Populate country dropdown from existing UPG data
function populateCountryDropdown() {
    const countrySelect = document.getElementById('country-select');
    if (!countrySelect) {
        console.error('Country select element not found');
        return;
    }
    
    const countries = [...new Set(existingUPGData
        .filter(upg => upg.country && upg.country.trim()) // Filter out empty countries
        .map(upg => upg.country.trim()))] // Use lowercase 'country' field
        .sort();
    
    console.log('Available countries:', countries);
    
    countrySelect.innerHTML = '<option value="">Select a Country</option>';
    countries.forEach(country => {
        const option = document.createElement('option');
        option.value = country;
        option.textContent = country;
        countrySelect.appendChild(option);
    });
}

// Update UPG dropdown when country is selected
function updateUPGDropdown(country) {
    const upgSelect = document.getElementById('upg-select');
    if (!upgSelect) {
        console.error('UPG select element not found');
        return;
    }
    
    const upgsInCountry = existingUPGData.filter(upg => 
        upg.country === country && upg.name && upg.name.trim()
    );
    console.log('UPGs in', country + ':', upgsInCountry);
    
    upgSelect.innerHTML = '<option value="">Select a UPG</option>';
    upgsInCountry.forEach(upg => {
        const option = document.createElement('option');
        option.value = JSON.stringify({
            name: upg.name,
            latitude: upg.latitude || '',
            longitude: upg.longitude || '',
            country: upg.country,
            religion: upg.religion || '',
            language: upg.language || ''
        });
        option.textContent = upg.name;
        upgSelect.appendChild(option);
    });
}

// Function to fetch FPG data from Joshua Project API
async function searchFPGs(lat, lng, radius) {
    try {
        const baseUrl = 'https://api.joshuaproject.net/v1/people_groups.json';
        const params = new URLSearchParams({
            api_key: window.appConfig.joshuaProjectApiKey,
            latitude: lat,
            longitude: lng,
            radius: radius,
            frontier_people_group: 1,
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

// Function to search UUPG data
function searchUUPGs(lat, lng, radius) {
    console.log('Searching UUPGs with params:', { lat, lng, radius });
    
    if (!uupgData || !uupgData.length) {
        console.error('No UUPG data available');
        return [];
    }
    
    return uupgData.filter(upg => {
        if (!upg.latitude || !upg.longitude) {
            return false;
        }
        
        const distance = calculateDistance(
            parseFloat(lat),
            parseFloat(lng),
            parseFloat(upg.latitude),
            parseFloat(upg.longitude)
        );
        
        return distance <= radius;
    }).map(upg => ({
        name: upg.name || 'Unknown',
        country: upg.country || 'Unknown',
        population: upg.population || 'Unknown',
        religion: upg.religion || 'Unknown',
        language: upg.language || 'Unknown',
        latitude: upg.latitude,
        longitude: upg.longitude,
        distance: calculateDistance(
            parseFloat(lat),
            parseFloat(lng),
            parseFloat(upg.latitude),
            parseFloat(upg.longitude)
        ),
        isUUPG: true
    }));
}

// Function to search for nearby people groups
async function searchNearbyGroups(selectedUPG, radius, searchType) {
    console.log('Searching near UPG:', selectedUPG, 'radius:', radius, 'type:', searchType);
    
    if (!selectedUPG.latitude || !selectedUPG.longitude) {
        console.error('Selected UPG does not have valid coordinates');
        return [];
    }
    
    const results = [];
    
    if (searchType === 'fpg' || searchType === 'both') {
        const fpgResults = await searchFPGs(
            parseFloat(selectedUPG.latitude),
            parseFloat(selectedUPG.longitude),
            radius
        );
        results.push(...fpgResults);
    }
    
    if (searchType === 'uupg' || searchType === 'both') {
        const uupgResults = searchUUPGs(
            parseFloat(selectedUPG.latitude),
            parseFloat(selectedUPG.longitude),
            radius
        );
        results.push(...uupgResults);
    }
    
    // Sort results by distance
    results.sort((a, b) => a.distance - b.distance);
    return results;
}

// Function to display search results
function displayResults(results) {
    const resultsContainer = document.getElementById('results-container');
    resultsContainer.innerHTML = ''; // Clear previous results
    
    if (!results || results.length === 0) {
        resultsContainer.innerHTML = '<p class="no-results">No people groups found in this area.</p>';
        return;
    }

    const resultsGrid = document.createElement('div');
    resultsGrid.className = 'results-grid';
    
    results.forEach(result => {
        const card = document.createElement('div');
        card.className = `card ${result.isUUPG ? 'uupg' : 'fpg'}`;
        card.innerHTML = `
            <h3>${result.name}</h3>
            <p><strong>Type:</strong> ${result.isUUPG ? 'UUPG' : 'FPG'}</p>
            <p><strong>Country:</strong> ${result.country}</p>
            <p><strong>Population:</strong> ${result.population}</p>
            <p><strong>Religion:</strong> ${result.religion}</p>
            <p><strong>Language:</strong> ${result.language}</p>
            <p><strong>Distance:</strong> ${Math.round(result.distance)} km</p>
        `;
        resultsGrid.appendChild(card);
    });
    
    resultsContainer.appendChild(resultsGrid);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    loadExistingUPGData();
    loadUUPGData();
    
    // Country selection event
    document.getElementById('country-select').addEventListener('change', (e) => {
        const selectedCountry = e.target.value;
        if (selectedCountry) {
            updateUPGDropdown(selectedCountry);
        }
    });
    
    // Form submission
    document.getElementById('search-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const upgSelect = document.getElementById('upg-select');
        const radiusInput = document.getElementById('radius');
        const searchTypeSelect = document.getElementById('search-type');
        
        if (!upgSelect.value) {
            alert('Please select a UPG');
            return;
        }
        
        const selectedUPG = JSON.parse(upgSelect.value);
        const radius = parseInt(radiusInput.value);
        const searchType = searchTypeSelect.value;
        
        const results = await searchNearbyGroups(selectedUPG, radius, searchType);
        displayResults(results);
    });
});
