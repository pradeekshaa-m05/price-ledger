/* =========================================================================
   Bhuvaneswari Oil Mill - Price Ledger (Static SPA)
   =========================================================================
   100% client-side. Data stored in localStorage.
   Share via compressed URL. PDF generated with jsPDF.
   ========================================================================= */

const ORG_NAME = 'Bhuvaneswari Oil Mill';
const STORAGE_KEY = 'bom_products';
const SETTINGS_KEY = 'bom_settings';
const UNITS_KEY = 'bom_units';

const DEFAULT_UNITS = [
    'per kg', 'per litre', 'per piece', 'per packet',
    'per tin', 'per bottle', 'per dozen', 'per quintal'
];

// =========================================================================
// State
// =========================================================================
let products = [];
let isLoggedIn = false;

function loadProducts() {
    try {
        products = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch { products = []; }
}

function saveProducts() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

function loadSettings() {
    try {
        return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
    } catch { return {}; }
}

function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// =========================================================================
// Units Management
// =========================================================================
function loadUnits() {
    try {
        const stored = JSON.parse(localStorage.getItem(UNITS_KEY));
        return (stored && stored.length > 0) ? stored : [...DEFAULT_UNITS];
    } catch { return [...DEFAULT_UNITS]; }
}

function saveUnits(units) {
    localStorage.setItem(UNITS_KEY, JSON.stringify(units));
}

function populateUnitDropdowns(selectedValue) {
    const units = loadUnits();
    const selects = [document.getElementById('addUnit'), document.getElementById('editUnit')];
    selects.forEach(select => {
        if (!select) return;
        const currentVal = selectedValue || select.value;
        select.innerHTML = units.map(u =>
            `<option value="${escapeHtml(u)}" ${u === currentVal ? 'selected' : ''}>${escapeHtml(u)}</option>`
        ).join('');
    });
}

function renderUnitsList() {
    const units = loadUnits();
    const container = document.getElementById('unitsList');
    if (!container) return;

    if (units.length === 0) {
        container.innerHTML = '<p class="text-muted small">No units added. Add one above.</p>';
        return;
    }

    container.innerHTML = units.map((unit, idx) => `
        <div class="d-flex align-items-center justify-content-between py-1 px-2 mb-1 rounded ${idx % 2 === 0 ? 'bg-light' : ''}">
            <span class="small fw-medium"><i class="bi bi-tag me-1 text-muted"></i>${escapeHtml(unit)}</span>
            <button class="btn btn-sm btn-outline-danger border-0 remove-unit-btn" data-unit="${escapeHtml(unit)}" title="Remove">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
    `).join('');

    // Attach delete handlers
    container.querySelectorAll('.remove-unit-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const unitToRemove = this.dataset.unit;
            let units = loadUnits();
            units = units.filter(u => u !== unitToRemove);
            saveUnits(units);
            renderUnitsList();
            populateUnitDropdowns();
            showToast('Removed', `"${unitToRemove}" removed from units.`, 'info');
        });
    });
}

// =========================================================================
// Password Hashing (SHA-256 via Web Crypto)
// =========================================================================
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + '_bom_salt_2024');
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// =========================================================================
// Router
// =========================================================================
function navigate(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(`page-${page}`);
    if (target) target.classList.add('active');
}

function router() {
    const hash = window.location.hash || '';

    // Public view with encoded data
    if (hash.startsWith('#/view?d=')) {
        const encoded = hash.substring('#/view?d='.length);
        try {
            const publicProducts = decodeShareData(encoded);
            renderPublicView(publicProducts);
            navigate('public');
        } catch (e) {
            console.error('Failed to decode share data:', e);
            navigate('login');
        }
        return;
    }

    const settings = loadSettings();

    // First-time setup
    if (!settings.passwordHash) {
        navigate('setup');
        return;
    }

    // Route based on login state and hash
    if (hash === '#/dashboard' && isLoggedIn) {
        loadProducts();
        renderDashboard();
        navigate('dashboard');
    } else {
        navigate('login');
    }
}

