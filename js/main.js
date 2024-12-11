// Move Firebase database reference outside the DOMContentLoaded event
const database = firebase.database();
const top100Ref = database.ref('top100');

// Move these declarations to the global scope
let selectedUPGs = new Set();
let top100List = [];
let currentSearchResults = [];

// Add this near the top of your file with other global variables
window.removeFromTop100 = removeFromTop100;

// Move this outside the DOMContentLoaded event
window.currentSort = {
    column: null,
    direction: 'asc'
};

// Add these variables at the top of your file with other global variables
let currentTop100SortField = 'name';
let currentTop100SortDirection = 'asc';

// Define sortAndDisplayResults before it's used
function sortAndDisplayResults(sortBy) {
    if (!currentSearchResults.length) return;
    
    console.log('Sorting by:', sortBy);
    
    const sortedResults = [...currentSearchResults].sort((a, b) => {
        switch(sortBy) {
            case 'type':
                return (a.type || '').localeCompare(b.type || '');
            case 'country':
                return (a.country || '').localeCompare(b.country || '');
            case 'population':
                const popA = parseInt((a.population || '0').replace(/[^\d]/g, '')) || 0;
                const popB = parseInt((b.population || '0').replace(/[^\d]/g, '')) || 0;
                return popB - popA; // Descending order for population
            case 'religion':
                return (a.religion || '').localeCompare(b.religion || '');
            case 'distance':
                return (a.distance || 0) - (b.distance || 0);
            default:
                return 0;
        }
    });

    // Display sorted results without saving them as new results
    displayResults(sortedResults, false);
}

// Make sortAndDisplayResults globally accessible
window.sortAndDisplayResults = sortAndDisplayResults;

// Define displayResults before it's used
function displayResults(results, saveResults = true) {
    if (saveResults) {
        currentSearchResults = results;
    }

    const resultsDiv = document.getElementById('results');
    if (!resultsDiv) return;
    
    resultsDiv.style.display = 'block';

    if (results.length === 0) {
        resultsDiv.innerHTML = '<p>No people groups found within the specified radius.</p>';
        return;
    }

    // Get current sort selection if it exists
    const currentSort = document.getElementById('sort-results')?.value || 'distance';

    // Create the HTML
    const html = `
        <h3>Found ${results.length} People Groups:</h3>
        <div class="sort-dropdown-container">
            <label for="sort-results">Sort By:</label>
            <select id="sort-results">
                <option value="distance" ${currentSort === 'distance' ? 'selected' : ''}>Distance</option>
                <option value="type" ${currentSort === 'type' ? 'selected' : ''}>Type</option>
                <option value="country" ${currentSort === 'country' ? 'selected' : ''}>Country</option>
                <option value="population" ${currentSort === 'population' ? 'selected' : ''}>Population</option>
                <option value="religion" ${currentSort === 'religion' ? 'selected' : ''}>Religion</option>
            </select>
        </div>
        <p class="results-help">Select UPGs to add them to your Top 100 list</p>
        <div class="results-grid">
            ${results.map(group => {
                // Ensure all values exist to prevent undefined errors
                const groupData = {
                    name: group.name || '',
                    type: group.type || 'Unknown',
                    country: group.country || 'Unknown',
                    population: group.population || 'Unknown',
                    religion: group.religion || 'Unknown',
                    distance: Math.round(group.distance || 0)
                };

                return `
                    <div class="result-card ${window.selectedUPGs.has(groupData.name) ? 'selected' : ''}">
                        <input type="checkbox" 
                               class="select-upg" 
                               value="${groupData.name}"
                               ${window.selectedUPGs.has(groupData.name) ? 'checked' : ''}
                               ${window.top100List.some(item => item.name === groupData.name) ? 'disabled' : ''}>
                        <h4>${groupData.name}</h4>
                        <p><strong>Type:</strong> ${groupData.type}</p>
                        <p><strong>Country:</strong> ${groupData.country}</p>
                        <p><strong>Population:</strong> ${groupData.population}</p>
                        <p><strong>Religion:</strong> ${groupData.religion}</p>
                        <p><strong>Distance:</strong> ${groupData.distance} km</p>
                        ${window.top100List.some(item => item.name === groupData.name) ? 
                            '<p class="already-added">Already in Top 100</p>' : ''}
                    </div>
                `;
            }).join('')}
        </div>
        <button id="add-selected" class="add-selected-button">Add Selected to Top 100</button>
    `;

    // Update the DOM
    resultsDiv.innerHTML = html;

    // Add event listeners for checkboxes
    document.querySelectorAll('.select-upg').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const card = e.target.closest('.result-card');
            if (e.target.checked) {
                window.selectedUPGs.add(e.target.value);
                card.classList.add('selected');
            } else {
                window.selectedUPGs.delete(e.target.value);
                card.classList.remove('selected');
            }
        });
    });

    // Add event listener for Add Selected button
    const addSelectedButton = document.getElementById('add-selected');
    if (addSelectedButton) {
        addSelectedButton.addEventListener('click', addSelectedToTop100);
    }

    // Reattach sort event listener
    const sortResultsSelect = document.getElementById('sort-results');
    if (sortResultsSelect) {
        sortResultsSelect.value = currentSort; // Ensure the correct option is selected
        sortResultsSelect.addEventListener('change', function(e) {
            console.log('Sort dropdown changed:', e.target.value);
            sortAndDisplayResults(e.target.value);
        });
    }
}

