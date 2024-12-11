import pandas as pd
import requests
import time

# Configuration
INPUT_FILE = 'data/CG-Existing-UPG-Q1-2024.csv'
OUTPUT_FILE = 'data/existing_upgs_updated.csv'
DELAY_BETWEEN_REQUESTS = 1  # 1 second delay between requests
API_KEY = '080e14ad747e'  # You'll need to request an API key from Joshua Project
BASE_URL = 'https://joshuaproject.net/api/v2'

def get_people_group_data(people_group, country):
    try:
        # Format API request
        url = f"{BASE_URL}/people_groups"
        params = {
            'api_key': API_KEY,
            'fields': 'PeopleID3,Latitude,Longitude,Population,PercentEvangelical,PrimaryLanguageName,PrimaryReligion,Description',
            'country': country,
            'peo_name': people_group
        }
        
        print(f"\nQuerying API for: {people_group} in {country}")
        response = requests.get(url, params=params)
        
        if response.status_code != 200:
            print(f"API Error: {response.status_code} - {response.text}")
            return None
            
        data = response.json()
        
        if not data.get('data'):
            print(f"No data found for {people_group} in {country}")
            return None
            
        # Get first matching result
        people_data = data['data'][0]
        
        return {
            'latitude': str(people_data.get('Latitude', '')),
            'longitude': str(people_data.get('Longitude', '')),
            'population': str(people_data.get('Population', '')),
            'evangelical': str(people_data.get('PercentEvangelical', '')),
            'language': people_data.get('PrimaryLanguageName', ''),
            'religion': people_data.get('PrimaryReligion', ''),
            'description': people_data.get('Description', '')
        }
        
    except Exception as e:
        print(f"Error getting data for {people_group} in {country}")
        print(f"Error details: {str(e)}")
        return None

def process_data():
    try:
        # Read input file
        df = pd.read_csv(INPUT_FILE)
        
        # Filter records with country
        valid_records = df[df['country'].notna() & (df['country'].str.strip() != '')]
        
        # Process each record
        updated_records = []
        
        for index, record in valid_records.iterrows():
            print(f"\nProcessing: {record['name']} in {record['country']}")
            
            jp_data = get_people_group_data(record['name'], record['country'])
            time.sleep(DELAY_BETWEEN_REQUESTS)
            
            if jp_data:
                # Update record with new data, keeping original if new data is empty
                updated_record = record.copy()
                for key, value in jp_data.items():
                    if value:  # Only update if new value exists
                        updated_record[key] = value
                updated_records.append(updated_record)
                
                # Print the data we found
                print("\nData found:")
                for key, value in jp_data.items():
                    print(f"{key}: {value}")
            else:
                # Keep original record if no new data found
                updated_records.append(record)
                print("No new data found - keeping original record")
        
        # Convert to DataFrame and save
        updated_df = pd.DataFrame(updated_records)
        updated_df.to_csv(OUTPUT_FILE, index=False)
        
        print(f"\nProcessing complete. Results written to {OUTPUT_FILE}")
        
    except Exception as e:
        print(f"Error processing data: {str(e)}")

if __name__ == "__main__":
    if API_KEY == 'YOUR_API_KEY':
        print("Please set your Joshua Project API key in the script first!")
        print("Get an API key at: https://joshuaproject.net/api/v2/key_request")
    else:
        process_data() 