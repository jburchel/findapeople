import pandas as pd
import requests
import time
from typing import Dict, Optional
import json

# Configuration
INPUT_FILE = 'data/CG-Existing-UPG-Q1-2024.csv'
UUPG_FILE = 'data/uupg_data.csv'
OUTPUT_FILE = 'data/existing_upgs_updated.csv'
DELAY_BETWEEN_REQUESTS = 1
API_KEY = '080e14ad747e'
BASE_URL = 'https://joshuaproject.net/api/v2'

# Dictionary of country capitals with their coordinates
COUNTRY_CAPITALS = {
    'Azerbaijan': {'lat': 40.4093, 'lon': 49.8671},
    'Georgia': {'lat': 41.7151, 'lon': 44.8271},
    'India': {'lat': 28.6139, 'lon': 77.2090},
    'Indonesia': {'lat': -6.2088, 'lon': 106.8456},
    'Albania': {'lat': 41.3275, 'lon': 19.8187},
    'Algeria': {'lat': 36.7538, 'lon': 3.0588},
    'Morocco': {'lat': 34.0209, 'lon': -6.8416},
    'Jordan': {'lat': 31.9454, 'lon': 35.9284},
    'Russia': {'lat': 55.7558, 'lon': 37.6173},
    'Turkey': {'lat': 39.9334, 'lon': 32.8597},
    'Tunisia': {'lat': 36.8065, 'lon': 10.1815},
    'Iran': {'lat': 35.6892, 'lon': 51.3890},
    'Nepal': {'lat': 27.7172, 'lon': 85.3240},
    'Turkmenistan': {'lat': 37.9601, 'lon': 58.3261},
    'Mauratania': {'lat': 18.0735, 'lon': -15.9582},
    'China': {'lat': 39.9042, 'lon': 116.4074}
}

def get_coordinates_from_uupg(people_group: str, country: str) -> Optional[Dict]:
    """Try to find coordinates in the UUPG data file"""
    try:
        uupg_df = pd.read_csv(UUPG_FILE)
        
        # Debug output
        print("\nSearching UUPG data:")
        print(f"Looking for people group: '{people_group}' in country: '{country}'")
        
        # Check if the people group exists at all
        people_matches = uupg_df[uupg_df['PeopleName'].str.lower() == people_group.lower()]
        if not people_matches.empty:
            print(f"Found {len(people_matches)} entries with name '{people_group}'")
            print("Countries found:", people_matches['Country'].tolist())
        else:
            print(f"No entries found with name '{people_group}'")
        
        # Check if the country exists
        country_matches = uupg_df[uupg_df['Country'].str.lower() == country.lower()]
        if not country_matches.empty:
            print(f"Found {len(country_matches)} entries for country '{country}'")
        else:
            print(f"No entries found for country '{country}'")
        
        # Original matching logic
        match = uupg_df[
            (uupg_df['PeopleName'].str.lower() == people_group.lower()) & 
            (uupg_df['Country'].str.lower() == country.lower())
        ]
        
        if not match.empty:
            row = match.iloc[0]
            print(f"Found match in UUPG data for {people_group}")
            return {
                'name': people_group,
                'country': country,
                'latitude': str(row['Latitude']),
                'longitude': str(row['Longitude']),
                'population': str(row.get('Population', '')),
                'evangelical': str(row.get('PercentEvangelical', '')),
                'language': row.get('PrimaryLanguageName', ''),
                'religion': row.get('PrimaryReligion', ''),
                'description': row.get('Description', '')
            }
        else:
            print("No exact match found in UUPG data")
            
    except Exception as e:
        print(f"Error checking UUPG data: {str(e)}")
        print(f"Error details: {str(e.__class__.__name__)}")
        import traceback
        traceback.print_exc()
    return None

def get_capital_coordinates(country: str) -> Optional[Dict[str, float]]:
    """Get coordinates for country capital"""
    return COUNTRY_CAPITALS.get(country)

