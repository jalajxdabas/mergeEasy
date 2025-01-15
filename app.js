const express = require("express");
const app = express();
const port = 3000;
const ejsMate = require("ejs-mate");
const path = require("path");
const multer = require('multer');
const { spawn } = require('child_process');
const fs = require('fs');


app.set('view engine', 'ejs');
app.set("views", path.join(__dirname, "views"));
app.use(express.static('public'));
app.engine("ejs", ejsMate);



// Configure multer for file upload
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

        // Add file extensions back to uploaded files
        const filePaths = req.files.map(file => {
            const ext = path.extname(file.originalname);
            const newPath = file.path + ext;
            fs.renameSync(file.path, newPath);
            return newPath;
        });

        console.log('Processing files:', filePaths);

        // Run Python script
        const pythonProcess = spawn('python', ['merge.py', JSON.stringify(filePaths)]);
        
        let pythonOutput = '';
        let pythonError = '';

        pythonProcess.stdout.on('data', (data) => {
            console.log('Python stdout:', data.toString());
            pythonOutput += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            console.error('Python stderr:', data.toString());
            pythonError += data.toString();
        });

        pythonProcess.on('close', (code) => {
            console.log('Python process exited with code:', code);
            
            // Clean up uploaded files
            filePaths.forEach(filePath => {
                try {
                    fs.unlinkSync(filePath);
                    console.log(`Cleaned up ${filePath}`);
                } catch (err) {
                    console.error(`Error deleting file ${filePath}:`, err);
                }
            });

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
                res.json(result);
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

//downloading the file 
app.get('/download', (req, res) => {
    const filePath = path.join(__dirname, 'merged_data.csv');
    res.download(filePath, 'merged.csv', (err) => {
        if (err) {
            console.error('Error during file download:', err);
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        message: 'Server error',
        error: err.message
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
