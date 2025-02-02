# mergeEasy

`mergeEasy` is a web application built with Node.js and Express that allows users to upload multiple data files (in formats such as CSV, JSON, XLSX, and XLS), merge them into one file, and download the resulting merged file. The application also allows users to manually map columns for merging and download the final output in CSV format.

## Features
- Upload multiple files (CSV, JSON, XLSX, XLS).
- Merge uploaded files based on column mapping.
- Preview and update column matches before merging.
- Download the merged output as a CSV file.
- Automatically delete uploaded and merged files after the download.

## Technologies Used
- **Node.js**: Backend framework for building the server.
- **Express**: Web framework for handling HTTP requests and responses.
- **EJS**: Templating engine for rendering dynamic views.
- **Multer**: Middleware for handling file uploads.
- **Python**: Used for merging and processing files.
- **Child Process**: To execute Python scripts from Node.js.

## Installation

### Prerequisites
- Node.js (v14 or later)
- Python (v3.x or later)

### Steps to Set Up the Project

1. **Clone the repository**:

   ```bash
   git clone https://github.com/jalajxdabas/mergeEasy.git
   cd mergeEasy
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Set up Python environment**:
   - Ensure you have Python installed on your machine. You can download it from [python.org](https://www.python.org/).
   - Make sure you have the necessary Python dependencies installed to run the scripts (`merge.py` and `mapping.py`).

4. **Start the server**:

   ```bash
   npm start
   ```

   The application will be accessible at `http://localhost:3000`.

## Usage

### Uploading Files
1. Go to the homepage at `http://localhost:3000`.
2. Upload multiple files in CSV, JSON, XLSX, or XLS format.
3. Once files are uploaded, they will be processed and merged. A preview of column matches will be shown.

### Column Mapping
- You can manually map columns from the uploaded files if required.
- The column matches will be saved, and the merged files will be processed according to the mappings.

### Downloading the Merged File
- Once the files are successfully merged, a download link will be provided for the merged CSV file.
- The uploaded and merged files will be automatically deleted after the download is complete.

### API Endpoints

- `POST /api/merge`: Upload files to be merged. Accepts multiple files in the request.
- `POST /api/update-columns`: Update column mappings before the merge process.
- `POST /api/submit-columns`: Submit the column mappings and trigger the merge process.
- `GET /download`: Download the merged output file.
- `GET /columns`: View the column mappings.

## Directory Structure

```
/mergeEasy
├── /uploads              # Directory to temporarily store uploaded files
├── /public               # Public assets (CSS, JS, images)
├── /views                # EJS templates for rendering views
├── app.js                # Main application entry point
├── merge.py              # Python script to merge uploaded files
├── mapping.py            # Python script to handle column mappings
└── package.json          # Project dependencies and configuration
```

## Contributing

1. Fork the repository.
2. Create a new branch (`git checkout -b feature-name`).
3. Commit your changes (`git commit -am 'Add feature'`).
4. Push to the branch (`git push origin feature-name`).
5. Create a new Pull Request.