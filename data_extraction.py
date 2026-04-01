import requests
import time
import pandas as pd

API_KEY = "giHpp3LDNslw5mzB12BanYcNVgGmV0ZudeCRjID8"
START_DATE = "2023-10-01"
END_DATE = "2023-10-07"

# We want 2 years of data. 2 years = 104 weeks (or 104 requests of 7-days each)
WEEKS_TO_FETCH = 104 

current_url = f"https://api.nasa.gov/neo/rest/v1/feed?start_date={START_DATE}&end_date={END_DATE}&api_key={API_KEY}"

# A list to hold all our flattened asteroid data
all_asteroids_list = []

print("Starting data fetch...")

# 2. Loop through the weeks
for i in range(WEEKS_TO_FETCH):
    print(f"Fetching week {i+1} of {WEEKS_TO_FETCH}...")
    
    response = requests.get(current_url)
    
    if response.status_code != 200:
        print(f"Error {response.status_code}. Stopping early.")
        break
        
    data = response.json()
    
    # 3. Extract and flatten the daily data
    # NASA groups the data by date, so we have to loop through the dates in the dictionary
    for date, asteroids in data['near_earth_objects'].items():
        for asteroid in asteroids:
            # We extract only the features we want for our Machine Learning model
            flat_asteroid = {
                'date': date,
                'id': asteroid['id'],
                'name': asteroid['name'],
                'absolute_magnitude_h': asteroid['absolute_magnitude_h'],
                'estimated_diameter_min_km': asteroid['estimated_diameter']['kilometers']['estimated_diameter_min'],
                'estimated_diameter_max_km': asteroid['estimated_diameter']['kilometers']['estimated_diameter_max'],
                'relative_velocity_kmh': asteroid['close_approach_data'][0]['relative_velocity']['kilometers_per_hour'],
                'miss_distance_km': asteroid['close_approach_data'][0]['miss_distance']['kilometers'],
                'is_potentially_hazardous': asteroid['is_potentially_hazardous_asteroid']
            }
            all_asteroids_list.append(flat_asteroid)
    
    # 4. Get the URL for the next 7 days from NASA's response
    current_url = data['links']['next'].replace('http://', 'https://')
    
    time.sleep(0.5)

# 5. Convert everything to a Pandas DataFrame and save to CSV
df = pd.DataFrame(all_asteroids_list)
print(f"\nFinished! Total asteroids collected: {len(df)}")

# Save to a local file so you can use it for your dashboard/ML model
df.to_csv("nasa_asteroid_data_2_years.csv", index=False)
print("Saved to nasa_asteroid_data_2_years.csv")