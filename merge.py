# merge.py
import pandas as pd
import os
import sys
import json
import traceback

def debug_print(message):
    """Print debug information that will be captured in Node.js logs"""
    print(f"DEBUG: {message}", file=sys.stderr, flush=True)

def read_json(file_path):
    """Extract data from JSON file"""
    debug_print(f"Reading JSON file: {file_path}")
    try:
        with open(file_path) as f:
            data = json.load(f)
            if isinstance(data, dict):
                for value in data.values():
                    if isinstance(value, list):
                        return pd.DataFrame(value)
            return pd.DataFrame(data if isinstance(data, list) else [data])
    except Exception as e:
        debug_print(f"Error reading JSON file {file_path}: {str(e)}")
        raise

def read_file(file_path):
    debug_print(f"Attempting to read file: {file_path}")
    try:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File does not exist: {file_path}")

        extension = os.path.splitext(file_path)[1].lower()
        debug_print(f"File extension: {extension}")

        if extension == '.csv':
            df = pd.read_csv(file_path)
        elif extension == '.json':
            df = read_json(file_path)
        elif extension in ['.xlsx', '.xls']:
            df = pd.read_excel(file_path)
        else:
            raise ValueError(f"Unsupported file format: {extension}")

        debug_print(f"Successfully read file {file_path} with shape: {df.shape}")
        return df
    except Exception as e:
        debug_print(f"Error reading {file_path}: {str(e)}")
        debug_print(f"Traceback: {traceback.format_exc()}")
        raise

def merge_files(file_paths, output_path='merged_data.csv'):
    try:
        debug_print(f"Starting merge process with files: {file_paths}")
        debug_print(f"Output path: {output_path}")

        if not file_paths:
            raise ValueError("No files provided for merging")

        # Verify input paths
        file_paths = [os.path.abspath(path) for path in file_paths]
        for file_path in file_paths:
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"File not found: {file_path}")
            debug_print(f"Verified file exists: {file_path}")

        dataframes = []
        for file_path in file_paths:
            df = read_file(file_path)
            if df is not None and not df.empty:
                dataframes.append(df)
                debug_print(f"Added dataframe from {file_path} with shape {df.shape}")
            else:
                debug_print(f"Skipping invalid or empty file: {file_path}")

        if not dataframes:
            raise ValueError('No valid files to merge')

        merged_df = pd.concat(dataframes, ignore_index=True).drop_duplicates()
        debug_print(f"Final merged shape: {merged_df.shape}")
        
        # Ensure output directory exists
        os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)
        
        merged_df.to_csv(output_path, index=False)
        debug_print(f"Successfully saved merged file to: {output_path}")

        result = {
            'success': True,
            'message': 'Files merged successfully',
            'total_rows': len(merged_df),
            'duplicates_removed': sum(len(df) for df in dataframes) - len(merged_df),
            'columns': list(merged_df.columns),
            'filePath': output_path
        }
        print(json.dumps(result))  # Print to stdout for Node.js to capture
        return result

    except Exception as e:
        error_msg = f"Error during merge: {str(e)}\nTraceback: {traceback.format_exc()}"
        debug_print(error_msg)
        print(json.dumps({
            'success': False,
            'message': str(e),
            'traceback': traceback.format_exc()
        }))
        sys.exit(1)

if __name__ == "__main__":
    debug_print(f"Script started with arguments: {sys.argv}")
    
    if len(sys.argv) < 2:
        print(json.dumps({
            'success': False,
            'message': 'No file paths provided'
        }))
        sys.exit(1)

    try:
        file_paths = json.loads(sys.argv[1])
        debug_print(f"Parsed file paths: {file_paths}")
        merge_files(file_paths)
    except Exception as e:
        error_msg = f"Error in main: {str(e)}\nTraceback: {traceback.format_exc()}"
        debug_print(error_msg)
        print(json.dumps({
            'success': False,
            'message': str(e),
            'traceback': traceback.format_exc()
        }))
        sys.exit(1)