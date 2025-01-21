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
                <h5>Columns mapped successfully!</h5>
            `;
            
            

            // If redirect URL is provided, redirect to columns page
            if (data.redirectUrl) {
                setTimeout(() => {
                    window.location.href = data.redirectUrl;
                }, 2000);  
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

            
            const downloadUrl = result.downloadUrl;

            if (downloadUrl) {
            
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = 'merged_output.csv'; 
                document.body.appendChild(link);
                link.click();  
                document.body.removeChild(link);  
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

let draggedElement = null;

function onDragStart(event) {
    draggedElement = event.target;
    event.dataTransfer.setData("text/plain", draggedElement.innerText);
    event.target.style.opacity = "0.5";
}

function onDragOver(event) {
    event.preventDefault(); 
}


function onDrop(event) {
    event.preventDefault();
    if (draggedElement && event.target.classList.contains("key")) {
        const draggedContent = draggedElement.innerText;
        draggedElement.innerText = event.target.innerText;
        event.target.innerText = draggedContent;
    }
    draggedElement.style.opacity = "1";
    draggedElement = null;
}

document.addEventListener("dragend", (event) => {
    if (draggedElement) {
        draggedElement.style.opacity = "1";
        draggedElement = null;
    }
});