// =========================================================================
// Compression (pako) for Share Links
// =========================================================================
function encodeShareData(productList) {
    const data = productList.map(p => ({ n: p.name, p: p.price, u: p.unit }));
    const json = JSON.stringify(data);
    const compressed = pako.deflate(json);
    // Convert to URL-safe base64
    let base64 = btoa(String.fromCharCode.apply(null, compressed));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeShareData(encoded) {
    // Restore standard base64
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const pad = (4 - base64.length % 4) % 4;
    base64 += '==='.substring(0, pad);
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const json = pako.inflate(bytes, { to: 'string' });
    return JSON.parse(json);
}

function generateShareLink() {
    const visibleProducts = products.filter(p => p.visible);
    if (visibleProducts.length === 0) return null;
    const encoded = encodeShareData(visibleProducts);
    const base = window.location.origin + window.location.pathname;
    return base + '#/view?d=' + encoded;
}

// =========================================================================
// Toast Notification
// =========================================================================
function showToast(title, message, type = 'success') {
    const toast = document.getElementById('toast');
    document.getElementById('toastTitle').textContent = title;
    document.getElementById('toastBody').textContent = message;
    const icon = document.getElementById('toastIcon');
    const iconMap = {
        success: 'bi-check-circle-fill text-success',
        danger: 'bi-x-circle-fill text-danger',
        warning: 'bi-exclamation-triangle-fill text-warning',
        info: 'bi-info-circle-fill text-info'
    };
    icon.className = `bi me-2 ${iconMap[type] || iconMap.info}`;
    new bootstrap.Toast(toast, { delay: 3000 }).show();
}

// =========================================================================
// Dashboard Rendering
// =========================================================================
function renderDashboard() {
    updateStats();
    renderProductTable();
    populateUnitDropdowns();
}

function updateStats() {
    const total = products.length;
    const visible = products.filter(p => p.visible).length;
    document.getElementById('statTotal').textContent = total;
    document.getElementById('statVisible').textContent = visible;
    document.getElementById('statHidden').textContent = total - visible;
}

function renderProductTable() {
    const tbody = document.getElementById('productTableBody');

    if (products.length === 0) {
        tbody.innerHTML = `
            <tr id="emptyRow">
                <td colspan="6" class="text-center py-5 text-muted">
                    <i class="bi bi-inbox fs-1 d-block mb-2"></i>
                    No products added yet. Click <strong>"Add Product"</strong> to get started.
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = products.map((product, idx) => `
        <tr class="product-row ${product.visible ? '' : 'row-hidden'}" data-id="${product.id}">
            <td class="text-center text-muted">${idx + 1}</td>
            <td class="fw-semibold product-name">${escapeHtml(product.name)}</td>
            <td class="text-end">
                <span class="badge bg-success-subtle text-success fs-6">
                    ₹${product.price.toFixed(2)}
                </span>
            </td>
            <td class="text-center text-muted">${escapeHtml(product.unit)}</td>
            <td class="text-center">
                <div class="form-check form-switch d-flex justify-content-center">
                    <input class="form-check-input visibility-toggle" type="checkbox"
                           data-id="${product.id}" ${product.visible ? 'checked' : ''} role="switch">
                </div>
            </td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-primary me-1 edit-btn"
                        data-id="${product.id}" title="Edit">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger delete-btn"
                        data-id="${product.id}" title="Delete">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');

    // Attach event listeners
    tbody.querySelectorAll('.visibility-toggle').forEach(toggle => {
        toggle.addEventListener('change', function () {
            const id = this.dataset.id;
            const product = products.find(p => p.id === id);
            if (product) {
                product.visible = this.checked;
                saveProducts();
                renderDashboard();
                showToast('Updated', `Visibility ${product.visible ? 'enabled' : 'disabled'}`, 'info');
            }
        });
    });

    tbody.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const product = products.find(p => p.id === this.dataset.id);
            if (!product) return;
            document.getElementById('editId').value = product.id;
            document.getElementById('editName').value = product.name;
            document.getElementById('editPrice').value = product.price;
            populateUnitDropdowns(product.unit);
            document.getElementById('editUnit').value = product.unit;
            new bootstrap.Modal(document.getElementById('editProductModal')).show();
        });
    });

    tbody.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const product = products.find(p => p.id === this.dataset.id);
            if (!product) return;
            document.getElementById('deleteProductId').value = product.id;
            document.getElementById('deleteProductName').textContent = product.name;
            new bootstrap.Modal(document.getElementById('deleteModal')).show();
        });
    });
}

