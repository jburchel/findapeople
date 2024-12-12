import pandas as pd
import requests
import time
from typing import Dict, Optional
import json

# Configuration
INPUT_FILE = 'data/CG-Existing-UPG-Q1-2024.csv'
OUTPUT_FILE = 'data/existing_upgs_updated.csv'
DELAY_BETWEEN_REQUESTS = 1
API_KEY = '080e14ad747e'
BASE_URL = 'https://joshuaproject.net/api/v2'

def get_people_group_data(people_group: str, country: str) -> Optional[Dict]:
    try:
        url = f"{BASE_URL}/people_groups"
        params = {
            'api_key': API_KEY,
            'fields': 'PeopleID3,Latitude,Longitude,Population,PercentEvangelical,PrimaryLanguageName,PrimaryReligion,Description',
            'country': country,
            'peo_name': people_group,
            'limit': 10
        }
        
        print(f"\nQuerying API for: {people_group} in {country}")
        print(f"Request URL: {url}")
        print(f"Request params: {json.dumps(params, indent=2)}")
        
        response = requests.get(url, params=params)
        
        print(f"Response status: {response.status_code}")
        print(f"Response headers: {json.dumps(dict(response.headers), indent=2)}")
        
        if response.status_code != 200:
            print(f"API Error: {response.status_code} - {response.text}")
            return None
            
        data = response.json()
        print(f"Raw API response: {json.dumps(data, indent=2)}")
        
        if not data.get('data'):
            print(f"No data found for {people_group} in {country}")
            return None
        
        matches = data['data']
        print(f"Found {len(matches)} potential matches")
        
        # Print all matches for debugging
        for i, match in enumerate(matches):
            print(f"\nMatch {i+1}:")
            print(f"Name in country: {match.get('PeopNameInCountry')}")
            print(f"Coordinates: {match.get('Latitude')}, {match.get('Longitude')}")
        
        exact_match = next(
            (m for m in matches if m.get('PeopNameInCountry', '').lower() == people_group.lower()),
            matches[0]
        )
        
        print(f"\nSelected match: {exact_match.get('PeopNameInCountry')}")
        
        lat = exact_match.get('Latitude')
        lon = exact_match.get('Longitude')
        
        if not lat or not lon:
            print(f"Warning: Missing coordinates for {people_group} in {country}")
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
            'latitude': str(lat),
            'longitude': str(lon),
            'population': str(exact_match.get('Population', '')),
            'evangelical': str(exact_match.get('PercentEvangelical', '')),
            'language': exact_match.get('PrimaryLanguageName', ''),
            'religion': exact_match.get('PrimaryReligion', ''),
            'description': exact_match.get('Description', '')
        }
        
        print(f"\nReturning data: {json.dumps(result, indent=2)}")
        return result
        
    except Exception as e:
        print(f"Error getting data for {people_group} in {country}")
        print(f"Error details: {str(e)}")
        return None

def process_data():
    try:
        print(f"Reading input file: {INPUT_FILE}")
        df = pd.read_csv(INPUT_FILE)
        
        valid_records = df[df['country'].notna() & (df['country'].str.strip() != '')]
        print(f"\nFound {len(valid_records)} records with valid countries")
        
        # Process first record only for testing
        test_record = valid_records.iloc[0]
        name = test_record['name'].strip()
        country = test_record['country'].strip()
        
        print(f"\nTesting with first record: {name} in {country}")
        jp_data = get_people_group_data(name, country)
        
        if jp_data:
            print("\nTest successful! Proceeding with full processing...")
        else:
            print("\nTest failed! Please check the API response above.")
            return
            
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
            
            print("\nUnique coordinate pairs:")
            coord_pairs = updated_df[['latitude', 'longitude']].drop_duplicates()
            print(coord_pairs)
            
            updated_df.to_csv(OUTPUT_FILE, index=False)
            print(f"\nProcessing complete. Results written to {OUTPUT_FILE}")
        else:
            print("\nNo valid records to save!")
        
    except Exception as e:
        print(f"Error processing data: {str(e)}")
        raise

if __name__ == "__main__":
    process_data() 