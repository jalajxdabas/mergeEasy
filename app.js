const express = require("express");
const app = express();
const ejsMate = require("ejs-mate");
const path = require("path");
const multer = require('multer');
const { spawn } = require('child_process');
const fs = require('fs');


app.set('view engine', 'ejs');
app.set("views", path.join(__dirname, "views"));
app.use(express.static('public'));
app.engine("ejs", ejsMate);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



const upload = multer({ 
    dest: 'uploads/',
    fileFilter: (req, file, cb) => {
        const allowedExtensions = ['.csv', '.json', '.xlsx', '.xls'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedExtensions.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});


app.get("/", (req, res) => {
    res.render("index");
});

let uploadedFiles = [];

app.post('/api/merge', upload.array('files'), async (req, res) => {
    console.log('Received merge request');
    try {
        if (!req.files || req.files.length === 0) {
            console.log('No files received');
            return res.status(400).json({ 
                success: false, 
                message: 'No files uploaded' 
            });
        }

        console.log(`Received ${req.files.length} files:`, 
            req.files.map(f => f.originalname));

        const filePaths = req.files.map(file => {
            const ext = path.extname(file.originalname);
            const newPath = file.path + ext;
            fs.renameSync(file.path, newPath);
            return newPath;
        });

        uploadedFiles = filePaths;
        console.log('Stored file paths for reuse:', uploadedFiles);

        console.log('Processing files:', filePaths);

        // Call Python script
        const pythonProcess = spawn('python', ['merge.py', JSON.stringify(filePaths)]);
        
        let pythonOutput = '';
        let pythonError = '';

        pythonProcess.stdout.on('data', (data) => {
            pythonOutput += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            pythonError += data.toString();
        });

        pythonProcess.on('close', (code) => {

            if (code !== 0) {
                console.error('Python script error:', pythonError);
                return res.status(500).json({
                    success: false,
                    message: 'Error merging files',
                    error: pythonError,
                    debug: pythonOutput
                });
            }

            try {
                const result = JSON.parse(pythonOutput);
                console.log('Merge result:', result);

                if (result.success) {
                    columnMatches = result.column_matches; // Store matches for rendering
                    // Send JSON response with the URL to redirect
                    return res.json({
                        success: true,
                        message: 'Files processed successfully',
                        redirectUrl: '/columns'
                    });
                } else {
                    return res.status(500).json({
                        success: false,
                        message: 'Error in merge process',
                        error: result.message
                    });
                }
            } catch (err) {
                console.error('Error parsing Python output:', err);
                res.status(500).json({
                    success: false,
                    message: 'Error processing merge results',
                    error: err.message,
                    rawOutput: pythonOutput
                });
            }
        });

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});


let columnMatches = {};


app.post('/api/update-columns', (req, res) => {
    try {
        const updatedMatches = req.body;

        // Validate the input
        if (!updatedMatches || typeof updatedMatches !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'Invalid data format. Expected an object with column matches.',
            });
        }

        columnMatches = { ...columnMatches, ...updatedMatches };

        console.log('Updated columnMatches:', columnMatches);

        res.json({
            success: true,
            message: 'Column matches updated successfully',
            updatedMatches: columnMatches,
        });
    } catch (err) {
        console.error('Error updating column matches:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to update column matches',
            error: err.message,
        });
    }
});


app.get('/columns', (req, res) => {
    if (!columnMatches || Object.keys(columnMatches).length === 0) {
        return res.status(500).send('No column matches available');
    }
    res.render('columns', { columnMatches });
});

let globalColumnMatches = {};

app.post('/api/submit-columns', (req, res) => {
    try {
        const { columnMatches } = req.body;
        if (!columnMatches) {
            return res.status(400).json({
                success: false,
                message: 'Column matches not provided',
            });
        }

        if (!uploadedFiles || uploadedFiles.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No files available from the previous merge',
            });
        }

        console.log('Reusing files from merge:', uploadedFiles);

        const pythonProcess = spawn('python', ['mapping.py', JSON.stringify(columnMatches), JSON.stringify(uploadedFiles)]);

        let pythonOutput = '';
        let pythonError = '';

        pythonProcess.stdout.on('data', (data) => {
            pythonOutput += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            pythonError += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error('Python script error:', pythonError);
                return res.status(500).json({
                    success: false,
                    message: 'Error in processing column matches',
                    error: pythonError,
                });
            }

            const mergedFilePath = path.join(__dirname, 'merged_output.csv');

            res.json({
                success: true,
                message: 'Column matches processed successfully by Python script',
                pythonOutput: pythonOutput,
                downloadUrl: `/download`, 
            });
        });
    } catch (err) {
        console.error('Error updating column matches:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: err.message,
        });
    }
});

app.get('/download', (req, res) => {
    const mergedFilePath = path.join(__dirname, 'merged_output.csv');
    
    res.download(mergedFilePath, 'merged_output.csv', (err) => {
        if (err) {
            console.error('Error downloading file:', err);
            res.status(500).json({
                success: false,
                message: 'Error downloading file',
                error: err.message,
            });
        } else {
            
            uploadedFiles.forEach(filePath => {
                try {
                    fs.unlinkSync(filePath);
                    // console.log(`Uploaded file ${filePath} has been deleted.`);
                } catch (deleteErr) {
                    console.error(`Error deleting uploaded file ${filePath}:`, deleteErr);
                }
            });
        }
    });
});

app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        message: 'Server error',
        error: err.message
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


