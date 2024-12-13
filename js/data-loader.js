// Global variable to store the CSV data
let upgsData = [];

// Function to load and parse CSV data
async function loadCSVData() {
    try {
        const response = await fetch('/data/existing_upgs_updated.csv');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();
        upgsData = parseCSV(csvText);
        return upgsData;
    } catch (error) {
        console.error('Error loading CSV data:', error);
        return [];
    }
}

// Function to parse CSV data
function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(header => header.trim());
    
    return lines.slice(1)
        .filter(line => line.trim() !== '')
        .map(line => {
            // Handle quoted values properly
            const values = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g) || [];
            const entry = {};
            headers.forEach((header, index) => {
                let value = values[index] || '';
                // Remove quotes and trim
                value = value.replace(/^"(.*)"$/, '$1').trim();
                entry[header] = value;
            });
            return entry;
        });
}

// Function to populate country dropdown
function populateCountryDropdown(data) {
    const countrySelect = document.getElementById('country');
    if (!countrySelect) {
        console.error('Country select element not found');
        return;
    }

    // Get unique countries and remove empty values
    const countries = [...new Set(data.map(entry => entry.country).filter(Boolean))];
    
    // Sort countries alphabetically
    countries.sort((a, b) => a.localeCompare(b));
    
    // Clear existing options except the default one
    countrySelect.innerHTML = '<option value="">--Select Country--</option>';
    
    // Add countries
    countries.forEach(country => {
        const option = document.createElement('option');
        option.value = country;
        option.textContent = country;
        countrySelect.appendChild(option);
    });
    
    // Enable the dropdown
    countrySelect.disabled = false;
}

// Function to populate UPG dropdown based on selected country
function populateUPGDropdown(selectedCountry) {
    const upgSelect = document.getElementById('upg');
    if (!upgSelect) {
        console.error('UPG select element not found');
        return;
    }

    // Filter UPGs for selected country
    const countryUPGs = upgsData.filter(entry => entry.country === selectedCountry);
    
    // Clear existing options
    upgSelect.innerHTML = '<option value="">--Select UPG--</option>';
    
    // Sort UPGs alphabetically by name
    countryUPGs.sort((a, b) => a.name.localeCompare(b.name));
    
    // Add UPGs
    countryUPGs.forEach(upg => {
        const option = document.createElement('option');
        option.value = upg.name;
        option.textContent = upg.name;
        // Store additional data as attributes
        option.dataset.latitude = upg.latitude;
        option.dataset.longitude = upg.longitude;
        option.dataset.population = upg.population;
        upgSelect.appendChild(option);
    });
    
    // Enable the dropdown
    upgSelect.disabled = false;
}

// Initialize data loading when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Loading CSV data...');
    const data = await loadCSVData();
    if (data.length > 0) {
        console.log('CSV data loaded successfully');
        populateCountryDropdown(data);
        
        // Add event listener for country selection
        const countrySelect = document.getElementById('country');
        countrySelect.addEventListener('change', function() {
            const upgSelect = document.getElementById('upg');
            if (this.value) {
                populateUPGDropdown(this.value);
            } else {
                upgSelect.innerHTML = '<option value="">--Select UPG--</option>';
                upgSelect.disabled = true;
            }
        });
    } else {
        console.error('No data loaded from CSV');
    }
});
