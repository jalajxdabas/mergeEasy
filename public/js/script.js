const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const mergeBtn = document.getElementById('mergeBtn');
const loading = document.getElementById('loading');
const result = document.getElementById('result');
const downloadButton = document.getElementById('downloadButton');

downloadButton.style.display = 'none';

let files = [];

// drag and drop
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#4CAF50';
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.borderColor = '#ccc';
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#ccc';
    handleFiles(e.dataTransfer.files);
});

// click to upload
uploadArea.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

function handleFiles(newFiles) {
    const validFiles = Array.from(newFiles).filter(file => {
        const ext = file.name.toLowerCase().split('.').pop();
        return ['csv', 'json', 'xlsx', 'xls'].includes(ext);
    });

    files = [...files, ...validFiles];
    updateFileList();
    mergeBtn.disabled = files.length === 0;
    
    downloadButton.style.display = 'none';
}

function updateFileList() {
    fileList.innerHTML = '';
    files.forEach((file, index) => {
        const li = document.createElement('li');
        li.className = 'file-item';
        li.innerHTML = `
            <span>${file.name}</span>
            <button class="remove-btn" onclick="removeFile(${index})">Remove</button>
        `;
        fileList.appendChild(li);
    });
}

function removeFile(index) {
    files.splice(index, 1);
    updateFileList();
    mergeBtn.disabled = files.length === 0;
    
    downloadButton.style.display = 'none';
}

mergeBtn.addEventListener('click', async () => {
    if (files.length === 0) return;

    const formData = new FormData();
    files.forEach(file => {
        formData.append('files', file);
    });

    loading.classList.add('active');
    mergeBtn.disabled = true;
    result.style.display = 'none';
    downloadButton.style.display = 'none';  

    try {
        const response = await fetch('/api/merge', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        result.style.display = 'block';
        if (response.ok) {
            result.className = 'result success';
            result.innerHTML = `
                <h3>Merging files!</h3>
            `;
            
            //downloadButton.style.display = 'block';

            // If redirect URL is provided, redirect to columns page
            if (data.redirectUrl) {
                setTimeout(() => {
                    window.location.href = data.redirectUrl;
                }, 2000);  // Redirect after a brief delay to allow user to see the result
            }

            // Reset the files list
            files = [];
            updateFileList();
        } else {
            throw new Error(data.message || 'Failed to merge files');
        }
    } catch (error) {
        result.style.display = 'block';
        result.className = 'result error';
        result.textContent = `Error: ${error.message}`;
        downloadButton.style.display = 'none';  // Hide download button on error
    } finally {
        loading.classList.remove('active');
        mergeBtn.disabled = files.length === 0;
    }
});


downloadButton.addEventListener('click', () => {
    window.location.href = '/download';
});
async function saveChanges() {
    const tableRows = document.querySelectorAll('#columns-table tbody tr');
    const updatedMatches = {};

    // Collect updated values from the table
    tableRows.forEach(row => {
        const keyCell = row.querySelector('.key').textContent.trim();
        const valueInput = row.querySelector('.value input').value.trim();
        updatedMatches[keyCell] = valueInput;
    });

    console.log('Updated matches to send:', updatedMatches); // Debugging log

    try {
        const response = await fetch('/api/update-columns', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedMatches),
        });

        if (!response.ok) {
            const errorText = await response.text(); // Capture non-JSON response
            throw new Error(`HTTP Error ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        if (result.success) {
            alert('Changes saved successfully!');
            console.log('Updated column matches on server:', result.updatedMatches); // Log updated matches
        } else {
            alert('Failed to save changes: ' + result.message);
        }
    } catch (error) {
        alert('Error saving changes: ' + error.message);
    }
}
async function submitUpdatedColumnMatches() {
    const tableRows = document.querySelectorAll('#columns-table tbody tr');
    const updatedMatches = {};

    // Collect updated values from the table
    tableRows.forEach(row => {
        const keyCell = row.querySelector('.key').textContent.trim();
        const valueInput = row.querySelector('.value input').value.trim();
        updatedMatches[keyCell] = valueInput;
    });

    const singleObjectToSend = {
        columnMatches: updatedMatches, // Column matches from the user
    };

    console.log('Submitting column matches:', singleObjectToSend);

    try {
        const response = await fetch('/api/submit-columns', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(singleObjectToSend),
        });

        const result = await response.json();
        if (result.success) {
            alert('Column matches submitted successfully!');
            console.log('Updated column matches processed on server:', result);

            // Check if the response contains a download URL
            const downloadUrl = result.downloadUrl;

            if (downloadUrl) {
                // Create an anchor element to trigger the download
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = 'merged_output.csv'; // The filename for download
                document.body.appendChild(link);
                link.click();  // Programmatically click the link to trigger the download
                document.body.removeChild(link);  // Clean up by removing the link
            } else {
                alert('Error: No download URL provided');
            }
        } else {
            alert('Failed to submit column matches: ' + result.message);
        }
    } catch (error) {
        alert('Error submitting column matches: ' + error.message);
    }
}
