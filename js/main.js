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
    let top100List = [];

    // Add these variables at the top with your other state
    let currentSort = {
        column: null,
        direction: 'asc'
    };

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

        const sortedResults = [...results].sort((a, b) => a.distance - b.distance);

        const html = `
            <h3>Found ${results.length} People Groups:</h3>
            <p class="results-help">Click "Add to Top 100" to add a people group to your tracking list.</p>
            <div class="results-grid">
                ${sortedResults.map(group => `
                    <div class="result-card">
                        <h4>${group.name}</h4>
                        <p><strong>Type:</strong> ${group.type}</p>
                        <p><strong>Country:</strong> ${group.country || 'Unknown'}</p>
                        <p><strong>Population:</strong> ${group.population || 'Unknown'}</p>
                        <p><strong>Religion:</strong> ${group.religion || 'Unknown'}</p>
                        <p><strong>Distance:</strong> ${Math.round(group.distance)} km</p>
                        <button class="add-to-top-100" 
                                onclick="addToTop100(${JSON.stringify(group).replace(/"/g, '&quot;')})"
                                ${top100List.some(item => item.name === group.name) ? 'disabled' : ''}>
                            ${top100List.some(item => item.name === group.name) ? 'Already in Top 100' : 'Add to Top 100'}
                        </button>
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

    // Load saved Top 100 list
    loadTop100List();

    // Add click handlers for sort buttons
    document.querySelectorAll('.sort-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const column = e.target.dataset.sort;
            sortTop100List(column);
        });
    });
});

// Load saved Top 100 list from localStorage
function loadTop100List() {
    const savedList = localStorage.getItem('top100List');
    if (savedList) {
        top100List = JSON.parse(savedList);
        updateTop100Display();
    }
}

// Save Top 100 list to localStorage
function saveTop100List() {
    localStorage.setItem('top100List', JSON.stringify(top100List));
}

// Add UPG to Top 100 list
function addToTop100(upg) {
    if (top100List.length >= 100) {
        alert('Top 100 list is full. Remove some items before adding new ones.');
        return;
    }
    
    if (!top100List.some(item => item.name === upg.name)) {
        top100List.push(upg);
        saveTop100List();
        updateTop100Display();
        
        // Update the button state
        const button = document.querySelector(`button[onclick*="${upg.name.replace(/"/g, '\\"')}"]`);
        if (button) {
            button.disabled = true;
            button.textContent = 'Added to Top 100';
        }
    }
}

// Remove UPG from Top 100 list
function removeFromTop100(upgName) {
    top100List = top100List.filter(item => item.name !== upgName);
    saveTop100List();
    updateTop100Display();
}

// Update the Top 100 display
function updateTop100Display() {
    const top100Div = document.getElementById('top-100-list');
    top100Div.innerHTML = top100List.map((upg, index) => `
        <div class="top-100-item">
            <div class="item-name">
                <span class="item-number">${index + 1}.</span>
                ${upg.name}
                <button class="remove-from-top-100" onclick="removeFromTop100('${upg.name.replace("'", "\\'")}')">&times;</button>
            </div>
            <div class="item-country">${upg.country}</div>
            <div class="item-population">${upg.population}</div>
            <div class="item-religion">${upg.religion}</div>
        </div>
    `).join('');
}

// Add this new function for sorting
function sortTop100List(column) {
    const sortButton = document.querySelector(`[data-sort="${column}"]`);
    const allSortButtons = document.querySelectorAll('.sort-button');
    
    // Reset all buttons
    allSortButtons.forEach(btn => {
        btn.classList.remove('active');
        btn.removeAttribute('data-direction');
    });

    // Update sort direction
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.direction = 'asc';
    }

    // Update button state
    sortButton.classList.add('active');
    sortButton.setAttribute('data-direction', currentSort.direction);

    // Sort the list
    top100List.sort((a, b) => {
        let valueA = a[column];
        let valueB = b[column];

        // Handle population specially as it should be sorted numerically
        if (column === 'population') {
            valueA = parseInt(valueA.replace(/,/g, '')) || 0;
            valueB = parseInt(valueB.replace(/,/g, '')) || 0;
        }

        if (currentSort.direction === 'asc') {
            return valueA > valueB ? 1 : -1;
        } else {
            return valueA < valueB ? 1 : -1;
        }
    });

    updateTop100Display();
} 