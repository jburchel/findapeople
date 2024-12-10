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

// Move displayResults outside of DOMContentLoaded and make it globally accessible
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

    const sortedResults = [...results].sort((a, b) => a.distance - b.distance);

    const html = `
        <h3>Found ${results.length} People Groups:</h3>
        <p class="results-help">Select UPGs to add them to your Top 100 list</p>
        <div class="results-grid">
            ${sortedResults.map(group => `
                <div class="result-card ${window.selectedUPGs.has(group.name) ? 'selected' : ''}">
                    <input type="checkbox" 
                           class="select-upg" 
                           value="${group.name}"
                           ${window.selectedUPGs.has(group.name) ? 'checked' : ''}
                           ${window.top100List.some(item => item.name === group.name) ? 'disabled' : ''}>
                    <h4>${group.name}</h4>
                    <p><strong>Type:</strong> ${group.type}</p>
                    <p><strong>Country:</strong> ${group.country || 'Unknown'}</p>
                    <p><strong>Population:</strong> ${group.population || 'Unknown'}</p>
                    <p><strong>Religion:</strong> ${group.religion || 'Unknown'}</p>
                    <p><strong>Distance:</strong> ${Math.round(group.distance)} km</p>
                    ${window.top100List.some(item => item.name === group.name) ? 
                        '<p class="already-added">Already in Top 100</p>' : ''}
                </div>
            `).join('')}
        </div>
        <button id="add-selected" class="add-selected-button">Add Selected to Top 100</button>
    `;

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
}

// Make displayResults globally accessible
window.displayResults = displayResults;

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

// Update sortTop100List to use window.currentSort
function sortTop100List(column) {
    const sortButton = document.querySelector(`[data-sort="${column}"]`);
    const allSortButtons = document.querySelectorAll('.sort-button');
    
    allSortButtons.forEach(btn => {
        btn.classList.remove('active');
        btn.removeAttribute('data-direction');
    });

    if (window.currentSort.column === column) {
        window.currentSort.direction = window.currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        window.currentSort.column = column;
        window.currentSort.direction = 'asc';
    }

    sortButton.classList.add('active');
    sortButton.setAttribute('data-direction', window.currentSort.direction);

    window.top100List.sort((a, b) => {
        let valueA = a[column];
        let valueB = b[column];

        if (column === 'population') {
            valueA = parseInt(valueA.replace(/,/g, '')) || 0;
            valueB = parseInt(valueB.replace(/,/g, '')) || 0;
        }

        return window.currentSort.direction === 'asc' 
            ? (valueA > valueB ? 1 : -1)
            : (valueA < valueB ? 1 : -1);
    });

    updateTop100Display();
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

// Add these new functions
function sortAndDisplayResults(sortBy) {
    if (!currentSearchResults.length) return;
    
    console.log('Sorting by:', sortBy); // Debug log
    console.log('Results before sort:', currentSearchResults); // Debug log

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

    console.log('Results after sort:', sortedResults); // Debug log
    displayResults(sortedResults, false);
} 