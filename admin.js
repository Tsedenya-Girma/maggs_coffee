// --- Login & Theme Logic ---
/**
 * Checks the admin password and toggles visibility of the dashboard.
 */
function checkLogin() {
    const pass = document.getElementById('adminPass').value;
    if (pass === "admin123") {
        document.getElementById('loginGate').style.display = 'none';
        document.getElementById('adminContent').style.display = 'block';
        loadAdminData();
        loadMenuManagement();
    } else {
        alert("Incorrect Password");
    }
}

/**
 * Toggles dark mode class on the body element.
 */
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
}

// --- Order Management ---
/**
 * Fetches order data from the server and populates the admin dashboard table.
 * Includes fixes for displaying the correct order time and handling JSON items.
 */
async function loadAdminData() {
    try {
        const response = await fetch('get_orders.php');
        const orders = await response.json();

        // Ensure we have an array to work with
        const safeOrders = Array.isArray(orders) ? orders : [];

        // 1. Update Stats - Always calculated from ALL orders
        const totalRev = safeOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
        document.getElementById('stat-sales').innerText = `ETB ${totalRev.toFixed(2)}`;
        document.getElementById('stat-orders').innerText = safeOrders.length;

        // 2. GET FILTER VALUE
        const filterValue = document.getElementById('orderFilter')?.value || "Active";

        // 3. FILTER THE ORDERS LIST
        const filteredOrders = safeOrders.filter(o => {
            if (filterValue === "Active") return o.status === "Pending";
            if (filterValue === "Ready") return o.status === "Ready";
            return true; // Show "All"
        });

        const orderBody = document.getElementById('orderTableBody');
        
        if (filteredOrders.length === 0) {
            orderBody.innerHTML = `<tr><td colspan='5' style='text-align:center;'>No ${filterValue.toLowerCase()} orders found.</td></tr>`;
            return;
        }

        // 4. GENERATE TABLE ROWS
        orderBody.innerHTML = filteredOrders.map(o => {
            // Process the items list correctly from the decoded JSON array
            const items = Array.isArray(o.items) ? o.items : [];
            const itemDetails = items.map(item => 
                `${item.quantity}x ${item.name}`
            ).join(', ');

            return `
                <tr>
                    <td>#${o.id}</td>
                    <td>
                        <strong>${itemDetails}</strong><br>
                        <small style="color: #666;">Total: ETB ${parseFloat(o.total_amount).toFixed(2)}</small>
                    </td>
                    <td>${o.order_time ? new Date(o.order_time).toLocaleString() : 'N/A'}</td>
                    <td>
                        <span style="font-weight: bold; color: ${o.status === 'Ready' ? '#27ae60' : '#f39c12'}">
                            ${o.status}
                        </span>
                    </td>
                    <td>
                        ${o.status !== 'Ready' ? 
                            `<button class="btn-ready" onclick="updateStatus(${o.id}, 'Ready')" style="cursor:pointer; background: #9C6644; color: white; border: none; padding: 5px 10px; border-radius: 12px;">Mark Ready</button>` : 
                            `<span style="color: #27ae60; font-weight: bold;">✓ Prepared</span>`
                        }
                    </td>
                </tr>
            `;
        }).join('');

    } catch (e) { 
        console.error("The error happened here:", e);
        document.getElementById('orderTableBody').innerHTML = "<tr><td colspan='5'>Error: Database returned invalid data.</td></tr>";
    }
}

/**
 * Updates the status of an order in the database.
 */
async function updateStatus(id, status) {
    try {
        await fetch('update_status.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ id, status })
        });
        // Re-load data to refresh the view
        loadAdminData();
    } catch (e) { console.error("Update Status Error", e); }
}

// --- Menu Management Logic ---
/**
 * Fetches product data and populates the menu management section.
 */
