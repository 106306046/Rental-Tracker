// Constants
const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbykzlGwiIU3v8Y_KvhErwY6TNjYbD8TOPWkPQ-_uUWBN5ywuk0EvBUtlt4U5iZ8bYQY/exec'; // Replace with your actual Web App URL

// DOM Elements
const listingsContainer = document.getElementById('listings-container');
const addListingBtn = document.getElementById('add-listing-btn');
const addModal = document.getElementById('add-modal');
const editModal = document.getElementById('edit-modal');
const addListingForm = document.getElementById('add-listing-form');
const editListingForm = document.getElementById('edit-listing-form');
const fetchInfoBtn = document.getElementById('fetch-info-btn');

// Close buttons for modals
const closeButtons = document.querySelectorAll('.close');
closeButtons.forEach(button => {
    button.addEventListener('click', () => {
        addModal.style.display = 'none';
        editModal.style.display = 'none';
    });
});

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    if (event.target === addModal) {
        addModal.style.display = 'none';
    }
    if (event.target === editModal) {
        editModal.style.display = 'none';
    }
});

// Open add modal on button click
addListingBtn.addEventListener('click', () => {
    addModal.style.display = 'block';
    addListingForm.reset();
});

// Fetch data from Google Sheets
async function fetchListings() {
    try {
        const response = await fetch(`${SHEET_API_URL}?action=read`);
        const data = await response.json();

        if (data.status === 'success') {
            renderListings(data.data);
        } else {
            showError('Error fetching data: ' + data.message);
        }
    } catch (error) {
        showError('Error connecting to the server: ' + error.message);
    }
}

// Render listings on the page
function renderListings(listings) {
    listingsContainer.innerHTML = '';

    if (listings.length === 0) {
        listingsContainer.innerHTML = '<div class="no-listings">沒有符合的租屋記錄</div>';
        return;
    }

    listings.forEach(listing => {
        const card = createListingCard(listing);
        listingsContainer.appendChild(card);
    });
}

// Create a card element for a listing
function createListingCard(listing) {
    const card = document.createElement('div');
    card.className = 'listing-card';

    // Get status class based on result
    const resultClass = listing.Result === 'yes' ? 'status-yes' :
        listing.Result === 'reject' ? 'status-reject' : 'status-no';

    // Format datetime for display
    let reservedTimeDisplay = '尚未預約';
    if (listing.ReservedTime && listing.ReservedTime !== '') {
        const dt = new Date(listing.ReservedTime);
        reservedTimeDisplay = dt.toLocaleString('zh-TW');
    }

    // Format result for display
    const resultDisplay = listing.Result === 'yes' ? '已接受' :
        listing.Result === 'reject' ? '已拒絕' : '未決定';

    card.innerHTML = `
        <div class="listing-card-image">
            <img src="${listing.連結圖片 || '/default-image.jpg'}" alt="${listing.標題}" onerror="this.src='/default-image.jpg'">
            <div class="listing-card-actions">
                <button class="action-btn edit-btn" data-url="${listing.URL}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete-btn" data-url="${listing.URL}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        <div class="listing-card-content">
            <h3 class="listing-card-title">${listing.標題}</h3>
            <div class="listing-card-url">
                <a href="${listing.URL}" target="_blank">${listing.URL}</a>
            </div>
            <div class="listing-card-info">
                <div class="listing-card-info-item">
                    <span>聯繫狀態:</span>
                    <span class="${listing.Contact === 'yes' ? 'status-yes' : 'status-no'}">
                        ${listing.Contact === 'yes' ? '已聯繫' : '未聯繫'}
                    </span>
                </div>
                <div class="listing-card-info-item">
                    <span>預約時間:</span>
                    <span>${reservedTimeDisplay}</span>
                </div>
                <div class="listing-card-info-item">
                    <span>結果:</span>
                    <span class="${resultClass}">${resultDisplay}</span>
                </div>
            </div>
        </div>
    `;

    // Add event listeners for edit and delete buttons
    const editBtn = card.querySelector('.edit-btn');
    const deleteBtn = card.querySelector('.delete-btn');

    editBtn.addEventListener('click', () => openEditModal(listing));
    deleteBtn.addEventListener('click', () => deleteListing(listing.URL));

    return card;
}

