import sys
import os
import json
import pandas as pd
import traceback

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
        raise ValueError(f"Error reading file {file_path}: {e}")
    
def merge_files(file_paths, column_matches, output_file="merged_output.csv"):
    """Merge files based on column matches into the same columns."""
    try:
        if len(file_paths) < 2:
            raise ValueError("At least two files are required for merging")

        # Read all files into DataFrames
        dataframes = [read_file(file) for file in file_paths]

        print("\nContents of uploaded files before merging:")
        for i, df in enumerate(dataframes):
            print(f"File {i + 1}: {file_paths[i]}")
            print(df.head())  # Preview content

        # Normalize column names using column_matches
        for i, df in enumerate(dataframes):
            df.rename(columns=column_matches, inplace=True)
            print(f"\nNormalized columns for File {i + 1}: {df.columns.tolist()}")

        # Ensure all DataFrames have the same columns
        all_columns = set().union(*[df.columns for df in dataframes])
        dataframes = [df.reindex(columns=all_columns) for df in dataframes]

        # Concatenate all DataFrames
        merged_df = pd.concat(dataframes, ignore_index=True)

        print("\nMerged DataFrame Preview:")
        print(merged_df.head())

        # Save the merged DataFrame to a CSV file
        merged_df.to_csv(output_file, index=False)
        print(f"Merged data saved to {output_file}")

        return json.dumps({
            'success': True,
            'message': 'Files merged successfully',
            'output_file': output_file
        })

    except Exception as e:
        return json.dumps({
            'success': False,
            'message': str(e),
            'traceback': traceback.format_exc()
        })




def main():
    if len(sys.argv) < 3:
        print(json.dumps({
            'success': False,
            'message': 'No column matches or file paths received'
        }))
        sys.exit(1)

    try:
        # Parse column matches and file paths
        column_matches = json.loads(sys.argv[1])
        file_paths = json.loads(sys.argv[2])

        # Print the received object
        print("Received Column Matches:")
        for key, value in column_matches.items():
            print(f"{key}: {value}")

        # Merge files based on column matches
        result = merge_files(file_paths, column_matches)

        # Return success
        print(result)

    except Exception as e:
        print(json.dumps({
            'success': False,
            'message': str(e),
            'traceback': traceback.format_exc()
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()