async function loadMenuManagement() {
    try {
        const response = await fetch('get_products.php');
        const products = await response.json();
        
        console.log("Products loaded:", products); // Debug log
        
        if (products.error) {
            console.error("Error loading products:", products.error);
            document.getElementById('menuTableBody').innerHTML = `<tr><td colspan='3'>Error: ${products.error}</td></tr>`;
            return;
        }
        
        document.getElementById('stat-items').innerText = products.length;
        const menuBody = document.getElementById('menuTableBody');

        if (products.length === 0) {
            menuBody.innerHTML = `<tr><td colspan='3' style='text-align:center;'>No products found in database.</td></tr>`;
            return;
        }

        menuBody.innerHTML = products.map(p => `
            <tr class="menu-row">
                <td class="item-name">${p.name}</td>
                <td>
                    <div style="display: flex; gap: 5px; align-items: center;">
                        ETB <input type="number" id="price-${p.id}" value="${parseFloat(p.price || 0).toFixed(2)}" 
                        style="width: 80px; padding: 4px; border-radius: 4px; border: 1px solid #ccc;">
                        <button onclick="updatePrice(${p.id})" style="background: #27ae60; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">Save</button>
                    </div>
                </td>
                <td>
                    <button class="stock-toggle" 
                            style="cursor:pointer; border: 1px solid ${p.is_available == 1 ? '#9C6644' : '#ef476f'}; color: ${p.is_available == 1 ? '#9C6644' : '#ef476f'}; background: none; padding: 5px 10px; border-radius: 8px;"
                            onclick="updateProductStock(${p.id}, ${p.is_available == 1 ? 0 : 1})">
                        ${p.is_available == 1 ? 'In Stock' : 'Out of Stock'}
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (e) { 
        console.error("Menu Load Error", e);
        document.getElementById('menuTableBody').innerHTML = `<tr><td colspan='3'>Error loading products: ${e.message}</td></tr>`;
    }
}

/**
 * Updates a product's price in the database.
 */
async function updatePrice(id) {
    const inputEl = document.getElementById(`price-${id}`);
    if (!inputEl) return;
    const newPrice = inputEl.value.trim();

    if (newPrice === '' || parseFloat(newPrice) < 0) {
        alert("Please enter a valid price");
        return;
    }

    const priceNum = parseFloat(newPrice);

    try {
        const response = await fetch('update_product.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                id: id,
                price: priceNum
            })
        });

        let result;
        try {
            result = await response.json();
        } catch (parseErr) {
            console.error("Response was not JSON:", parseErr);
            alert("Server returned invalid response. Open the admin page via a web server: http://localhost/aba/admin.html (not by double-clicking the file).");
            return;
        }

        console.log("Update response:", result);
        console.log("Response status:", response.status);
        console.log("Response ok:", response.ok);

        if (response.ok && result.success) {
            alert("✅ Price saved to database! Refresh the main page (index.html) to see the new price.");
            loadMenuManagement(); // Reload admin table to show updated price
        } else {
            const errMsg = result.error || ("Server error " + response.status) || "Unknown error";
            alert("❌ Error saving price: " + errMsg + "\n\nCheck:\n1. Are you using http://localhost/aba/admin.html?\n2. Is the database 'maggs_coffee' running?\n3. Does the products table have a product with ID " + id + "?");
            console.error("Update failed:", result);
            console.error("Product ID:", id);
            console.error("Price sent:", priceNum);
        }
    } catch (e) {
        console.error("Price Update Error", e);
        alert("Could not reach server. Open the admin page via your web server (e.g. http://localhost/aba/admin.html), not by opening the file directly. " + e.message);
    }
}

/**
 * Toggles product availability (in/out of stock).
 */
async function updateProductStock(id, status) {
    console.log("Updating stock - ID:", id, "Status:", status);
    try {
        const response = await fetch('update_product.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ id, is_available: status })
        });
        let result = { success: false };
        try {
            result = await response.json();
        } catch (parseErr) {
            console.error("Failed to parse response:", parseErr);
            alert("Server returned invalid response. Make sure you're using http://localhost/aba/admin.html");
            return;
        }
        console.log("Stock update response:", result);
        if (response.ok && result.success) {
            alert("✅ Stock updated! Refresh the main page to see the change.");
            loadMenuManagement(); // Reload admin table
        } else {
            const errMsg = result.error || ("Server error " + response.status) || "Unknown error";
            alert("❌ Error updating stock: " + errMsg + "\n\nCheck:\n1. Are you using http://localhost/aba/admin.html?\n2. Is the database running?\n3. Does product ID " + id + " exist?");
            console.error("Stock update failed:", result);
        }
    } catch (e) {
        console.error("Update Stock Error", e);
        alert("❌ Could not reach server. Open admin via http://localhost/aba/admin.html\n\nError: " + e.message);
    }
}

/**
 * Client-side search for the menu management table.
 */
function filterMenu() {
    const query = document.getElementById('menuSearch').value.toLowerCase();
    document.querySelectorAll('.menu-row').forEach(row => {
        const name = row.querySelector('.item-name').innerText.toLowerCase();
        row.style.display = name.includes(query) ? "" : "none";
    });
}