// Open edit modal with prefilled data
function openEditModal(listing) {
    document.getElementById('edit-url').value = listing.URL;
    document.getElementById('edit-contact').checked = listing.Contact === 'yes';

    if (listing.ReservedTime && listing.ReservedTime !== '') {
        // Format the date for datetime-local input (YYYY-MM-DDThh:mm)
        const dt = new Date(listing.ReservedTime);
        const formattedDate = dt.toISOString().slice(0, 16);
        document.getElementById('edit-reservedTime').value = formattedDate;
    } else {
        document.getElementById('edit-reservedTime').value = '';
    }

    document.getElementById('edit-result').value = listing.Result || 'no';

    editModal.style.display = 'block';
}

// Delete a listing
async function deleteListing(url) {
    if (!confirm('確定要刪除此租屋記錄嗎？')) return;

    try {
        const response = await fetch(SHEET_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                URL: url,
                Result: 'delete'
            }),
        });

        const data = await response.json();

        if (data.status === 'success') {
            alert('記錄已成功刪除！');
            fetchListings();
        } else {
            showError('Error deleting record: ' + data.message);
        }
    } catch (error) {
        showError('Error connecting to the server: ' + error.message);
    }
}

// Fetch URL metadata
fetchInfoBtn.addEventListener('click', async () => {
    const urlInput = document.getElementById('url');
    const url = urlInput.value.trim();

    if (!url) {
        alert('請輸入有效的 URL！');
        return;
    }

    try {
        // Using a CORS proxy to fetch the website data
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;

        const response = await fetch(proxyUrl);
        const data = await response.json();

        if (data.contents) {
            // Create a DOM parser to parse the HTML content
            const parser = new DOMParser();
            const doc = parser.parseFromString(data.contents, 'text/html');

            // Extract title
            const title = doc.querySelector('title')?.textContent || '';
            document.getElementById('title').value = title;

            // Extract the first image
            const firstImage = doc.querySelector('img[src^="http"]')?.src || '';
            document.getElementById('image').value = firstImage;
        }
    } catch (error) {
        alert('無法取得網頁資訊: ' + error.message);
    }
});

// Add listing form submission
addListingForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = {
        URL: document.getElementById('url').value,
        標題: document.getElementById('title').value,
        連結圖片: document.getElementById('image').value,
        Contact: document.getElementById('contact').checked ? 'yes' : 'no',
        ReservedTime: document.getElementById('reservedTime').value,
        Result: document.getElementById('result').value
    };

    try {
        const response = await fetch(SHEET_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'create',
                ...formData
            }),
        });

        const data = await response.json();

        if (data.status === 'success') {
            alert('租屋記錄新增成功！');
            addModal.style.display = 'none';
            addListingForm.reset();
            fetchListings();
        } else {
            showError('Error adding record: ' + data.message);
        }
    } catch (error) {
        showError('Error connecting to the server: ' + error.message);
    }
});

// Edit listing form submission
editListingForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = {
        URL: document.getElementById('edit-url').value,
        Contact: document.getElementById('edit-contact').checked ? 'yes' : 'no',
        ReservedTime: document.getElementById('edit-reservedTime').value,
        Result: document.getElementById('edit-result').value
    };

    try {
        const response = await fetch(SHEET_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'update',
                ...formData
            }),
        });

        const data = await response.json();

        if (data.status === 'success') {
            alert('租屋記錄更新成功！');
            editModal.style.display = 'none';
            fetchListings();
        } else {
            showError('Error updating record: ' + data.message);
        }
    } catch (error) {
        showError('Error connecting to the server: ' + error.message);
    }
});

// Show error message
function showError(message) {
    alert('Error: ' + message);
    console.error(message);
}

// Initialize: Load listings when page loads
document.addEventListener('DOMContentLoaded', () => {
    fetchListings();
});