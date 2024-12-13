// Function to load and parse CSV data
async function loadCSVData() {
    try {
        const response = await fetch('/data/existing_upgs_updated.csv');
        const csvText = await response.text();
        return parseCSV(csvText);
    } catch (error) {
        console.error('Error loading CSV data:', error);
        return [];
    }
}

// Function to parse CSV data
function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',');
    
    return lines.slice(1)
        .filter(line => line.trim() !== '')
        .map(line => {
            const values = line.split(',');
            const entry = {};
            headers.forEach((header, index) => {
                entry[header.trim()] = values[index] ? values[index].trim() : '';
            });
            return entry;
        });
}

// Function to populate country dropdown
function populateCountryDropdown(data) {
    const countrySelect = document.getElementById('country');
    const countries = new Set(data.map(entry => entry.country).filter(Boolean));
    
    // Clear existing options except the default one
    countrySelect.innerHTML = '<option value="">--Select Country--</option>';
    
    // Add countries in alphabetical order
    [...countries].sort().forEach(country => {
        const option = document.createElement('option');
        option.value = country;
        option.textContent = country;
        countrySelect.appendChild(option);
    });
    
    // Enable the dropdown
    countrySelect.disabled = false;
}

// Initialize data loading when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    const data = await loadCSVData();
    if (data.length > 0) {
        populateCountryDropdown(data);
        
        // Add event listener for country selection
        const countrySelect = document.getElementById('country');
        countrySelect.addEventListener('change', function() {
            const upgSelect = document.getElementById('upg');
            if (this.value) {
                // Filter UPGs for selected country
                const countryUPGs = data.filter(entry => entry.country === this.value);
                upgSelect.innerHTML = '<option value="">--Select UPG--</option>';
                countryUPGs.forEach(upg => {
                    const option = document.createElement('option');
                    option.value = upg.name;
                    option.textContent = upg.name;
                    upgSelect.appendChild(option);
                });
                upgSelect.disabled = false;
            } else {
                upgSelect.innerHTML = '<option value="">--Select UPG--</option>';
                upgSelect.disabled = true;
            }
        });
    }
});
