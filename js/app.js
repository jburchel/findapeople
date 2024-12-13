// Global variables to store data
let existingUPGData = [];
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

// Load the existing UPG data
async function loadExistingUPGData() {
    try {
        const response = await fetch('data/existing_upgs_updated.csv');
        const csvText = await response.text();
        existingUPGData = Papa.parse(csvText, { header: true }).data;
        console.log('Loaded existing UPG data:', existingUPGData);
        populateCountryDropdown();
    } catch (error) {
        console.error('Error loading existing UPG data:', error);
    }
}

// Populate country dropdown from existing UPG data
function populateCountryDropdown() {
    const countrySelect = document.getElementById('country-select');
    const countries = [...new Set(existingUPGData.map(upg => upg.Country))].sort();
    
    countrySelect.innerHTML = '<option value="">Select a Country</option>';
    countries.forEach(country => {
        if (country) {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
            countrySelect.appendChild(option);
        }
    });
}

// Update UPG dropdown when country is selected
function updateUPGDropdown(country) {
    const upgSelect = document.getElementById('upg-select');
    const upgsInCountry = existingUPGData.filter(upg => upg.Country === country);
    
    upgSelect.innerHTML = '<option value="">Select a UPG</option>';
    upgsInCountry.forEach(upg => {
        const option = document.createElement('option');
        option.value = JSON.stringify({
            name: upg.PeopleName,
            latitude: upg.Latitude,
            longitude: upg.Longitude
        });
        option.textContent = upg.PeopleName;
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
    console.log('Total UUPGs to search:', uupgData.length);
    
    const results = uupgData.filter(upg => {
        if (!upg.Latitude || !upg.Longitude) {
            return false;
        }
        
        const distance = calculateDistance(
            lat,
            lng,
            parseFloat(upg.Latitude),
            parseFloat(upg.Longitude)
        );
        
        const withinRadius = distance <= radius;
        if (withinRadius) {
            console.log('Found UUPG within radius:', upg.PeopleName, distance);
        }
        return withinRadius;
    }).map(upg => ({
        name: upg.PeopleName,
        country: upg.Country,
        population: upg.Population,
        religion: upg.Religion,
        language: upg.Language,
        latitude: upg.Latitude,
        longitude: upg.Longitude,
        distance: calculateDistance(
            lat,
            lng,
            parseFloat(upg.Latitude),
            parseFloat(upg.Longitude)
        ),
        isUUPG: true
    }));

    console.log('UUPG search results:', results);
    return results;
}

// Function to search for nearby people groups
async function searchNearbyGroups(selectedUPG, radius, searchType) {
    console.log('Searching near UPG:', selectedUPG, 'radius:', radius, 'type:', searchType);
    const results = [];
    
    if (searchType === 'fpg' || searchType === 'both') {
        const fpgResults = await searchFPGs(selectedUPG.latitude, selectedUPG.longitude, radius);
        results.push(...fpgResults);
    }
    
    if (searchType === 'uupg' || searchType === 'both') {
        const uupgResults = searchUUPGs(selectedUPG.latitude, selectedUPG.longitude, radius);
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
        resultsContainer.innerHTML = '<p>No people groups found in this area.</p>';
        return;
    }

    console.log('Displaying results:', results);

    results.forEach(result => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <h3>${result.name}</h3>
            <p><strong>Type:</strong> ${result.isUUPG ? 'UUPG' : 'FPG'}</p>
            <p><strong>Country:</strong> ${result.country || 'N/A'}</p>
            <p><strong>Population:</strong> ${result.population || 'N/A'}</p>
            <p><strong>Religion:</strong> ${result.religion || 'N/A'}</p>
            <p><strong>Language:</strong> ${result.language || 'N/A'}</p>
            <p><strong>Distance:</strong> ${Math.round(result.distance)} km</p>
        `;
        resultsContainer.appendChild(card);
    });
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
