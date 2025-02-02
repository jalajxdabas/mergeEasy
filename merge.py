import pandas as pd
import os
import sys
import json
import traceback
import requests
from dotenv import load_dotenv

load_dotenv()


HUGGINGFACE_API_TOKEN = os.getenv("HUGGINGFACE_API_TOKEN");

def debug_print(message):
    """Print debug information to stderr."""
    print(f"DEBUG: {message}", file=sys.stderr, flush=True)

def read_file(file_path):
    """Read a file into a DataFrame."""
    try:
        extension = os.path.splitext(file_path)[1].lower()
        if extension == '.csv':
            return pd.read_csv(file_path)
        elif extension in ['.xlsx', '.xls']:
            return pd.read_excel(file_path)
        elif extension == '.json':
            with open(file_path, 'r') as f:
                data = json.load(f)
            if isinstance(data, dict):
                for value in data.values():
                    if isinstance(value, list):
                        return pd.DataFrame(value)
            return pd.DataFrame(data if isinstance(data, list) else [data])
        else:
            raise ValueError(f"Unsupported file format: {extension}")
    except Exception as e:
        debug_print(f"Error reading {file_path}: {str(e)}")
        raise

def call_huggingface_api(source_column, target_column):
    """Call Hugging Face API to compare two column names."""
    url = "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2"
    headers = {"Authorization": f"Bearer {HUGGINGFACE_API_TOKEN}"}
    payload = {
        "inputs": {
            "source_sentence": source_column,
            "sentences": [target_column]
        }
    }

    try:
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        similarity_scores = response.json()
        return similarity_scores[0]  # Return the first similarity score
    except requests.exceptions.RequestException as e:
        debug_print(f"Hugging Face API error: {str(e)}")
        return 0  # Return 0 if the API call fails

def match_columns(file1_columns, file2_columns):
    """Match columns between two files."""
    matches = {}
    for col1 in file1_columns:
        best_match = None
        best_score = 0
        for col2 in file2_columns:
            score = call_huggingface_api(col1, col2)
            if score > best_score:
                best_match = col2
                best_score = score
        if best_match:
            matches[col1] = best_match
    return matches

def merge_files(file_paths):
    """Only match columns and print the final mapping."""
    try:
        if len(file_paths) < 2:
            raise ValueError("At least two files are required for column matching")

        # Read all files into DataFrames
        dataframes = [read_file(file) for file in file_paths]
        column_sets = [list(df.columns) for df in dataframes]

        # Match columns between files (cross-file matching only)
        all_matches = {}
        for i, columns1 in enumerate(column_sets):
            for j, columns2 in enumerate(column_sets):
                if i < j:  # Only compare different files
                    matches = match_columns(columns1, columns2)
                    all_matches.update(matches)

        # Print the final column matches and exit
        debug_print(f"Final column matches: {all_matches}")
        print(json.dumps({
            'success': True,
            'message': 'Column matching completed successfully',
            'column_matches': all_matches
        }))
        sys.exit(0)

    except Exception as e:
        debug_print(f"Error during column matching: {str(e)}\nTraceback: {traceback.format_exc()}")
        print(json.dumps({
            'success': False,
            'message': str(e),
            'traceback': traceback.format_exc()
        }))
        sys.exit(1)

def merge_files_with_column_matches(file_paths, column_matches, output_file="merged_output.csv"):
    """Merge files into a single CSV based on column_matches."""
    try:
        if len(file_paths) < 2:
            raise ValueError("At least two files are required for merging")
        
        # Read all files into DataFrames
        dataframes = [read_file(file) for file in file_paths]

        # Create a combined DataFrame with merged columns
        merged_df = pd.DataFrame()

        for source_column, target_column in column_matches.items():
            # Collect data from matching columns
            col_data = []
            for df in dataframes:
                if source_column in df.columns:
                    col_data.append(df[source_column])
                if target_column in df.columns:
                    col_data.append(df[target_column])
            # Combine all data for the column pair
            merged_df[target_column] = pd.concat(col_data, ignore_index=True)

        # Add unmatched columns to the merged DataFrame
        for df in dataframes:
            for col in df.columns:
                if col not in column_matches.keys() and col not in column_matches.values():
                    if col not in merged_df.columns:
                        merged_df[col] = df[col]

        # Save the merged DataFrame to a CSV file
        merged_df.to_csv(output_file, index=False)
        debug_print(f"Merged data saved to {output_file}")

        print(json.dumps({
            'success': True,
            'message': ' Merging Files',
            'output_file': output_file
        }))
        sys.exit(0)

    except Exception as e:
        debug_print(f"Error during file merging: {str(e)}\nTraceback: {traceback.format_exc()}")
        print(json.dumps({
            'success': False,
            'message': str(e),
            'traceback': traceback.format_exc()
        }))
        sys.exit(1)

if __name__ == "__main__":
    debug_print(f"Script started with arguments: {sys.argv}")
    if len(sys.argv) < 2:
        debug_print("No file paths provided.")
        print(json.dumps({
            'success': False,
            'message': 'No file paths provided'
        }))
        sys.exit(1)

    try:
        # Print the raw argument for debugging
        debug_print(f"Raw input for file paths: {sys.argv[1]}")
        file_paths = json.loads(sys.argv[1])  # Parse file paths
        debug_print(f"Parsed file paths: {file_paths}")
        merge_files(file_paths)
    except Exception as e:
        debug_print(f"Error in main: {str(e)}\nTraceback: {traceback.format_exc()}")
        print(json.dumps({
            'success': False,
            'message': str(e),
            'traceback': traceback.format_exc()
        }))
        sys.exit(1)

