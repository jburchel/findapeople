// Top 100 list management
let top100List = [];
const STORAGE_KEY = 'top100List';

export function loadTop100List() {
    const savedList = localStorage.getItem(STORAGE_KEY);
    top100List = savedList ? JSON.parse(savedList) : [];
    updateTop100Display();
}

export function saveTop100List() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(top100List));
}

export function addToTop100(upg) {
    if (top100List.length >= 100) {
        alert('Top 100 list is full. Remove some items before adding new ones.');
        return false;
    }
    
    if (!top100List.some(item => item.id === upg.id)) {
        top100List.push(upg);
        saveTop100List();
        updateTop100Display();
        return true;
    }
    return false;
}

export function removeFromTop100(peopleGroup) {
    const index = top100List.findIndex(item => item.id === peopleGroup.id);
    if (index !== -1) {
        top100List.splice(index, 1);
        saveTop100List();
        updateTop100Display();
        return true;
    }
    return false;
}

export function sortTop100List(field) {
    const direction = field === currentTop100SortField && 
                     currentTop100SortDirection === 'asc' ? 'desc' : 'asc';
    
    top100List.sort((a, b) => {
        let comparison = 0;
        switch(field) {
            case 'name':
                comparison = a.name.localeCompare(b.name);
                break;
            case 'country':
                comparison = a.country.localeCompare(b.country);
                break;
            case 'population':
                comparison = parseInt(a.population) - parseInt(b.population);
                break;
            case 'religion':
                comparison = a.religion.localeCompare(b.religion);
                break;
        }
        return direction === 'asc' ? comparison : -comparison;
    });
    
    currentTop100SortField = field;
    currentTop100SortDirection = direction;
    updateTop100Display();
}
