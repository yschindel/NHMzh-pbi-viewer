import requests
import pandas as pd

# Mockaroo API configuration
api_url = "https://my.api.mockaroo.com/pbi_target_values.json"
headers = {
    "X-API-Key": "1f6c7ac0"  # Replace with your actual Mockaroo API key
}

def load_mockaroo_data(api_url):
    try:
        # Fetch data from the Mockaroo API
        response = requests.get(api_url, headers=headers)
        response.raise_for_status()  # Raise an exception for HTTP errors

        # Print raw response content for debugging
        print("Raw response content:", response.json())

        # Parse JSON data
        json_data = response.json()
        return json_data
    except requests.exceptions.RequestException as e:
        print(f"Error fetching data from Mockaroo API: {str(e)}")
        return None
    except ValueError as e:
        print(f"Error parsing JSON data: {str(e)}")
        return None

def convert_data_to_dataframe(json_data):
    if not json_data:
        print("No data to convert.")
        return None

    try:
        # Convert JSON data to a pandas DataFrame
        if isinstance(json_data, dict):
            json_data = [json_data]  # Wrap the dictionary in a list
        df = pd.DataFrame(json_data)
        return df
    except Exception as e:
        print(f"Error converting JSON to DataFrame: {str(e)}")
        return None

# Load data from the Mockaroo API
mockaroo_data = load_mockaroo_data(api_url)

# Process the data into a DataFrame
df = convert_data_to_dataframe(mockaroo_data)
print(df)