// UI related functions
import { calculateDistance, convertFromKilometers } from './utils.js';
import { addToTop100, removeFromTop100 } from './top100.js';

export function displayResults(results) {
    const resultsDiv = document.getElementById('searchResults');
    resultsDiv.innerHTML = '';

    if (!results || results.length === 0) {
        resultsDiv.innerHTML = '<p>No results found</p>';
        return;
    }

    const resultsContainer = document.createElement('div');
    resultsContainer.className = 'results-container';
    resultsDiv.appendChild(resultsContainer);

    const distanceUnit = document.querySelector('input[name="distanceUnit"]:checked').value;

    results.forEach(result => {
        const resultCard = document.createElement('div');
        resultCard.className = 'result-card';
        
        const displayDistance = result.distance ? 
            `${convertFromKilometers(result.distance, distanceUnit).toFixed(1)} ${distanceUnit}` : 
            'Distance unknown';

        resultCard.innerHTML = `
            <h3>${result.name}</h3>
            <p>Country: ${result.country}</p>
            <p>Population: ${result.population}</p>
            <p>Religion: ${result.religion}</p>
            <p>Distance: ${displayDistance}</p>
            <button onclick="addToTop100(${JSON.stringify(result)})">Add to Top 100</button>
        `;
        
        resultsContainer.appendChild(resultCard);
    });
}

export function updateTop100Display() {
    const container = document.getElementById('top-100-list');
    if (!container) return;

    container.innerHTML = top100List.map(item => `
        <div class="top-100-item">
            <span>${item.name}</span>
            <span>${item.country}</span>
            <span>${item.population}</span>
            <span>${item.religion}</span>
            <button onclick="removeFromTop100(${JSON.stringify(item)})">Remove</button>
        </div>
    `).join('');
}

export function createSortButtons() {
    const container = document.createElement('div');
    container.className = 'sort-buttons';
    
    ['name', 'country', 'population', 'religion'].forEach(field => {
        const button = document.createElement('button');
        button.textContent = `Sort by ${field}`;
        button.onclick = () => sortTop100List(field);
        container.appendChild(button);
    });
    
    return container;
}