def get_people_group_data(people_group: str, country: str) -> Optional[Dict]:
    try:
        url = f"{BASE_URL}/people_groups"
        params = {
            'api_key': API_KEY,
            'fields': 'PeopleID3,Latitude,Longitude,Population,PercentEvangelical,PrimaryLanguageName,PrimaryReligion,Description',
            'country': country,
            'peo_name': people_group,
            'limit': 25
        }
        
        print(f"\nQuerying API for: {people_group} in {country}")
        response = requests.get(url, params=params)
        
        if response.status_code != 200:
            print(f"API Error: {response.status_code} - {response.text}")
            return None
            
        data = response.json()
        
        if not data.get('data'):
            print(f"No data found for {people_group} in {country}")
            # Try UUPG data
            uupg_data = get_coordinates_from_uupg(people_group, country)
            if uupg_data:
                return uupg_data
            # If no UUPG data, try capital coordinates
            capital_coords = get_capital_coordinates(country)
            if capital_coords:
                print(f"Using capital coordinates for {country}")
                return {
                    'name': people_group,
                    'country': country,
                    'latitude': str(capital_coords['lat']),
                    'longitude': str(capital_coords['lon']),
                    'population': '',
                    'evangelical': '',
                    'language': '',
                    'religion': '',
                    'description': ''
                }
            return None
        
        matches = data['data']
        print(f"Found {len(matches)} potential matches")
        
        # Filter matches by country first
        country_matches = [
            m for m in matches 
            if m.get('Ctry', '').lower() == country.lower()
        ]
        
        if country_matches:
            print(f"Found {len(country_matches)} matches in {country}")
            matches = country_matches
        else:
            print(f"Warning: No matches found in {country}")
            # Try UUPG data before giving up
            uupg_data = get_coordinates_from_uupg(people_group, country)
            if uupg_data:
                return uupg_data
            return None
            
        # Try to find best match by name
        best_match = None
        for match in matches:
            name_in_country = match.get('PeopNameInCountry', '').lower()
            if name_in_country == people_group.lower():
                best_match = match
                print(f"Found exact name match: {match.get('PeopNameInCountry')}")
                break
        
        # If no exact name match, take first match in correct country
        if not best_match and matches:
            best_match = matches[0]
            print(f"Using first match in country: {best_match.get('PeopNameInCountry')}")
            
        if not best_match:
            print(f"No suitable match found for {people_group}")
            return None
            
        # Get coordinates from the best match
        lat = best_match.get('Latitude')
        lon = best_match.get('Longitude')
        
        print(f"Raw coordinates from API: lat={lat}, lon={lon}")
        
        # If coordinates are missing, try to use country capital
        if not lat or not lon:
            capital_coords = get_capital_coordinates(country)
            if capital_coords:
                lat = capital_coords['lat']
                lon = capital_coords['lon']
                print(f"Using capital coordinates: {lat}, {lon}")
            else:
                print(f"Warning: No capital coordinates found for {country}")
                return None
            
        try:
            lat_float = float(lat)
            lon_float = float(lon)
            if not (-90 <= lat_float <= 90 and -180 <= lon_float <= 180):
                print(f"Warning: Invalid coordinates for {people_group}: {lat}, {lon}")
                return None
        except (ValueError, TypeError):
            print(f"Warning: Invalid coordinate format for {people_group}: {lat}, {lon}")
            return None

        result = {
            'name': people_group,
            'country': country,
            'latitude': str(lat_float),
            'longitude': str(lon_float),
            'population': str(best_match.get('Population', '')),
            'evangelical': str(best_match.get('PercentEvangelical', '')),
            'language': best_match.get('PrimaryLanguageName', ''),
            'religion': best_match.get('PrimaryReligion', ''),
            'description': best_match.get('Description', '')
        }
        
        print(f"Using coordinates for {people_group}: {result['latitude']}, {result['longitude']}")
        return result
        
    except Exception as e:
        print(f"Error getting data for {people_group} in {country}: {str(e)}")
        return None

def process_data():
    try:
        print(f"Reading input file: {INPUT_FILE}")
        df = pd.read_csv(INPUT_FILE)
        
        valid_records = df[df['country'].notna() & (df['country'].str.strip() != '')]
        print(f"\nFound {len(valid_records)} records with valid countries")
        
        # Now process all records
        updated_records = []
        success_count = 0
        
        for index, record in valid_records.iterrows():
            name = record['name'].strip()
            country = record['country'].strip()
            
            print(f"\nProcessing [{index + 1}/{len(valid_records)}]: {name} in {country}")
            
            jp_data = get_people_group_data(name, country)
            time.sleep(DELAY_BETWEEN_REQUESTS)
            
            if jp_data and jp_data['latitude'] and jp_data['longitude']:
                print(f"Adding record with coordinates: {jp_data['latitude']}, {jp_data['longitude']}")
                updated_records.append(jp_data)
                success_count += 1
                print("✓ Successfully retrieved data")
            else:
                print("✗ Failed to get valid data")
        
        if updated_records:
            updated_df = pd.DataFrame(updated_records)
            
            print("\nFinal Data Validation:")
            print(f"Total records processed: {len(valid_records)}")
            print(f"Successfully updated records: {success_count}")
            print(f"Records with valid coordinates: {len(updated_records)}")
            
            print("\nSample of coordinates (first 5 records):")
            for i, record in enumerate(updated_records[:5]):
                print(f"{record['name']}: {record['latitude']}, {record['longitude']}")
            
            updated_df.to_csv(OUTPUT_FILE, index=False)
            print(f"\nProcessing complete. Results written to {OUTPUT_FILE}")
        else:
            print("\nNo valid records to save!")
        
    except Exception as e:
        print(f"Error processing data: {str(e)}")
        raise

if __name__ == "__main__":
    process_data() 