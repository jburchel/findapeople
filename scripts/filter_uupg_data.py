import pandas as pd

# Configuration
INPUT_FILE = 'data/uupg_data.csv'
OUTPUT_FILE = 'data/updated_uupg.csv'

def filter_uupg_data():
    try:
        print(f"Reading data from {INPUT_FILE}...")
        # Read the CSV file
        df = pd.read_csv(INPUT_FILE)
        
        # Print initial stats
        total_records = len(df)
        print(f"Total records in input file: {total_records}")
        
        # Filter for unengaged UPGs
        unengaged_df = df[df['Evangelical Engagement'].str.lower() == 'unengaged']
        
        # Print filtering stats
        unengaged_count = len(unengaged_df)
        print(f"\nFiltering results:")
        print(f"Unengaged UPGs found: {unengaged_count}")
        print(f"Removed records: {total_records - unengaged_count}")
        
        # Save filtered data
        unengaged_df.to_csv(OUTPUT_FILE, index=False)
        print(f"\nFiltered data saved to {OUTPUT_FILE}")
        
        # Print sample of filtered data
        print("\nSample of filtered data (first 5 records):")
        print(unengaged_df.head())
        
    except Exception as e:
        print(f"Error processing UUPG data: {str(e)}")

if __name__ == "__main__":
    filter_uupg_data() 