// =========================================================================
// Public View Rendering
// =========================================================================
function renderPublicView(publicProducts) {
    document.getElementById('publicDate').textContent =
        'Updated: ' + new Date().toLocaleDateString('en-IN', {
            day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

    const container = document.getElementById('publicTableContainer');

    if (!publicProducts || publicProducts.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5 text-muted">
                <i class="bi bi-inbox display-1 d-block mb-3 opacity-25"></i>
                <h4>No products available at this time</h4>
                <p>Please check back later.</p>
            </div>`;
        return;
    }

    container.innerHTML = `
        <div class="card price-table shadow-sm border-0">
            <div class="table-responsive">
                <table class="table table-hover align-middle mb-0">
                    <thead>
                        <tr class="table-brown">
                            <th width="60" class="text-center">S.No</th>
                            <th>Product Name</th>
                            <th width="150" class="text-end">Price (₹)</th>
                            <th width="120" class="text-center">Unit</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${publicProducts.map((p, i) => `
                            <tr>
                                <td class="text-center text-muted">${i + 1}</td>
                                <td class="fw-semibold">${escapeHtml(p.n || p.name)}</td>
                                <td class="text-end">
                                    <span class="price-badge">₹${(p.p || p.price).toFixed(2)}</span>
                                </td>
                                <td class="text-center text-muted">${escapeHtml(p.u || p.unit)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div class="card-footer bg-white text-muted text-center py-3">
                <small>${publicProducts.length} product(s) listed &bull; Prices subject to change without prior notice</small>
            </div>
        </div>`;

    // Wire up public PDF button
    document.getElementById('publicPdfBtn').onclick = () => {
        const mapped = publicProducts.map(p => ({
            name: p.n || p.name,
            price: p.p || p.price,
            unit: p.u || p.unit
        }));
        generatePDF(mapped);
    };
}

// =========================================================================
// PDF Generation (jsPDF + AutoTable)
// =========================================================================
function generatePDF(productList) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(139, 69, 19);
    doc.text(ORG_NAME, pageWidth / 2, 22, { align: 'center' });

    doc.setFontSize(13);
    doc.setTextColor(100, 100, 100);
    doc.text('Price List', pageWidth / 2, 32, { align: 'center' });

    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    const dateStr = 'As on ' + new Date().toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric'
    });
    doc.text(dateStr, pageWidth / 2, 40, { align: 'center' });

    // Divider line
    doc.setDrawColor(139, 69, 19);
    doc.setLineWidth(0.5);
    doc.line(15, 44, pageWidth - 15, 44);

    // Table
    const tableData = productList.map((p, i) => [
        i + 1,
        p.name,
        '\u20B9' + p.price.toFixed(2),
        p.unit
    ]);

    doc.autoTable({
        head: [['S.No', 'Product Name', 'Price', 'Unit']],
        body: tableData,
        startY: 48,
        theme: 'grid',
        headStyles: {
            fillColor: [139, 69, 19],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center'
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 20 },
            1: { cellWidth: 90 },
            2: { halign: 'right', cellWidth: 40 },
            3: { halign: 'center', cellWidth: 30 }
        },
        alternateRowStyles: { fillColor: [245, 240, 235] },
        styles: { fontSize: 10, cellPadding: 4 },
        margin: { left: 15, right: 15 }
    });

    // Footer info
    const finalY = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`Total: ${productList.length} product(s)`, pageWidth - 15, finalY, { align: 'right' });

    // Page footer
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(15, pageHeight - 18, pageWidth - 15, pageHeight - 18);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
        `Generated on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
        pageWidth / 2, pageHeight - 12, { align: 'center' }
    );

    const fileName = `Bhuvaneswari_Oil_Mill_Price_List_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
}

// =========================================================================
// Utility
// =========================================================================
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

