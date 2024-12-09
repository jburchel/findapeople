document.addEventListener('DOMContentLoaded', function() {
    // Constants
    const JP_API_KEY = '080e14ad747e';
    const JP_API_BASE_URL = 'https://api.joshuaproject.net/v1';

    // Get DOM elements
    const countrySelect = document.getElementById('country');
    const upgSelect = document.getElementById('upg');
    const proximityInput = document.getElementById('proximity');
    const searchButton = document.getElementById('search');
    const resultsDiv = document.getElementById('results');
    const searchTypeInputs = document.getElementsByName('searchType');

    // Store both CSV datasets globally
    let existingUPGsData = [];
    let uupgData = [];

    // Function to load both CSV files
    async function loadCSVData() {
        try {
            // Load existing UPGs
            const existingResponse = await fetch('data/existing_upgs_updated.csv');
            const existingText = await existingResponse.text();
            existingUPGsData = parseCSV(existingText);

            // Load UUPGs
            const uupgResponse = await fetch('data/uupg_data.csv');
            const uupgText = await uupgResponse.text();
            uupgData = parseCSV(uupgText);

            // Populate dropdowns with existing UPGs data
            populateCountryDropdown(existingUPGsData);
        } catch (error) {
            console.error('Error loading CSV:', error);
            alert('Error loading people groups data. Please try again.');
        }
    }

    // Function to parse CSV
    function parseCSV(csvText) {
        const lines = csvText.split('\n');
        const headers = lines[0].split(',');
        const data = [];

        for(let i = 1; i < lines.length; i++) {
            if(!lines[i].trim()) continue; // Skip empty lines
            
            const values = lines[i].split(',');
            const entry = {};
            
            headers.forEach((header, index) => {
                entry[header.trim()] = values[index]?.trim() || '';
            });
            
            data.push(entry);
        }

        return data;
    }

    // Function to populate country dropdown
    function populateCountryDropdown(data) {
        const countries = [...new Set(data.map(row => row.country))].sort();
        
        countrySelect.innerHTML = '<option value="">--Select Country--</option>';
        countries.forEach(country => {
            if(country) {
                const option = document.createElement('option');
                option.value = country;
                option.textContent = country;
                countrySelect.appendChild(option);
            }
        });
    }

    // Function to populate UPG dropdown based on selected country
    function populateUPGDropdown(selectedCountry) {
        const upgs = existingUPGsData
            .filter(row => row.country === selectedCountry)
            .sort((a, b) => a.name.localeCompare(b.name));

        upgSelect.innerHTML = '<option value="">--Select UPG--</option>';
        upgs.forEach(upg => {
            const option = document.createElement('option');
            option.value = JSON.stringify({
                name: upg.name,
                lat: upg.latitude,
                lng: upg.longitude
            });
            option.textContent = upg.name;
            upgSelect.appendChild(option);
        });
        
        upgSelect.disabled = false;
    }

    // Function to calculate distance between two points
    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    // Function to search Joshua Project API
    async function searchJoshuaProject(lat, lng, radius) {
        try {
            const formattedLat = parseFloat(lat).toFixed(4);
            const formattedLng = parseFloat(lng).toFixed(4);
            
            const url = `${JP_API_BASE_URL}/people_groups.json?api_key=${JP_API_KEY}&latitude=${formattedLat}&longitude=${formattedLng}&radius=${radius}`;
            console.log('Calling Joshua Project API:', url);

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            // Log the first result to see its exact structure
            if (data.length > 0) {
                console.log('Sample API Response:', {
                    firstResult: data[0],
                    availableFields: Object.keys(data[0])
                });
            }

            // Calculate distances and filter results
            const filteredResults = data.filter(pg => {
                // Log the coordinates we're using
                console.log('Processing:', {
                    name: pg.PeopleID3,
                    latitude: pg.Latitude,
                    longitude: pg.Longitude,
                    distance: calculateDistance(
                        parseFloat(lat),
                        parseFloat(lng),
                        parseFloat(pg.Latitude),
                        parseFloat(pg.Longitude)
                    )
                });

                if (pg.Latitude && pg.Longitude) {
                    const distance = calculateDistance(
                        parseFloat(lat),
                        parseFloat(lng),
                        parseFloat(pg.Latitude),
                        parseFloat(pg.Longitude)
                    );
                    pg.distance = distance;
                    return distance <= radius;
                }
                return false;
            });

            console.log(`Found ${filteredResults.length} groups within ${radius} km`);

            return filteredResults.map(pg => ({
                name: pg.PeopNameInCountry || pg.PeopNameAcrossCountries,
                country: pg.Ctry,
                population: pg.Population,
                religion: pg.PrimaryReligion,
                distance: Math.round(pg.distance),
                type: 'FPG'
            }));
        } catch (error) {
            console.error('Error fetching from Joshua Project:', error);
            console.error('Full error details:', error.message);
            alert('Error fetching FPG data from Joshua Project. Check console for details.');
            return [];
        }
    }

    // Function to display results - updated to handle both data types
    function displayResults(results) {
        resultsDiv.style.display = 'block';
        if (results.length === 0) {
            resultsDiv.innerHTML = '<p>No people groups found within the specified radius.</p>';
            return;
        }

        // Sort results by distance
        const sortedResults = [...results].sort((a, b) => a.distance - b.distance);

        const html = `
            <h3>Found ${results.length} People Groups:</h3>
            <div class="results-grid">
                ${sortedResults.map(group => `
                    <div class="result-card">
                        <h4>${group.name}</h4>
                        <p>Type: ${group.type}</p>
                        <p>Country: ${group.country}</p>
                        <p>Population: ${group.population}</p>
                        <p>Religion: ${group.religion}</p>
                        <p>Distance: ${Math.round(group.distance)} km</p>
                    </div>
                `).join('')}
            </div>
        `;
        
        resultsDiv.innerHTML = html;
    }

    // Event Listeners
    countrySelect.addEventListener('change', function() {
        if(this.value) {
            populateUPGDropdown(this.value);
        } else {
            upgSelect.innerHTML = '<option value="">--Select UPG--</option>';
            upgSelect.disabled = true;
        }
    });

    searchButton.addEventListener('click', async function() {
        const selectedUPG = JSON.parse(upgSelect.value);
        const radius = parseInt(proximityInput.value);
        const searchType = Array.from(searchTypeInputs).find(input => input.checked).value;

        if (!selectedUPG || !radius) {
            alert('Please select a UPG and specify a radius');
            return;
        }

        resultsDiv.innerHTML = '<p>Searching...</p>';
        const results = [];
        
        // Search Joshua Project API for FPGs if needed
        if (searchType === 'fpg' || searchType === 'both') {
            console.log('Searching for FPGs with:', {
                lat: selectedUPG.lat,
                lng: selectedUPG.lng,
                radius: radius
            });
            
            const jpResults = await searchJoshuaProject(selectedUPG.lat, selectedUPG.lng, radius);
            console.log('FPG Results:', jpResults);
            if (jpResults.length) {
                results.push(...jpResults);
            }
        }

        // Search UUPG data if needed
        if (searchType === 'uupg' || searchType === 'both') {
            const uupgResults = uupgData.filter(group => {
                if (group.Latitude && group.Longitude) {
                    const distance = calculateDistance(
                        parseFloat(selectedUPG.lat),
                        parseFloat(selectedUPG.lng),
                        parseFloat(group.Latitude),
                        parseFloat(group.Longitude)
                    );
                    group.distance = distance;
                    return distance <= radius;
                }
                return false;
            });
            results.push(...uupgResults.map(r => ({
                name: r.PeopleName,
                country: r.country,
                population: r.Population,
                religion: r.PrimaryReligion,
                distance: r.distance,
                type: 'UUPG'
            })));
        }

        displayResults(results);
    });

    // Load CSV data when page loads
    loadCSVData();
}); 