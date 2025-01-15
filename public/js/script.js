const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const mergeBtn = document.getElementById('mergeBtn');
const loading = document.getElementById('loading');
const result = document.getElementById('result');
const downloadButton = document.getElementById('downloadButton');

// Initially hide the download button
downloadButton.style.display = 'none';

let files = [];

// Handle drag and drop
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

// Handle click to upload
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
    // Hide download button when new files are added
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
    // Hide download button when files are removed
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
    downloadButton.style.display = 'none';  // Hide download button during merge

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
                <h3>Files merged successfully!</h3>
                <p>Total rows: ${data.total_rows}</p>
                <p>Duplicates removed: ${data.duplicates_removed}</p>
                <p>Output file: ${data.filePath}</p>
                <p>Columns: ${data.columns.join(', ')}</p>
            `;
            // Show download button after successful merge
            downloadButton.style.display = 'block';
            // Clear files after successful merge
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