// =========================================================================
// Event Handlers - Setup & Login
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
    renderUnitsList();
    
    // ---- Setup Form ----
    document.getElementById('setupForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const pass = document.getElementById('setupPassword').value;
        const confirm = document.getElementById('setupConfirm').value;

        if (pass !== confirm) {
            showToast('Error', 'Passwords do not match.', 'danger');
            return;
        }
        if (pass.length < 4) {
            showToast('Error', 'Password must be at least 4 characters.', 'danger');
            return;
        }

        const hash = await hashPassword(pass);
        saveSettings({ passwordHash: hash });
        showToast('Success', 'Password set! Please log in.', 'success');
        window.location.hash = '#/login';
        router();
    });

    // ---- Login Form ----
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (username !== 'admin') {
            document.getElementById('loginAlert').textContent = 'Invalid username.';
            document.getElementById('loginAlert').classList.remove('d-none');
            return;
        }

        const settings = loadSettings();
        const hash = await hashPassword(password);

        if (hash !== settings.passwordHash) {
            document.getElementById('loginAlert').textContent = 'Invalid password.';
            document.getElementById('loginAlert').classList.remove('d-none');
            return;
        }

        document.getElementById('loginAlert').classList.add('d-none');
        isLoggedIn = true;
        window.location.hash = '#/dashboard';
        loadProducts();
        renderDashboard();
        navigate('dashboard');
        showToast('Welcome', 'Welcome back, Admin!', 'success');
    });

    // ---- Logout ----
    document.getElementById('logoutBtn').addEventListener('click', () => {
        isLoggedIn = false;
        window.location.hash = '#/login';
        router();
        showToast('Logged out', 'You have been logged out.', 'info');
    });

    // ---- Add Product ----
    document.getElementById('saveProductBtn').addEventListener('click', () => {
        const name = document.getElementById('addName').value.trim();
        const price = parseFloat(document.getElementById('addPrice').value);
        const unit = document.getElementById('addUnit').value;
        const visible = document.getElementById('addVisible').checked;

        if (!name) { showToast('Error', 'Product name is required.', 'danger'); return; }
        if (isNaN(price) || price < 0) { showToast('Error', 'Valid price is required.', 'danger'); return; }

        products.push({ id: generateId(), name, price, unit, visible });
        saveProducts();
        renderDashboard();

        // Reset form and close modal
        document.getElementById('addProductForm').reset();
        document.getElementById('addVisible').checked = true;
        bootstrap.Modal.getInstance(document.getElementById('addProductModal')).hide();
        showToast('Success', `${name} added!`, 'success');
    });

    // ---- Update Product ----
    document.getElementById('updateProductBtn').addEventListener('click', () => {
        const id = document.getElementById('editId').value;
        const name = document.getElementById('editName').value.trim();
        const price = parseFloat(document.getElementById('editPrice').value);
        const unit = document.getElementById('editUnit').value;

        if (!name) { showToast('Error', 'Product name is required.', 'danger'); return; }
        if (isNaN(price) || price < 0) { showToast('Error', 'Valid price is required.', 'danger'); return; }

        const product = products.find(p => p.id === id);
        if (product) {
            product.name = name;
            product.price = price;
            product.unit = unit;
            saveProducts();
            renderDashboard();
            bootstrap.Modal.getInstance(document.getElementById('editProductModal')).hide();
            showToast('Success', `${name} updated!`, 'success');
        }
    });

    // ---- Delete Product ----
    document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
        const id = document.getElementById('deleteProductId').value;
        products = products.filter(p => p.id !== id);
        saveProducts();
        renderDashboard();
        bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
        showToast('Deleted', 'Product removed.', 'success');
    });

    // ---- Search ----
    document.getElementById('searchInput').addEventListener('input', function () {
        const query = this.value.toLowerCase();
        document.querySelectorAll('.product-row').forEach(row => {
            const name = row.querySelector('.product-name')?.textContent.toLowerCase() || '';
            row.style.display = name.includes(query) ? '' : 'none';
        });
    });

    // ---- Share Button ----
    document.getElementById('shareBtnTop').addEventListener('click', () => {
        const link = generateShareLink();
        const input = document.getElementById('shareUrl');
        if (link) {
            input.value = link;
        } else {
            input.value = '(No visible products to share)';
        }
        new bootstrap.Modal(document.getElementById('shareModal')).show();
    });

    // ---- Copy Link ----
    document.getElementById('copyLinkBtn').addEventListener('click', () => {
        const url = document.getElementById('shareUrl').value;
        if (!url || url.startsWith('(')) return;
        navigator.clipboard.writeText(url).then(() => {
            showToast('Copied!', 'Link copied to clipboard.', 'success');
            const btn = document.getElementById('copyLinkBtn');
            btn.innerHTML = '<i class="bi bi-clipboard-check"></i>';
            setTimeout(() => btn.innerHTML = '<i class="bi bi-clipboard"></i>', 2000);
        });
    });

    // ---- Open Share Link ----
    document.getElementById('openShareLink').addEventListener('click', () => {
        const url = document.getElementById('shareUrl').value;
        if (url && !url.startsWith('(')) window.open(url, '_blank');
    });

    // ---- PDF Buttons ----
    document.getElementById('pdfBtnTop').addEventListener('click', () => {
        const visibleProducts = products.filter(p => p.visible);
        if (visibleProducts.length === 0) {
            showToast('No Data', 'No visible products to export.', 'warning');
            return;
        }
        generatePDF(visibleProducts);
    });

    document.getElementById('sharePdfBtn').addEventListener('click', () => {
        const visibleProducts = products.filter(p => p.visible);
        if (visibleProducts.length === 0) {
            showToast('No Data', 'No visible products to export.', 'warning');
            return;
        }
        generatePDF(visibleProducts);
    });

    // ---- Export Data ----
    document.getElementById('exportDataBtn').addEventListener('click', () => {
        const data = JSON.stringify(products, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bom_products_backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Exported', 'Product data downloaded.', 'success');
    });

    // ---- Import Data ----
    document.getElementById('importDataInput').addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target.result);
                if (!Array.isArray(imported)) throw new Error('Invalid format');

                // Validate structure
                const valid = imported.every(p => p.name && typeof p.price === 'number');
                if (!valid) throw new Error('Invalid product data');

                // Assign IDs if missing
                imported.forEach(p => {
                    if (!p.id) p.id = generateId();
                    if (p.visible === undefined) p.visible = true;
                    if (!p.unit) p.unit = 'per kg';
                });

                products = imported;
                saveProducts();
                renderDashboard();
                showToast('Imported', `${imported.length} product(s) loaded.`, 'success');
            } catch (err) {
                showToast('Error', 'Invalid backup file: ' + err.message, 'danger');
            }
        };
        reader.readAsText(file);
        this.value = ''; // Reset input
    });

    // ---- Manage Units ----
    document.getElementById('addUnitBtn').addEventListener('click', () => {
        const input = document.getElementById('newUnitInput');
        const newUnit = input.value.trim();
        if (!newUnit) return;

        let units = loadUnits();
        if (units.includes(newUnit)) {
            showToast('Warning', 'Unit already exists.', 'warning');
            return;
        }

        units.push(newUnit);
        saveUnits(units);
        input.value = '';
        renderUnitsList();
        populateUnitDropdowns();
        showToast('Success', `Unit "${newUnit}" added.`, 'success');
    });

    document.getElementById('newUnitInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('addUnitBtn').click();
        }
    });

    // ---- Change Password ----
    document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const current = document.getElementById('currentPassword').value;
        const newPass = document.getElementById('newPassword').value;
        const confirmPass = document.getElementById('confirmNewPassword').value;

        if (newPass !== confirmPass) {
            showToast('Error', 'New passwords do not match.', 'danger');
            return;
        }
        if (newPass.length < 4) {
            showToast('Error', 'Password must be at least 4 characters.', 'danger');
            return;
        }

        const settings = loadSettings();
        const currentHash = await hashPassword(current);
        if (currentHash !== settings.passwordHash) {
            showToast('Error', 'Current password is incorrect.', 'danger');
            return;
        }

        settings.passwordHash = await hashPassword(newPass);
        saveSettings(settings);
        document.getElementById('changePasswordForm').reset();
        bootstrap.Modal.getInstance(document.getElementById('settingsModal')).hide();
        showToast('Success', 'Password changed!', 'success');
    });

    // ---- Reset App ----
    document.getElementById('resetAppBtn').addEventListener('click', () => {
        if (!confirm('⚠️ This will delete ALL products and reset your password. This cannot be undone!\n\nAre you sure?')) return;
        if (!confirm('FINAL WARNING: All data will be permanently deleted. Continue?')) return;

        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(SETTINGS_KEY);
        products = [];
        isLoggedIn = false;
        bootstrap.Modal.getInstance(document.getElementById('settingsModal')).hide();
        window.location.hash = '';
        router();
        showToast('Reset', 'App has been reset.', 'warning');
    });

    // ---- Enter key support in modals ----
    document.getElementById('addProductForm').addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); document.getElementById('saveProductBtn').click(); }
    });
    document.getElementById('editProductForm').addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); document.getElementById('updateProductBtn').click(); }
    });

    // ---- Hash change listener ----
    window.addEventListener('hashchange', router);

    // ---- Initial route ----
    router();
});