// Make displayResults globally accessible
window.displayResults = displayResults;

document.addEventListener('DOMContentLoaded', function() {
    // Constants
    const JP_API_KEY = '080e14ad747e';
    const JP_API_BASE_URL = 'https://joshuaproject.net/api/v2';

    // Get DOM elements
    const countrySelect = document.getElementById('country');
    const upgSelect = document.getElementById('upg');
    const proximityInput = document.getElementById('proximity');
    const searchButton = document.getElementById('search');
    const resultsDiv = document.getElementById('results');
    const searchTypeInputs = document.getElementsByName('searchType');

    // Store CSV datasets globally
    let existingUPGsData = [];
    let uupgData = [];

    // Function to load both CSV files
    async function loadCSVData() {
        try {
            // Load existing UPGs
            console.log('Fetching existing UPGs CSV file...');
            const existingResponse = await fetch('data/existing_upgs_updated.csv');
            if (!existingResponse.ok) {
                throw new Error(`HTTP error! status: ${existingResponse.status}`);
            }
            const existingText = await existingResponse.text();
            console.log('Existing UPGs CSV loaded successfully');
            
            existingUPGsData = parseCSV(existingText);
            console.log('Parsed existing UPGs data:', existingUPGsData.slice(0, 2));

            // Load UUPGs
            console.log('Fetching UUPG CSV file...');
            const uupgResponse = await fetch('data/uupg_data.csv');
            if (!uupgResponse.ok) {
                throw new Error(`HTTP error! status: ${uupgResponse.status}`);
            }
            const uupgText = await uupgResponse.text();
            console.log('UUPG CSV loaded successfully');
            
            uupgData = parseCSV(uupgText);

            // Populate dropdowns with existing UPGs data
            populateCountryDropdown(existingUPGsData);
        } catch (error) {
            console.error('Error loading CSV:', error);
            console.error('Full error:', error.message);
            alert('Error loading people groups data. Please check that both CSV files exist in the data folder.');
        }
    }

    // Function to parse CSV
    function parseCSV(csvText) {
        const lines = csvText.split('\n');
        console.log('CSV lines count:', lines.length);
        console.log('First line (headers):', lines[0]);
        
        const headers = lines[0].split(',');
        console.log('Headers found:', headers);
        
        const data = [];

        for(let i = 1; i < lines.length; i++) {
            if(!lines[i].trim()) continue;
            
            const values = lines[i].split(',');
            const entry = {};
            
            headers.forEach((header, index) => {
                let value = values[index]?.trim() || '';
                value = value.replace(/^["']|["']$/g, '');
                entry[header.trim()] = value;
            });
            
            if (i <= 3) {
                console.log(`Sample entry ${i}:`, entry);
            }
            
            data.push(entry);
        }

        console.log(`Total entries parsed: ${data.length}`);
        return data;
    }

    // Function to populate country dropdown
    function populateCountryDropdown(data) {
        console.log('Starting populateCountryDropdown with data length:', data.length);
        
        // Check what property name is being used for country
        const sampleEntry = data[0];
        console.log('Sample entry properties:', Object.keys(sampleEntry));
        console.log('Sample entry:', sampleEntry);
        
        // Try to find the country property
        const countryProperty = Object.keys(sampleEntry).find(key => 
            key.toLowerCase().includes('country') || 
            key.toLowerCase() === 'nation' || 
            key.toLowerCase() === 'location'
        );
        
        console.log('Found country property:', countryProperty);
        
        const countries = [...new Set(data.map(row => row[countryProperty]))].sort();
        console.log('Unique countries found:', countries);
        
        countrySelect.innerHTML = '<option value="">--Select Country--</option>';
        countries.forEach(country => {
            if(country) {
                const option = document.createElement('option');
                option.value = country;
                option.textContent = country;
                countrySelect.appendChild(option);
            }
        });
        
        console.log('Dropdown populated with options count:', countrySelect.options.length);
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
        // Convert coordinates from strings and validate
        lat1 = parseFloat(lat1);
        lon1 = parseFloat(lon1);
        lat2 = parseFloat(lat2);
        lon2 = parseFloat(lon2);

        // Validate coordinates
        if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
            console.warn('Invalid coordinates:', { lat1, lon1, lat2, lon2 });
            return Infinity; // Return Infinity to exclude invalid coordinates
        }

        // Convert to radians
        const lat1Rad = (lat1 * Math.PI) / 180;
        const lon1Rad = (lon1 * Math.PI) / 180;
        const lat2Rad = (lat2 * Math.PI) / 180;
        const lon2Rad = (lon2 * Math.PI) / 180;

        // Haversine formula
        const dLat = lat2Rad - lat1Rad;
        const dLon = lon2Rad - lon1Rad;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = 6371 * c; // Earth's radius in km * c

        console.log(`Distance calculation:`, {
            from: `${lat1},${lon1}`,
            to: `${lat2},${lon2}`,
            distance: `${distance.toFixed(2)}km`
        });

        return distance;
    }

    // Function to search Joshua Project API
    async function searchJoshuaProject(lat, lng, radius) {
        try {
            const formattedLat = parseFloat(lat).toFixed(4);
            const formattedLng = parseFloat(lng).toFixed(4);
            
            console.log(`Searching from coordinates: ${formattedLat}, ${formattedLng} with radius ${radius}km`);

            const url = `${JP_API_BASE_URL}/people_groups`;
            const params = {
                api_key: JP_API_KEY,
                latitude: formattedLat,
                longitude: formattedLng,
                radius: radius,
                fields: 'PeopleID3,PeopNameInCountry,PeopNameAcrossCountries,Ctry,Population,PrimaryReligion,Latitude,Longitude,PercentEvangelical,PercentAdherents',
                jpscale: '1',
                least_reached: 'Y',
                pc_adherent_lt: '2',
                pc_evangelical_lt: '0.1'
            };

            console.log('API request params:', params);
            
            const response = await fetch(`${url}?${new URLSearchParams(params)}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Raw API response:', data);

            if (!data.data || !Array.isArray(data.data)) {
                console.log('No data returned from API');
                return [];
            }

            // Filter and process results with strict distance checking
            const filteredResults = data.data.filter(pg => {
                // Validate coordinates
                if (!pg.Latitude || !pg.Longitude) {
                    console.log(`Skipping ${pg.PeopNameInCountry}: Missing coordinates`);
                    return false;
                }

                const distance = calculateDistance(
                    formattedLat,
                    formattedLng,
                    pg.Latitude,
                    pg.Longitude
                );

                // Log each potential match
                console.log(`${pg.PeopNameInCountry} (${pg.Ctry}):`, {
                    coordinates: `${pg.Latitude},${pg.Longitude}`,
                    distance: `${distance.toFixed(2)}km`,
                    withinRadius: distance <= radius
                });

                if (distance <= radius) {
                    pg.distance = distance;
                    return true;
                }
                return false;
            });

            console.log(`Found ${filteredResults.length} FPGs within ${radius}km radius`);

            // Sort by distance
            const sortedResults = filteredResults
                .sort((a, b) => a.distance - b.distance)
                .map(pg => ({
                    name: pg.PeopNameInCountry || pg.PeopNameAcrossCountries,
                    country: pg.Ctry,
                    population: pg.Population,
                    religion: pg.PrimaryReligion,
                    distance: Math.round(pg.distance),
                    type: 'FPG',
                    evangelical: pg.PercentEvangelical,
                    adherents: pg.PercentAdherents,
                    coordinates: `${pg.Latitude},${pg.Longitude}` // Add coordinates for verification
                }));

            console.log('Final filtered and sorted results:', sortedResults);
            return sortedResults;

        } catch (error) {
            console.error('Error fetching FPG data:', error);
            console.error('Full error details:', error.message);
            alert('Error fetching FPG data from Joshua Project. Check console for details.');
            return [];
        }
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
        
        try {
            if (searchType === 'fpg' || searchType === 'both') {
                const jpResults = await searchJoshuaProject(selectedUPG.lat, selectedUPG.lng, radius);
                if (jpResults.length) {
                    results.push(...jpResults);
                }
            }

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
                    country: r.CountryName,
                    population: r.Population,
                    religion: r.PrimaryReligion,
                    distance: Math.round(r.distance),
                    type: 'UUPG'
                })));
            }

            // Sort initially by distance
            const sortedResults = results.sort((a, b) => a.distance - b.distance);
            
            // Store the results globally and display them
            currentSearchResults = sortedResults;
            displayResults(sortedResults);

        } catch (error) {
            console.error('Error during search:', error);
            resultsDiv.innerHTML = '<p>An error occurred during the search. Please try again.</p>';
        }
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

    // Add sort handler for results
    const sortResultsSelect = document.getElementById('sort-results');
    if (sortResultsSelect) {
        sortResultsSelect.addEventListener('change', function(e) {
            console.log('Sort dropdown changed:', e.target.value); // Debug log
            sortAndDisplayResults(e.target.value);
        });
    }
});

// Load saved Top 100 list from localStorage
function loadTop100List() {
    console.log('Setting up Firebase listener...');
    window.top100Ref.on('value', 
        (snapshot) => {
            console.log('Received Firebase update, raw data:', snapshot.val());
            const data = snapshot.val();
            window.top100List = data ? Object.values(data) : [];
            console.log('Processed top100List:', window.top100List);
            updateTop100Display();
        },
        (error) => {
            console.error('Error loading from Firebase:', error);
            console.error('Full error:', error.message);
            alert('Error loading data from database. Please refresh the page.');
        }
    );
}

// Save Top 100 list to localStorage
function saveTop100List() {
    console.log('Saving to Firebase:', window.top100List);
    return window.top100Ref.set(Object.assign({}, window.top100List))
        .then(() => {
            console.log('Successfully saved to Firebase');
        })
        .catch(error => {
            console.error('Error saving to Firebase:', error);
            // Only show error for non-connection issues
            if (!error.message.includes('connection') && !error.message.includes('network')) {
                alert('Error saving to database. Please try again.');
            }
        });
}

// Add UPG to Top 100 list
function addToTop100(upg) {
    if (window.top100List.length >= 100) {
        alert('Top 100 list is full. Remove some items before adding new ones.');
        return;
    }
    
    if (!window.top100List.some(item => item.name === upg.name)) {
        window.top100List.push(upg);
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
    console.log('Removing UPG:', upgName);
    window.top100List = window.top100List.filter(item => item.name !== upgName);
    
    // Save to Firebase
    window.top100Ref.set(Object.assign({}, window.top100List))
        .then(() => {
            console.log('Successfully removed from Firebase');
            updateTop100Display();
        })
        .catch(error => {
            console.error('Error saving to Firebase:', error);
            alert('Error removing from database. Please try again.');
        });
}

// Update the Top 100 display
function updateTop100Display() {
    const top100Div = document.getElementById('top-100-list');
    if (!top100Div) return;
    
    top100Div.innerHTML = window.top100List.map((upg, index) => `
        <div class="top-100-item">
            <div class="item-name">
                <span class="item-number">${index + 1}.</span>
                ${upg.name}
            </div>
            <div class="item-country">${upg.country || 'Unknown'}</div>
            <div class="item-population">${upg.population || 'Unknown'}</div>
            <div class="item-religion">${upg.religion || 'Unknown'}</div>
            <button class="remove-from-top-100" 
                    onclick="removeFromTop100('${upg.name.replace(/'/g, "\\'")}')"
                    title="Remove from list">Delete</button>
        </div>
    `).join('');
}

// Add this function to handle the sorting of Top 100 list
function sortTop100List(field) {
    // Toggle sort direction if clicking the same field
    if (field === currentTop100SortField) {
        currentTop100SortDirection = currentTop100SortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentTop100SortField = field;
        currentTop100SortDirection = 'asc';
    }

    // Sort the top100List array
    window.top100List.sort((a, b) => {
        let valueA, valueB;
        
        switch (field) {
            case 'name':
                valueA = a.PeopNameInCountry || '';
                valueB = b.PeopNameInCountry || '';
                break;
            case 'country':
                valueA = a.ROG3 || '';
                valueB = b.ROG3 || '';
                break;
            case 'population':
                valueA = parseInt(a.Population) || 0;
                valueB = parseInt(b.Population) || 0;
                return currentTop100SortDirection === 'asc' ? valueA - valueB : valueB - valueA;
            case 'religion':
                valueA = a.PrimaryReligion || '';
                valueB = b.PrimaryReligion || '';
                break;
            default:
                valueA = '';
                valueB = '';
        }

        // For string comparisons
        if (currentTop100SortDirection === 'asc') {
            return valueA.toString().localeCompare(valueB.toString());
        } else {
            return valueB.toString().localeCompare(valueA.toString());
        }
    });

    // Update the display
    displayTop100List();
}

// Modify your displayTop100List function to include sort indicators
function displayTop100List() {
    const top100Container = document.getElementById('top100-list');
    if (!top100Container) return;

    // Update sort indicators in column headers
    document.querySelectorAll('.sort-header').forEach(header => {
        const field = header.getAttribute('data-sort');
        const indicator = currentTop100SortField === field 
            ? (currentTop100SortDirection === 'asc' ? ' ↑' : ' ↓') 
            : '';
        header.textContent = header.getAttribute('data-label') + indicator;
    });

    // Rest of your existing displayTop100List code...
}

// Make the function globally accessible
window.sortTop100List = sortTop100List;

// Add this new function to handle adding multiple UPGs
function addSelectedToTop100() {
    console.log('Adding selected UPGs...', window.selectedUPGs);
    
    const selectedResults = Array.from(window.selectedUPGs).map(name => {
        const card = document.querySelector(`.result-card:has(input[value="${name}"])`);
        if (card) {
            return {
                name: name,
                type: card.querySelector('p:nth-child(3)').textContent.split(': ')[1],
                country: card.querySelector('p:nth-child(4)').textContent.split(': ')[1],
                population: card.querySelector('p:nth-child(5)').textContent.split(': ')[1],
                religion: card.querySelector('p:nth-child(6)').textContent.split(': ')[1],
                distance: parseInt(card.querySelector('p:nth-child(7)').textContent.split(': ')[1])
            };
        }
        return null;
    }).filter(Boolean);

    let addedCount = 0;
    for (let upg of selectedResults) {
        if (window.top100List.length >= 100) {
            alert('Top 100 list is full. Not all selections could be added.');
            break;
        }
        if (!window.top100List.some(item => item.name === upg.name)) {
            window.top100List.push(upg);
            addedCount++;
        }
    }

    if (addedCount > 0) {
        // Save to Firebase
        window.top100Ref.set(Object.assign({}, window.top100List))
            .then(() => {
                console.log('Successfully saved to Firebase');
                window.selectedUPGs.clear();
                alert(`Added ${addedCount} UPG${addedCount > 1 ? 's' : ''} to Top 100 list`);
                updateTop100Display();
                displayResults(Array.from(document.querySelectorAll('.result-card')).map(card => ({
                    name: card.querySelector('h4').textContent,
                    type: card.querySelector('p:nth-child(3)').textContent.split(': ')[1],
                    country: card.querySelector('p:nth-child(4)').textContent.split(': ')[1],
                    population: card.querySelector('p:nth-child(5)').textContent.split(': ')[1],
                    religion: card.querySelector('p:nth-child(6)').textContent.split(': ')[1],
                    distance: parseInt(card.querySelector('p:nth-child(7)').textContent.split(': ')[1])
                })));
            })
            .catch(error => {
                console.error('Error saving to Firebase:', error);
                alert('Error saving to database. Please try again.');
            });
    }
} 