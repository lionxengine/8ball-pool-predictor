import { initializeApp, getApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, updatePassword, reauthenticateWithCredential, EmailAuthProvider, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, doc, getDoc, getDocs, collection, query, where, addDoc, serverTimestamp, setDoc, updateDoc, onSnapshot, orderBy, limit, startAfter, getCountFromServer, deleteDoc, increment } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyCzfbotjRCNYM2j_wRwICU03cx6EbKjWfE",
    authDomain: "lionengine.firebaseapp.com",
    projectId: "lionengine",
    storageBucket: "lionengine.firebasestorage.app",
    messagingSenderId: "449107794375",
    appId: "1:449107794375:web:57124ecae474162b0de1e2"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- UI ELEMENTS ---
const loginScreen = document.getElementById('login-screen');
const mainDashboard = document.getElementById('main-dashboard');
const loginBtn = document.getElementById('login-btn');
const logoutBtnNav = document.getElementById('logout-btn-nav');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('login-error');

const tabs = document.querySelectorAll('.nav-links li[data-tab]');
const tabContents = document.querySelectorAll('.tab-content');

// Mobile Hamburger Elements
const hamburgerBtn = document.getElementById('hamburger-menu-btn');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');

let currentUserData = null;

// --- CUSTOM TOAST NOTIFICATION SYSTEM ---
function showToast(message, duration = 4000) {
    const lower = message.toLowerCase();
    let type = 'info';
    let icon = 'fa-info-circle';
    
    if (lower.includes('error') || lower.includes('fail') || lower.includes('unauthorized') || lower.includes('invalid') || lower.includes('insufficient') || lower.includes('please')) {
        type = 'error';
        icon = 'fa-circle-xmark';
    } else if (lower.includes('success') || lower.includes('completed') || lower.includes('saved') || lower.includes('added') || lower.includes('updated') || lower.includes('unbanned') || lower.includes('deleted') || lower.includes('cleared')) {
        type = 'success';
        icon = 'fa-circle-check';
    }

    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;
    
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas ${icon} toast-icon"></i>
            <div class="toast-text-wrapper">
                <span class="toast-title">${type}</span>
                <span class="toast-message">${message}</span>
            </div>
        </div>
        <button class="toast-close-btn">&times;</button>
        <div class="toast-progress"></div>
    `;

    container.appendChild(toast);

    const progress = toast.querySelector('.toast-progress');
    progress.style.animationName = 'toastProgress';
    progress.style.animationDuration = `${duration}ms`;

    setTimeout(() => toast.classList.add('show'), 10);

    let dismissTimer;
    
    const dismiss = () => {
        toast.classList.remove('show');
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 450);
    };

    toast.querySelector('.toast-close-btn').onclick = dismiss;

    dismissTimer = setTimeout(dismiss, duration);

    // Pause countdown on mouse hover
    toast.onmouseenter = () => {
        clearTimeout(dismissTimer);
        progress.style.animationPlayState = 'paused';
    };
    
    // Resume countdown on mouse leave
    toast.onmouseleave = () => {
        const currentWidth = progress.offsetWidth;
        const totalWidth = toast.offsetWidth;
        const ratio = totalWidth > 0 ? (currentWidth / totalWidth) : 1;
        const remainingTime = ratio * duration;
        progress.style.animationPlayState = 'running';
        dismissTimer = setTimeout(dismiss, remainingTime);
    };
}

// Override native alert
window.alert = function(msg) {
    showToast(msg);
};

// --- PASSWORD EYE TOGGLES ---
document.body.addEventListener('click', (e) => {
    const toggleBtn = e.target.closest('.toggle-password-btn');
    if (toggleBtn) {
        const targetId = toggleBtn.getAttribute('data-target');
        const input = document.getElementById(targetId);
        const icon = toggleBtn.querySelector('i');

        if (input && icon) {
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.replace('fa-eye', 'fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.replace('fa-eye-slash', 'fa-eye');
            }
        }
    }
});

// --- MOBILE SIDEBAR NAVIGATION ---
if (hamburgerBtn && sidebar && sidebarOverlay) {
    hamburgerBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        sidebarOverlay.classList.toggle('open');
    });

    sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('open');
    });
}

// --- TAB SWITCHING ---
function setupTabSwitching() {
    tabs.forEach(tab => {
        tab.onclick = () => {
            const target = tab.getAttribute('data-tab');
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            tabContents.forEach(c => c.classList.remove('active'));
            document.getElementById(`${target}-tab`).classList.add('active');

            // Close mobile sidebar drawer
            if (sidebar) sidebar.classList.remove('open');
            if (sidebarOverlay) sidebarOverlay.classList.remove('open');

            if (target === 'keys') loadKeys();
            if (target === 'dashboard') loadDashboardKeyLogs();
        };
    });
}

// --- AUTH LOGIC ---
loginBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
        loginError.innerText = "Please fill in all fields.";
        return;
    }

    loginBtn.disabled = true;
    loginBtn.innerText = "Signing In...";
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        loginError.innerText = "Invalid credentials!";
    } finally {
        loginBtn.disabled = false;
        loginBtn.innerText = "SIGN IN";
    }
});

const logoutModalOverlay = document.getElementById('logout-modal-overlay');
const logoutModalCancel = document.getElementById('logout-modal-cancel');
const logoutModalConfirm = document.getElementById('logout-modal-confirm');

if (logoutBtnNav && logoutModalOverlay) {
    logoutBtnNav.addEventListener('click', () => {
        logoutModalOverlay.classList.remove('hidden');
    });
}

if (logoutModalCancel) {
    logoutModalCancel.addEventListener('click', () => {
        logoutModalOverlay.classList.add('hidden');
    });
}

if (logoutModalConfirm) {
    logoutModalConfirm.addEventListener('click', () => {
        logoutModalConfirm.disabled = true;
        logoutModalConfirm.innerText = "Logging out...";
        signOut(auth).then(() => {
            location.reload();
        }).catch(err => {
            alert("Error: " + err.message);
            logoutModalConfirm.disabled = false;
            logoutModalConfirm.innerText = "Logout";
        });
    });
}

onAuthStateChanged(auth, async (user) => {
    try {
        if (user) {
            console.log("User detected:", user.uid);

            // Hardcoded check for admin
            if (user.uid === "ojmHilq-6xgU1msdcceKpVAgeWA3") {
                currentUserData = { name: "Lion Admin", role: "admin" };
                loginScreen.classList.add('hidden');
                mainDashboard.classList.remove('hidden');
                setupDashboard();
                return;
            }

            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();

                // Ban Check
                if (userData.status === "banned") {
                    alert("Your account is banned. Please contact the Admin.");
                    await signOut(auth);
                    location.reload();
                    return;
                }

                currentUserData = userData;
                loginScreen.classList.add('hidden');
                mainDashboard.classList.remove('hidden');
                setupDashboard();
            } else {
                console.warn("User doc not found, logging out.");
                signOut(auth);
            }
        } else {
            loginScreen.classList.remove('hidden');
            mainDashboard.classList.add('hidden');
        }
    } catch (e) {
        console.error("Auth State Error:", e);
    }
});

// --- DASHBOARD SETUP ---
function setupDashboard() {
    const isSuperAdmin = currentUserData.role === 'admin';
    const welcomeUsername = document.getElementById('welcome-username');
    const welcomeSubtitle = document.getElementById('welcome-subtitle');
    const welcomeIconContainer = document.getElementById('welcome-icon-container');

    if (welcomeUsername) {
        welcomeUsername.innerText = currentUserData.name;
        welcomeUsername.className = isSuperAdmin ? "glow-username-admin" : "glow-username-reseller";
    }

    if (welcomeSubtitle) {
        welcomeSubtitle.innerText = isSuperAdmin 
            ? "System access cleared. Parameters are nominal." 
            : "Key generation portal active. Secure connection established.";
    }

    if (welcomeIconContainer) {
        welcomeIconContainer.innerHTML = isSuperAdmin 
            ? `<i class="fas fa-shield-halved welcome-icon admin-glow"></i>`
            : `<i class="fas fa-user-shield welcome-icon reseller-glow"></i>`;
    }

    // Role-based views configuration
    if (isSuperAdmin) {
        document.getElementById('resellers-tab-link').classList.remove('hidden');
        document.getElementById('prices-tab-link').classList.remove('hidden');
        document.getElementById('update-tab-link').classList.remove('hidden');
        document.getElementById('extend-tab-link').classList.remove('hidden');
        document.getElementById('trial-tab-link').classList.remove('hidden');
        
        const badge = document.getElementById('user-role-badge');
        if (badge) {
            badge.className = "badge badge-admin";
            badge.innerText = "Admin";
        }

        // Show Admin Only Cards
        document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
        document.getElementById('balance-card').classList.add('hidden'); // Hide reseller personal balance card

        // Listen to total revenue stats in real-time
        onSnapshot(doc(db, "settings", "stats"), (docSnap) => {
            if (docSnap.exists()) {
                const rev = docSnap.data().total_revenue || 0;
                document.getElementById('stat-revenue').innerText = `$${rev.toFixed(2)}`;
            }
        });

        loadResellers();
        loadPrices();
    } else {
        document.getElementById('resellers-tab-link').classList.add('hidden');
        document.getElementById('prices-tab-link').classList.add('hidden');
        document.getElementById('update-tab-link').classList.add('hidden');
        document.getElementById('extend-tab-link').classList.add('hidden');
        document.getElementById('trial-tab-link').classList.add('hidden');
        const badge = document.getElementById('user-role-badge');
        if (badge) {
            badge.className = "badge badge-reseller";
            badge.innerText = "Reseller";
        }

        // Show Reseller Cards
        document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
        document.getElementById('balance-card').classList.remove('hidden'); // Show reseller personal balance card

        // Listen to balance changes in real-time
        onSnapshot(doc(db, "users", auth.currentUser.uid), (docSnap) => {
            if (docSnap.exists()) {
                const bal = docSnap.data().balance || 0;
                document.getElementById('stat-balance').innerText = `$${bal.toFixed(2)}`;
            }
        });
    }

    loadStats();
    loadKeys();
    loadDashboardKeyLogs();
    setupTabSwitching();
    loadGlobalSettings();

    // Attach key actions delegation once
    const keysList = document.getElementById('keys-list');
    if (keysList) {
        keysList.onclick = async (e) => {
            const button = e.target.closest('button');
            if (!button) return;

            const id = button.getAttribute('data-id');
            if (!id) return;

            if (button.classList.contains('delete-key-btn') || button.querySelector('.fa-trash')) {
                handleDeleteKey(id);
            } else if (button.classList.contains('ban-btn') || button.querySelector('.fa-ban') || button.querySelector('.fa-key')) {
                const isUnban = button.classList.contains('unban');

                // If reseller, double check that this key belongs to them
                if (currentUserData.role === 'reseller') {
                    const keyDoc = await getDoc(doc(db, "keys", id));
                    if (keyDoc.exists() && keyDoc.data().reseller_uid !== auth.currentUser.uid) {
                        alert("Unauthorized to ban this key!");
                        return;
                    }
                }

                const confirmed = await customConfirm(
                    isUnban ? "Unban License Key" : "Ban License Key",
                    `Are you sure you want to ${isUnban ? 'unban' : 'ban'} this license key?`,
                    { type: isUnban ? 'unban' : 'ban', confirmText: isUnban ? 'Unban' : 'Ban' }
                );

                if (confirmed) {
                    try {
                        const nextStatus = isUnban ? 'unused' : 'banned';
                        await updateDoc(doc(db, "keys", id), {
                            status: nextStatus
                        });
                        alert(`Key ${isUnban ? 'unbanned' : 'banned'} successfully!`);
                        await loadKeys();
                        await loadStats();
                        await loadDashboardKeyLogs();
                    } catch (err) {
                        alert("Error: " + err.message);
                    }
                }
            }
        };
    }
}

// --- DYNAMIC PRICING CONFIGURATION ---
const price1day = document.getElementById('price-1day');
const price3day = document.getElementById('price-3day');
const price7day = document.getElementById('price-7day');
const price15day = document.getElementById('price-15day');
const price30day = document.getElementById('price-30day');
const savePricesBtn = document.getElementById('save-prices-btn');

async function loadPrices() {
    try {
        const docSnap = await getDoc(doc(db, "settings", "prices"));
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (price1day) price1day.value = data["1_day"] !== undefined ? data["1_day"] : 0.80;
            if (price3day) price3day.value = data["3_day"] !== undefined ? data["3_day"] : 3.00;
            if (price7day) price7day.value = data["7_day"] !== undefined ? data["7_day"] : 5.00;
            if (price15day) price15day.value = data["15_day"] !== undefined ? data["15_day"] : 8.00;
            if (price30day) price30day.value = data["30_day"] !== undefined ? data["30_day"] : 10.00;
        }
    } catch (e) {
        console.warn("Failed to load key prices:", e);
    }
}

if (savePricesBtn) {
    savePricesBtn.addEventListener('click', async () => {
        savePricesBtn.disabled = true;
        savePricesBtn.innerText = "Saving...";
        try {
            await setDoc(doc(db, "settings", "prices"), {
                "1_day": parseFloat(price1day.value) || 0.80,
                "3_day": parseFloat(price3day.value) || 3.00,
                "7_day": parseFloat(price7day.value) || 5.00,
                "15_day": parseFloat(price15day.value) || 8.00,
                "30_day": parseFloat(price30day.value) || 10.00
            }, { merge: true });
            alert("Prices saved successfully!");
        } catch (e) {
            alert("Error saving prices: " + e.message);
        } finally {
            savePricesBtn.disabled = false;
            savePricesBtn.innerText = "SAVE PRICES";
        }
    });
}

// --- GLOBAL SETTINGS (FORCE UPDATE) ---
const forceUpdateCheckbox = document.getElementById('force-update-checkbox');
const requiredVersionInput = document.getElementById('required-version-input');
const downloadUrlInput = document.getElementById('download-url-input');
const saveSettingsBtn = document.getElementById('save-settings-btn');

async function loadGlobalSettings() {
    try {
        const settingsDoc = await getDoc(doc(db, "settings", "global"));
        if (settingsDoc.exists()) {
            const data = settingsDoc.data();
            if (forceUpdateCheckbox) forceUpdateCheckbox.checked = data.force_update || false;
            if (requiredVersionInput) requiredVersionInput.value = data.required_version || 1;
            if (downloadUrlInput) downloadUrlInput.value = data.download_url || "";
        }
    } catch (e) {
        console.warn("Failed to load global app settings:", e);
    }
}

if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', async () => {
        saveSettingsBtn.disabled = true;
        saveSettingsBtn.innerText = "Saving...";
        try {
            await setDoc(doc(db, "settings", "global"), {
                force_update: forceUpdateCheckbox.checked,
                required_version: parseInt(requiredVersionInput.value) || 1,
                download_url: downloadUrlInput.value.trim()
            }, { merge: true });
            alert("Settings saved successfully!");
        } catch (e) {
            alert("Error saving settings: " + e.message);
        } finally {
            saveSettingsBtn.disabled = false;
            saveSettingsBtn.innerText = "SAVE APP SETTINGS";
        }
    });
}

// --- KEY GENERATION LOGIC ---
const generateBtn = document.getElementById('generate-keys-btn');
generateBtn.addEventListener('click', async () => {
    const duration = parseInt(document.getElementById('key-duration').value);
    const count = parseInt(document.getElementById('key-count').value);
    const isTrial = document.getElementById('is-trial-checkbox')?.checked || false;
    const isSuperAdmin = currentUserData.role === 'admin';

    generateBtn.disabled = true;
    generateBtn.innerText = "Generating...";

    try {
        // 1. Calculate cost and check balance if reseller
        if (!isSuperAdmin) {
            const pricesDoc = await getDoc(doc(db, "settings", "prices"));
            const prices = pricesDoc.exists() ? pricesDoc.data() : { "1_day": 0.80, "3_day": 3.00, "7_day": 5.00, "15_day": 8.00, "30_day": 10.00 };

            const durationKey = `${duration}_day`;
            const pricePerKey = parseFloat(prices[durationKey] || 0);
            const totalCost = pricePerKey * count;

            const resellerDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
            const currentBalance = resellerDoc.exists() ? (resellerDoc.data().balance || 0) : 0;

            if (currentBalance < totalCost) {
                alert(`Insufficient Balance!\nRequired: $${totalCost.toFixed(2)}\nAvailable: $${currentBalance.toFixed(2)}`);
                generateBtn.disabled = false;
                generateBtn.innerText = "Generate";
                return;
            }

            // Deduct balance
            await updateDoc(doc(db, "users", auth.currentUser.uid), {
                balance: increment(-totalCost)
            });
        }

        // 2. Generate documents
        let lastKey = "";
        for (let i = 0; i < count; i++) {
            const keyVal = generateKeyString();
            lastKey = keyVal;
            await addDoc(collection(db, "keys"), {
                key: keyVal,
                duration: duration,
                status: isTrial ? "active" : "unused",
                reseller_uid: auth.currentUser.uid,
                reseller_name: currentUserData.name,
                is_trial: isTrial,
                hwid: null,
                activated_at: isTrial ? serverTimestamp() : null,
                expiry_date: isTrial ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000) : null,
                created_at: serverTimestamp()
            });
        }

        await loadKeys();
        await loadStats();
        await loadDashboardKeyLogs();

        // Show result modal
        document.getElementById('result-duration').innerText = `${duration} Days Plan`;
        document.getElementById('generated-key-display').innerText = lastKey;
        document.getElementById('key-result-modal').classList.remove('hidden');

    } catch (error) {
        console.error("Generation failed:", error);
        alert("Error: " + error.message);
    } finally {
        generateBtn.disabled = false;
        generateBtn.innerText = "Generate";
    }
});

// Close Result Modal
document.getElementById('close-result-btn').addEventListener('click', () => {
    document.getElementById('key-result-modal').classList.add('hidden');
});

// --- TRIAL KEY GENERATION LOGIC (ADMIN ONLY) ---
const generateTrialsBtn = document.getElementById('generate-trials-btn');
if (generateTrialsBtn) {
    generateTrialsBtn.addEventListener('click', async () => {
        const durationVal = document.getElementById('trial-duration-select').value;
        const limitVal = document.getElementById('trial-device-limit').value;
        const count = parseInt(document.getElementById('trial-key-count').value) || 1;
        
        generateTrialsBtn.disabled = true;
        generateTrialsBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> GENERATING...';
        
        try {
            const amount = parseInt(durationVal);
            const unit = durationVal.slice(-1);
            
            let msToAdd = 0;
            let durationText = "";
            if (unit === 'h') {
                msToAdd = amount * 60 * 60 * 1000;
                durationText = `${amount} Hour${amount > 1 ? 's' : ''}`;
            } else if (unit === 'd') {
                msToAdd = amount * 24 * 60 * 60 * 1000;
                durationText = `${amount} Day${amount > 1 ? 's' : ''}`;
            }
            
            let lastKey = "";
            const generatedKeys = [];
            
            for (let i = 0; i < count; i++) {
                const keyVal = generateKeyString();
                lastKey = keyVal;
                generatedKeys.push(keyVal);
                
                await addDoc(collection(db, "keys"), {
                    key: keyVal,
                    duration: durationText,
                    device_limit: limitVal === 'unlimited' ? 'unlimited' : parseInt(limitVal),
                    status: "active",
                    reseller_uid: auth.currentUser.uid,
                    reseller_name: currentUserData.name,
                    is_trial: true,
                    hwid: null,
                    activated_at: serverTimestamp(),
                    expiry_date: new Date(Date.now() + msToAdd),
                    created_at: serverTimestamp(),
                    sec_data: "0x4f06288,0x4e9feb8,0x4dde3e0,0x4dfe838,0x2d911e0,0x3068c94,0x0294879d,0x02948795,0x029487a5"
                });
            }
            
            await loadKeys();
            await loadStats();
            await loadDashboardKeyLogs();
            
            // Show result modal
            document.getElementById('result-duration').innerText = `${durationText} Trial (${limitVal === 'unlimited' ? 'Unlimited' : limitVal + ' Device'} Limit)`;
            
            if (count > 1) {
                document.getElementById('generated-key-display').innerHTML = `<textarea readonly class="glass-input" style="width: 100%; height: 120px; font-family: monospace; font-size: 0.9rem; resize: none; margin-top: 10px; color: #ff7800; border-color: rgba(255, 120, 0, 0.3); background: rgba(0,0,0,0.4);">${generatedKeys.join('\n')}</textarea>`;
            } else {
                document.getElementById('generated-key-display').innerText = lastKey;
            }
            
            document.getElementById('key-result-modal').classList.remove('hidden');
            alert("Trial keys successfully generated!");
        } catch (error) {
            alert("Error generating trial keys: " + error.message);
        } finally {
            generateTrialsBtn.disabled = false;
            generateTrialsBtn.innerHTML = '<i class="fas fa-magic"></i> GENERATE TRIAL KEYS';
        }
    });
}

// Copy Result Key
document.getElementById('copy-key-btn').addEventListener('click', () => {
    const displayEl = document.getElementById('generated-key-display');
    const textarea = displayEl.querySelector('textarea');
    const key = textarea ? textarea.value : displayEl.innerText;
    navigator.clipboard.writeText(key);
    const icon = document.querySelector('#copy-key-btn i');
    icon.classList.replace('fa-copy', 'fa-check');
    setTimeout(() => icon.classList.replace('fa-check', 'fa-copy'), 2000);
});

function generateKeyString() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const segment = () => {
        let s = "";
        for (let i = 0; i < 5; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
        return s;
    };
    return `LIONX-${segment()}-${segment()}-${segment()}`;
}

// --- DATA LOADING & STATS ---
async function loadStats() {
    try {
        const coll = collection(db, "keys");
        const isReseller = currentUserData.role === 'reseller';

        let totalSnap;
        if (isReseller) {
            // Fetch keys belonging only to this reseller
            const q = query(coll, where("reseller_uid", "==", auth.currentUser.uid));
            totalSnap = await getDocs(q);
        } else {
            // Admin fetches all keys
            totalSnap = await getDocs(coll);
        }

        let activeCount = 0;
        let unusedCount = 0;
        let bannedCount = 0;

        totalSnap.forEach(docSnap => {
            const status = docSnap.data().status;
            if (status === "active") activeCount++;
            else if (status === "unused") unusedCount++;
            else if (status === "banned") bannedCount++;
        });

        document.getElementById('stat-total-keys').innerText = totalSnap.size;
        document.getElementById('stat-active-keys').innerText = activeCount;
        document.getElementById('stat-unused-keys').innerText = unusedCount;
        const bannedEl = document.getElementById('stat-banned-keys');
        if (bannedEl) bannedEl.innerText = bannedCount;
    } catch (e) {
        console.warn("Stats loading error:", e);
    }
}

let lastVisible = null;
let currentPage = 1;
const pageSize = 50;

async function loadKeys(direction = 'initial') {
    let q;
    const keysList = document.getElementById('keys-list');
    const baseColl = collection(db, "keys");
    const searchQuery = document.getElementById('search-key-input').value.trim();
    const isReseller = currentUserData.role === 'reseller';

    if (searchQuery) {
        // Search mode: ignores pagination
        if (isReseller) {
            q = query(baseColl, where("key", "==", searchQuery), where("reseller_uid", "==", auth.currentUser.uid));
        } else {
            q = query(baseColl, where("key", "==", searchQuery));
        }
    } else {
        // Normal Paginated mode
        if (isReseller) {
            if (direction === 'next' && lastVisible) {
                q = query(baseColl, where("reseller_uid", "==", auth.currentUser.uid), limit(pageSize), startAfter(lastVisible));
            } else {
                q = query(baseColl, where("reseller_uid", "==", auth.currentUser.uid), limit(pageSize));
                currentPage = 1;
            }
        } else {
            if (direction === 'next' && lastVisible) {
                q = query(baseColl, limit(pageSize), startAfter(lastVisible));
            } else {
                q = query(baseColl, limit(pageSize));
                currentPage = 1;
            }
        }
    }

    try {
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            keysList.innerHTML = "<tr><td colspan='6' style='text-align:center;'>No keys found.</td></tr>";
            return;
        }

        lastVisible = snapshot.docs[snapshot.docs.length - 1];

        keysList.innerHTML = "";
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const row = document.createElement('tr');

            // Format expiry date
            let expiryText = "Not Active";
            let isExpired = false;
            if (data.expiry_date) {
                const expiryDate = data.expiry_date.toDate ? data.expiry_date.toDate() : new Date(data.expiry_date.seconds * 1000 || data.expiry_date);
                expiryText = expiryDate.toLocaleDateString();
                isExpired = expiryDate < new Date();
            }

            let statusText = data.status;
            let statusClass = data.status;
            if (data.status === 'active' && isExpired) {
                statusText = 'expired';
                statusClass = 'expired';
            }

            const isBanned = data.status === 'banned';
            const banBtnHtml = `<button class="ban-btn small ${isBanned ? 'unban' : ''}" data-id="${docSnap.id}" title="${isBanned ? 'Unban Key' : 'Ban Key'}" style="margin-right: 8px; background: ${isBanned ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 120, 0, 0.1)'}; border: 1px solid ${isBanned ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 120, 0, 0.2)'}; color: ${isBanned ? 'var(--success-color)' : 'var(--primary-color)'}; padding: 8px 12px; border-radius: 8px; cursor: pointer; transition: 0.3s;"><i class="fas ${isBanned ? 'fa-key' : 'fa-ban'}"></i></button>`;

            let hwidText = data.hwid || 'N/A';
            if (data.is_trial || data.device_limit !== undefined) {
                let activeCount = 0;
                if (data.active_devices) {
                    activeCount = data.active_devices.split(',').filter(x => x.trim().length > 0).length;
                } else if (data.hwid) {
                    activeCount = 1;
                }
                const limitVal = data.device_limit !== undefined ? data.device_limit : 1;
                const limitText = (limitVal === 'unlimited' || limitVal === 999999) ? 'Unlimited' : limitVal;
                hwidText = `${activeCount} / ${limitText}`;
            }

            const durationDisplay = typeof data.duration === 'string' ? data.duration : data.duration + ' Days';
            const durationPill = `<span class="duration-pill"><i class="fas fa-hourglass-half" style="font-size: 0.75rem;"></i> ${durationDisplay}</span>`;

            let hwidPill = `<span class="device-pill"><i class="fas fa-mobile-screen-button" style="font-size: 0.75rem;"></i> ${hwidText}</span>`;
            if (hwidText === 'N/A') {
                hwidPill = `<span class="device-pill" style="background: rgba(146,146,158,0.08); color: var(--text-dim); border-color: rgba(146,146,158,0.15); text-shadow:none;"><i class="fas fa-mobile-screen-button" style="font-size: 0.75rem;"></i> N/A</span>`;
            }

            let expiryPill = `<span class="expiry-pill"><i class="fas fa-calendar-alt" style="font-size: 0.75rem;"></i> ${expiryText}</span>`;
            if (expiryText === 'Not Active') {
                expiryPill = `<span class="expiry-pill not-active"><i class="fas fa-calendar-xmark" style="font-size: 0.75rem;"></i> Not Active</span>`;
            }

            row.innerHTML = `
                <td>${formatKeyCell(data.key, true)}</td>
                <td>${durationPill}</td>
                <td><span class="status-pill ${statusClass}">${statusText}</span></td>
                <td>${hwidPill}</td>
                <td>${expiryPill}</td>
                <td>
                    ${banBtnHtml}
                    <button class="delete-btn small delete-key-btn" data-id="${docSnap.id}"><i class="fas fa-trash"></i></button>
                </td>
            `;
            keysList.appendChild(row);
        });

        document.getElementById('page-number').innerText = `Page ${currentPage}`;
        document.getElementById('prev-page-btn').disabled = (currentPage === 1);
    } catch (e) {
        console.error("Load Keys Error:", e);
    }
}

// Search and Pagination Events
document.getElementById('search-btn').addEventListener('click', () => loadKeys());
document.getElementById('next-page-btn').addEventListener('click', () => {
    currentPage++;
    loadKeys('next');
});
document.getElementById('prev-page-btn').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        loadKeys('prev');
    }
});

// Delete Keys handler
async function handleDeleteKey(id) {
    const confirmed = await customConfirm(
        "Delete License Key",
        "Are you sure you want to delete this license key?",
        { type: 'danger', confirmText: 'Delete' }
    );
    if (!confirmed) return;
    try {
        await deleteDoc(doc(db, "keys", id));
        await loadKeys();
        await loadStats();
        await loadDashboardKeyLogs();
    } catch (e) {
        alert("Error: " + e.message);
    }
}

// --- RESELLER MANAGEMENT ---
async function loadResellers() {
    const q = query(collection(db, "users"), where("role", "==", "reseller"));
    const resellerList = document.getElementById('reseller-list');

    onSnapshot(q, (snapshot) => {
        resellerList.innerHTML = "";
        let totalResellerBalance = 0;

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const isBanned = data.status === 'banned';
            totalResellerBalance += (data.balance || 0);

            const banResellerBtnHtml = `
                <button class="secondary-btn small ban-reseller-btn" data-id="${docSnap.id}" data-banned="${isBanned}" style="margin-right: 8px; background: ${isBanned ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 68, 68, 0.1)'}; border-color: ${isBanned ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 68, 68, 0.2)'}; color: ${isBanned ? 'var(--success-color)' : 'var(--danger-color)'};">
                    <i class="fas ${isBanned ? 'fa-user-check' : 'fa-user-slash'}"></i> ${isBanned ? 'Unban' : 'Ban'}
                </button>
            `;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${data.name} ${isBanned ? '<span class="status-pill dismissed" style="margin-left: 8px; padding: 2px 8px; font-size: 0.7rem;">Banned</span>' : ''}</td>
                <td>${data.email}</td>
                <td style="color: var(--success-color); font-weight: 700;">$${(data.balance || 0).toFixed(2)}</td>
                <td><span id="count-${docSnap.id}">...</span></td>
                <td>
                    <button class="secondary-btn small add-balance-btn" data-id="${docSnap.id}" data-name="${data.name}" style="margin-right: 8px;"><i class="fas fa-wallet"></i> Balance</button>
                    ${banResellerBtnHtml}
                    <button class="delete-btn small delete-reseller-btn" data-id="${docSnap.id}"><i class="fas fa-trash"></i></button>
                </td>
            `;
            resellerList.appendChild(row);
            updateResellerKeyCount(docSnap.id);
        });

        // Set dynamic Admin dashboard card total reseller balance
        const statResellerBalance = document.getElementById('stat-current-resellers-balance');
        if (statResellerBalance) {
            statResellerBalance.innerText = `$${totalResellerBalance.toFixed(2)}`;
        }
    });
}

async function updateResellerKeyCount(uid) {
    const q = query(collection(db, "keys"), where("reseller_uid", "==", uid));
    const snap = await getDocs(q);
    const el = document.getElementById(`count-${uid}`);
    if (el) el.innerText = snap.size;
}

// Global reseller delete
window.deleteReseller = async (id) => {
    const confirmed = await customConfirm(
        "Delete Reseller Account",
        "Are you sure you want to delete this reseller? All associated data will be removed.",
        { type: 'danger', confirmText: 'Delete' }
    );
    if (!confirmed) return;
    try {
        await deleteDoc(doc(db, "users", id));
        alert("Reseller deleted successfully!");
    } catch (e) {
        alert("Error: " + e.message);
    }
};

// --- ADD RESELLER MODAL ---
const modalOverlay = document.getElementById('modal-overlay');
const addResellerBtn = document.getElementById('add-reseller-btn');
const modalCancel = document.getElementById('modal-cancel');
const modalConfirm = document.getElementById('modal-confirm');
const closeResellerModalX = document.getElementById('close-reseller-modal-x');

if (addResellerBtn) {
    addResellerBtn.addEventListener('click', () => {
        modalOverlay.classList.remove('hidden');
    });
}

const closeResellerModal = () => {
    modalOverlay.classList.add('hidden');
    document.getElementById('new-reseller-name').value = "";
    document.getElementById('new-reseller-email').value = "";
    document.getElementById('new-reseller-password').value = "";
    document.getElementById('new-reseller-confirm-password').value = "";
};

if (modalCancel) modalCancel.addEventListener('click', closeResellerModal);
if (closeResellerModalX) closeResellerModalX.addEventListener('click', closeResellerModal);

if (modalConfirm) {
    modalConfirm.addEventListener('click', async () => {
        const name = document.getElementById('new-reseller-name').value.trim();
        const email = document.getElementById('new-reseller-email').value.trim();
        const pass = document.getElementById('new-reseller-password').value.trim();
        const confirmPass = document.getElementById('new-reseller-confirm-password').value.trim();

        if (!name || !email || !pass || !confirmPass) {
            alert("Please fill all fields.");
            return;
        }

        if (pass !== confirmPass) {
            alert("Passwords do not match!");
            return;
        }

        modalConfirm.disabled = true;
        modalConfirm.innerText = "Creating...";

        try {
            // 1. Initialize/Retrieve secondary app and auth to register reseller without logging out admin
            let secondaryApp;
            try {
                secondaryApp = getApp("SecondaryApp");
            } catch (err) {
                secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
            }
            const secondaryAuth = getAuth(secondaryApp);
            
            // 2. Create actual Firebase Authentication account
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, pass);
            const resellerUid = userCredential.user.uid;

            // 3. Create reseller user document in Firestore with their actual UID
            await setDoc(doc(db, "users", resellerUid), {
                name: name,
                email: email,
                role: "reseller",
                balance: 0,
                status: "active",
                created_at: serverTimestamp()
            });

            // 4. Clean up the secondary auth instance session
            await signOut(secondaryAuth);

            alert("Reseller account successfully created!");
            closeResellerModal();
        } catch (e) {
            alert("Error: " + e.message);
        } finally {
            modalConfirm.disabled = false;
            modalConfirm.innerText = "Confirm";
        }
    });
}

// --- ADD BALANCE MODAL ---
let activeResellerUid = null;
const balanceModalOverlay = document.getElementById('balance-modal-overlay');
const balanceResellerNameSpan = document.getElementById('balance-reseller-name');
const balanceAmountInput = document.getElementById('balance-amount-input');
const balanceModalConfirm = document.getElementById('balance-modal-confirm');
const balanceModalCancel = document.getElementById('balance-modal-cancel');
const closeBalanceModalX = document.getElementById('close-balance-modal-x');

const closeBalanceModal = () => {
    balanceModalOverlay.classList.add('hidden');
    balanceAmountInput.value = "";
};

if (balanceModalCancel) balanceModalCancel.addEventListener('click', closeBalanceModal);
if (closeBalanceModalX) closeBalanceModalX.addEventListener('click', closeBalanceModal);

// Delegate reseller table clicks
const resellerList = document.getElementById('reseller-list');
if (resellerList) {
    resellerList.addEventListener('click', async (e) => {
        const addBalanceBtn = e.target.closest('.add-balance-btn');
        if (addBalanceBtn) {
            activeResellerUid = addBalanceBtn.getAttribute('data-id');
            const resellerName = addBalanceBtn.getAttribute('data-name');
            balanceResellerNameSpan.innerText = resellerName;
            balanceModalOverlay.classList.remove('hidden');
            return;
        }

        const banResellerBtn = e.target.closest('.ban-reseller-btn');
        if (banResellerBtn) {
            const resellerId = banResellerBtn.getAttribute('data-id');
            const isBanned = banResellerBtn.getAttribute('data-banned') === 'true';

            const confirmed = await customConfirm(
                isBanned ? "Unban Reseller" : "Ban Reseller",
                `Are you sure you want to ${isBanned ? 'unban' : 'ban'} this reseller account?`,
                { type: isBanned ? 'unban' : 'ban', confirmText: isBanned ? 'Unban' : 'Ban' }
            );

            if (confirmed) {
                try {
                    await updateDoc(doc(db, "users", resellerId), {
                        status: isBanned ? 'active' : 'banned'
                    });
                    alert(`Reseller account ${isBanned ? 'unbanned' : 'banned'} successfully.`);
                } catch (err) {
                    alert("Error: " + err.message);
                }
            }
            return;
        }

        const deleteBtn = e.target.closest('.delete-reseller-btn');
        if (deleteBtn) {
            const id = deleteBtn.getAttribute('data-id');
            window.deleteReseller(id);
        }
    });
}

if (balanceModalConfirm) {
    balanceModalConfirm.addEventListener('click', async () => {
        const amount = parseFloat(balanceAmountInput.value);
        if (isNaN(amount) || amount <= 0) {
            alert("Please enter a valid credit amount.");
            return;
        }

        balanceModalConfirm.disabled = true;
        balanceModalConfirm.innerText = "Adding...";

        try {
            await updateDoc(doc(db, "users", activeResellerUid), {
                balance: increment(amount)
            });
            await setDoc(doc(db, "settings", "stats"), {
                total_revenue: increment(amount)
            }, { merge: true });

            alert(`Successfully added $${amount.toFixed(2)} to reseller's balance.`);
            closeBalanceModal();
        } catch (e) {
            alert("Error updating reseller balance: " + e.message);
        } finally {
            balanceModalConfirm.disabled = false;
            balanceModalConfirm.innerText = "Add Balance";
        }
    });
}

// --- EXTEND KEYS TIME ---
const extendKeysBtn = document.getElementById('extend-keys-btn');
const extendDurationSelect = document.getElementById('extend-duration-select');
const extendStatus = document.getElementById('extend-status');

if (extendKeysBtn) {
    extendKeysBtn.addEventListener('click', async () => {
        const durationVal = extendDurationSelect.value;
        const value = parseInt(durationVal);
        const unit = durationVal.slice(-1); // 'h' or 'd'

        let addMs = 0;
        if (unit === 'h') {
            addMs = value * 60 * 60 * 1000;
        } else if (unit === 'd') {
            addMs = value * 24 * 60 * 60 * 1000;
        } else {
            alert("Invalid duration format.");
            return;
        }

        if (isNaN(value) || addMs <= 0) {
            alert("Invalid duration selected.");
            return;
        }

        const confirmed = await customConfirm(
            "Extend Licenses",
            `Are you sure you want to add ${value} ${unit === 'h' ? 'Hours' : 'Days'} to ALL active license keys?`,
            { type: 'warning', confirmText: 'Extend' }
        );
        if (!confirmed) return;

        extendKeysBtn.disabled = true;
        extendKeysBtn.innerText = "Extending...";
        extendStatus.classList.add('hidden');

        try {
            const coll = collection(db, "keys");
            const q = query(coll, where("status", "==", "active"));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                alert("No active keys found to extend.");
                extendKeysBtn.disabled = false;
                extendKeysBtn.innerText = "EXTEND ACTIVE KEYS";
                return;
            }

            let count = 0;
            for (const docSnap of snapshot.docs) {
                const data = docSnap.data();
                if (data.expiry_date) {
                    const currentExpiry = data.expiry_date.toDate ? data.expiry_date.toDate() : new Date(data.expiry_date.seconds * 1000 || data.expiry_date);
                    const newExpiry = new Date(currentExpiry.getTime() + addMs);

                    await updateDoc(doc(db, "keys", docSnap.id), {
                        expiry_date: newExpiry
                    });
                    count++;
                }
            }

            extendStatus.innerText = `Successfully extended time for ${count} active key(s) by ${value} ${unit === 'h' ? 'hour(s)' : 'day(s)'}!`;
            extendStatus.classList.remove('hidden');

            await loadKeys();
            await loadStats();
            await loadDashboardKeyLogs();

        } catch (e) {
            console.error(e);
            alert("Error: " + e.message);
        } finally {
            extendKeysBtn.disabled = false;
            extendKeysBtn.innerText = "EXTEND ACTIVE KEYS";
        }
    });
}

// --- LICENSE KEY UTILITIES ---
function getMaskedKey(key) {
    if (!key) return "";
    const parts = key.split('-');
    if (parts.length >= 3) {
        return `${parts[0]}-${parts[1]}-••••-••••-••••`;
    }
    return key.substring(0, 9) + "••••••••";
}

function formatKeyCell(key, isGreen = false) {
    const masked = getMaskedKey(key);
    const cellClass = isGreen ? 'key-cell-green' : 'key-cell';
    return `
        <div class="key-display-wrapper">
            <span class="${cellClass}" data-full-key="${key}" data-masked-key="${masked}" data-visible="false">${masked}</span>
            <button class="key-action-icon-btn toggle-visibility-btn" title="Toggle Visibility"><i class="fas fa-eye"></i></button>
            <button class="key-action-icon-btn copy-btn-cell" data-key="${key}" title="Copy Key"><i class="fas fa-copy"></i></button>
        </div>
    `;
}

// --- DASHBOARD RECENT KEY LOGS ---
async function loadDashboardKeyLogs() {
    const dashboardKeyLogs = document.getElementById('dashboard-key-logs');
    if (!dashboardKeyLogs) return;

    try {
        const coll = collection(db, "keys");
        const isReseller = currentUserData.role === 'reseller';

        let q;
        if (isReseller) {
            q = query(coll, where("reseller_uid", "==", auth.currentUser.uid));
        } else {
            q = query(coll);
        }

        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            dashboardKeyLogs.innerHTML = "<tr><td colspan='5' style='text-align:center;'>No recent key logs found.</td></tr>";
            return;
        }

        const keys = [];
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            keys.push({ id: docSnap.id, ...data });
        });

        // In-memory sort by created_at desc to avoid composite index requirements
        keys.sort((a, b) => {
            const timeA = a.created_at?.seconds || (a.created_at ? new Date(a.created_at).getTime() : 0);
            const timeB = b.created_at?.seconds || (b.created_at ? new Date(b.created_at).getTime() : 0);
            return timeB - timeA;
        });

        const recentKeys = keys;

        dashboardKeyLogs.innerHTML = "";
        recentKeys.forEach(data => {
            const row = document.createElement('tr');

            let expiryText = "Not Active";
            let isExpired = false;
            if (data.expiry_date) {
                const expiryDate = data.expiry_date.toDate ? data.expiry_date.toDate() : new Date(data.expiry_date.seconds * 1000 || data.expiry_date);
                expiryText = expiryDate.toLocaleDateString();
                isExpired = expiryDate < new Date();
            }

            let statusText = data.status;
            let statusClass = data.status;
            if (data.status === 'active' && isExpired) {
                statusText = 'expired';
                statusClass = 'expired';
            }

            let hwidText = data.hwid || 'N/A';
            if (data.is_trial || data.device_limit !== undefined) {
                let activeCount = 0;
                if (data.active_devices) {
                    activeCount = data.active_devices.split(',').filter(x => x.trim().length > 0).length;
                } else if (data.hwid) {
                    activeCount = 1;
                }
                const limitVal = data.device_limit !== undefined ? data.device_limit : 1;
                const limitText = (limitVal === 'unlimited' || limitVal === 999999) ? 'Unlimited' : limitVal;
                hwidText = `${activeCount} / ${limitText}`;
            }

            const durationDisplay = typeof data.duration === 'string' ? data.duration : data.duration + ' Days';
            const durationPill = `<span class="duration-pill"><i class="fas fa-hourglass-half" style="font-size: 0.75rem;"></i> ${durationDisplay}</span>`;

            let hwidPill = `<span class="device-pill"><i class="fas fa-mobile-screen-button" style="font-size: 0.75rem;"></i> ${hwidText}</span>`;
            if (hwidText === 'N/A') {
                hwidPill = `<span class="device-pill" style="background: rgba(146,146,158,0.08); color: var(--text-dim); border-color: rgba(146,146,158,0.15); text-shadow:none;"><i class="fas fa-mobile-screen-button" style="font-size: 0.75rem;"></i> N/A</span>`;
            }

            let expiryPill = `<span class="expiry-pill"><i class="fas fa-calendar-alt" style="font-size: 0.75rem;"></i> ${expiryText}</span>`;
            if (expiryText === 'Not Active') {
                expiryPill = `<span class="expiry-pill not-active"><i class="fas fa-calendar-xmark" style="font-size: 0.75rem;"></i> Not Active</span>`;
            }

            row.innerHTML = `
                <td>${formatKeyCell(data.key, true)}</td>
                <td>${durationPill}</td>
                <td><span class="status-pill ${statusClass}">${statusText}</span></td>
                <td>${hwidPill}</td>
                <td>${expiryPill}</td>
            `;
            dashboardKeyLogs.appendChild(row);
        });
    } catch (e) {
        console.error("Load Dashboard Key Logs Error:", e);
    }
}

// --- GLOBAL KEY VISIBILITY & COPY DELEGATION ---
document.body.addEventListener('click', (e) => {
    // Toggle Key Visibility
    const toggleBtn = e.target.closest('.toggle-visibility-btn');
    if (toggleBtn) {
        const wrapper = toggleBtn.closest('.key-display-wrapper');
        const keySpan = wrapper.querySelector('.key-cell, .key-cell-green');
        const icon = toggleBtn.querySelector('i');
        const isVisible = keySpan.getAttribute('data-visible') === 'true';

        if (isVisible) {
            keySpan.innerText = keySpan.getAttribute('data-masked-key');
            keySpan.setAttribute('data-visible', 'false');
            icon.classList.replace('fa-eye-slash', 'fa-eye');
        } else {
            keySpan.innerText = keySpan.getAttribute('data-full-key');
            keySpan.setAttribute('data-visible', 'true');
            icon.classList.replace('fa-eye', 'fa-eye-slash');
        }
        return;
    }

    // Copy Key Cell
    const copyBtn = e.target.closest('.copy-btn-cell');
    if (copyBtn) {
        const key = copyBtn.getAttribute('data-key');
        navigator.clipboard.writeText(key).then(() => {
            const icon = copyBtn.querySelector('i');
            icon.classList.replace('fa-copy', 'fa-check');
            icon.style.color = 'var(--success-color)';
            setTimeout(() => {
                icon.classList.replace('fa-check', 'fa-copy');
                icon.style.color = '';
            }, 1500);
        });
        return;
    }
});

// --- REUSABLE GLASSMORPHIC CONFIRMATION MODAL ---
function customConfirm(title, message, options = {}) {
    return new Promise((resolve) => {
        const overlay = document.getElementById('confirm-modal-overlay');
        const iconEl = document.getElementById('confirm-modal-icon');
        const titleEl = document.getElementById('confirm-modal-title');
        const messageEl = document.getElementById('confirm-modal-message');
        const cancelBtn = document.getElementById('confirm-modal-cancel');
        const confirmBtn = document.getElementById('confirm-modal-btn');

        if (!overlay || !titleEl || !messageEl || !cancelBtn || !confirmBtn) {
            resolve(confirm(message));
            return;
        }

        titleEl.innerText = title;
        messageEl.innerText = message;

        const type = options.type || 'warning';
        if (type === 'danger') {
            iconEl.className = "fas fa-trash-can";
            iconEl.style.color = "var(--danger-color)";
            iconEl.style.textShadow = "0 0 20px var(--danger-glow)";
            confirmBtn.style.background = "linear-gradient(135deg, var(--danger-color) 0%, #d42020 100%)";
            confirmBtn.innerText = options.confirmText || "Delete";
        } else if (type === 'ban') {
            iconEl.className = "fas fa-ban";
            iconEl.style.color = "var(--primary-color)";
            iconEl.style.textShadow = "0 0 20px var(--primary-glow)";
            confirmBtn.style.background = "linear-gradient(135deg, var(--primary-color) 0%, #d45d00 100%)";
            confirmBtn.innerText = options.confirmText || "Ban";
        } else if (type === 'unban') {
            iconEl.className = "fas fa-key";
            iconEl.style.color = "var(--success-color)";
            iconEl.style.textShadow = "0 0 20px var(--success-glow)";
            confirmBtn.style.background = "linear-gradient(135deg, var(--success-color) 0%, #00b35f 100%)";
            confirmBtn.innerText = options.confirmText || "Unban";
        } else {
            iconEl.className = "fas fa-triangle-exclamation";
            iconEl.style.color = "var(--primary-color)";
            iconEl.style.textShadow = "0 0 20px var(--primary-glow)";
            confirmBtn.style.background = "linear-gradient(135deg, var(--primary-color) 0%, #d45d00 100%)";
            confirmBtn.innerText = options.confirmText || "Confirm";
        }

        overlay.classList.remove('hidden');

        const cleanup = (result) => {
            overlay.classList.add('hidden');
            cancelBtn.onclick = null;
            confirmBtn.onclick = null;
            resolve(result);
        };

        cancelBtn.onclick = () => cleanup(false);
        confirmBtn.onclick = () => cleanup(true);
    });
}

// --- CUSTOM GLASSMORPHIC DROPDOWNS INITIALIZATION ---
function initCustomDropdowns() {
    const dropdowns = document.querySelectorAll('.custom-dropdown');

    dropdowns.forEach(dropdown => {
        const trigger = dropdown.querySelector('.custom-dropdown-trigger');
        const menu = dropdown.querySelector('.custom-dropdown-menu');
        const label = dropdown.querySelector('.trigger-label');
        const hiddenInput = dropdown.querySelector('input[type="hidden"]');
        const items = dropdown.querySelectorAll('.custom-dropdown-item');

        if (!trigger || !menu || !label || !hiddenInput) return;

        // Toggle dropdown open state
        trigger.onclick = (e) => {
            e.stopPropagation();
            // Close all other dropdowns
            document.querySelectorAll('.custom-dropdown').forEach(d => {
                if (d !== dropdown) d.classList.remove('open');
                const m = d.querySelector('.custom-dropdown-menu');
                if (m && d !== dropdown) m.classList.add('hidden');
            });

            dropdown.classList.toggle('open');
            menu.classList.toggle('hidden');
        };

        // Handle item selection
        items.forEach(item => {
            item.onclick = (e) => {
                e.stopPropagation();
                const val = item.getAttribute('data-value');
                const text = item.innerText;

                // Update active state
                items.forEach(i => i.classList.remove('active'));
                item.classList.add('active');

                // Update trigger label and hidden input value
                label.innerText = text;
                hiddenInput.value = val;

                // Dispatch change event to the hidden input so other listeners trigger
                hiddenInput.dispatchEvent(new Event('change'));

                // Close menu
                dropdown.classList.remove('open');
                menu.classList.add('hidden');
            };
        });
    });

    // Close all dropdowns when clicking outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-dropdown').forEach(d => {
            d.classList.remove('open');
            const m = d.querySelector('.custom-dropdown-menu');
            if (m) m.classList.add('hidden');
        });
    });
}

// Initialize custom dropdowns on load
initCustomDropdowns();

// --- SETTINGS: LIGHT MODE & PASSWORD UPDATE ---
function initSettingsPage() {
    const lightModeCheckbox = document.getElementById('light-mode-checkbox');
    const changePasswordBtn = document.getElementById('change-password-btn');
    const oldPasswordInput = document.getElementById('settings-old-password');
    const newPasswordInput = document.getElementById('settings-new-password');
    const confirmPasswordInput = document.getElementById('settings-confirm-password');
    const passwordStatus = document.getElementById('settings-password-status');

    // Theme Mode Initialization
    if (localStorage.getItem('theme') === 'light') {
        document.body.classList.add('light-mode');
        if (lightModeCheckbox) lightModeCheckbox.checked = true;
    }

    if (lightModeCheckbox) {
        lightModeCheckbox.addEventListener('change', () => {
            if (lightModeCheckbox.checked) {
                document.body.classList.add('light-mode');
                localStorage.setItem('theme', 'light');
            } else {
                document.body.classList.remove('light-mode');
                localStorage.setItem('theme', 'dark');
            }
        });
    }

    // Change Password Execution
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', async () => {
            const oldPass = oldPasswordInput.value.trim();
            const newPass = newPasswordInput.value.trim();
            const confirmPass = confirmPasswordInput.value.trim();

            if (!oldPass || !newPass || !confirmPass) {
                showPasswordStatus("Please fill in all fields.", "error");
                return;
            }

            if (newPass.length < 6) {
                showPasswordStatus("New password must be at least 6 characters.", "error");
                return;
            }

            if (newPass !== confirmPass) {
                showPasswordStatus("New passwords do not match!", "error");
                return;
            }

            changePasswordBtn.disabled = true;
            changePasswordBtn.innerText = "UPDATING...";
            showPasswordStatus("Updating password, please wait...", "info");

            try {
                const user = auth.currentUser;
                if (!user) {
                    throw new Error("No user is currently signed in.");
                }

                // Re-authenticate first to prevent requires-recent-login errors
                const credential = EmailAuthProvider.credential(user.email, oldPass);
                await reauthenticateWithCredential(user, credential);

                // Update password in Firebase Auth
                await updatePassword(user, newPass);

                showPasswordStatus("Password updated successfully!", "success");

                // Clear fields
                oldPasswordInput.value = "";
                newPasswordInput.value = "";
                confirmPasswordInput.value = "";
            } catch (error) {
                console.error("Password update error:", error);
                let errMsg = error.message;
                if (error.code === 'auth/wrong-password') {
                    errMsg = "Invalid current password!";
                } else if (error.code === 'auth/weak-password') {
                    errMsg = "Password is too weak.";
                }
                showPasswordStatus("Error: " + errMsg, "error");
            } finally {
                changePasswordBtn.disabled = false;
                changePasswordBtn.innerText = "UPDATE PASSWORD";
            }
        });
    }

    // --- DANGER ZONE ACTIONS (ADMIN ONLY) ---
    const deleteKeysBtn = document.getElementById('danger-delete-keys-btn');
    const resetBalanceBtn = document.getElementById('danger-reset-balance-btn');
    const forceCleanBtn = document.getElementById('danger-force-clean-btn');

    if (deleteKeysBtn) {
        deleteKeysBtn.addEventListener('click', async () => {
            const confirmed = await customConfirm(
                "Wipe All License Keys",
                "WARNING: This will permanently delete all license keys from the database. This action is irreversible.",
                { type: 'danger', confirmText: 'Wipe Keys' }
            );
            if (!confirmed) return;

            deleteKeysBtn.disabled = true;
            deleteKeysBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> WIPING KEYS...';

            try {
                const keysSnap = await getDocs(collection(db, "keys"));
                const batchPromises = [];
                keysSnap.forEach(docSnap => {
                    batchPromises.push(deleteDoc(doc(db, "keys", docSnap.id)));
                });
                await Promise.all(batchPromises);

                alert("All license keys successfully deleted.");
                await loadKeys();
                await loadStats();
                await loadDashboardKeyLogs();
            } catch (error) {
                alert("Error deleting keys: " + error.message);
            } finally {
                deleteKeysBtn.disabled = false;
                deleteKeysBtn.innerHTML = '<i class="fas fa-trash-can"></i> DELETE ALL KEYS<span class="btn-subtext">Wipes all generated license keys</span>';
            }
        });
    }

    if (resetBalanceBtn) {
        resetBalanceBtn.addEventListener('click', async () => {
            const confirmed = await customConfirm(
                "Reset Reseller Balances",
                "WARNING: This will set the balance of ALL resellers to $0.00. This action is irreversible.",
                { type: 'danger', confirmText: 'Reset Balances' }
            );
            if (!confirmed) return;

            resetBalanceBtn.disabled = true;
            resetBalanceBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> RESETTING...';

            try {
                const resellersSnap = await getDocs(query(collection(db, "users"), where("role", "==", "reseller")));
                const batchPromises = [];
                resellersSnap.forEach(docSnap => {
                    batchPromises.push(updateDoc(doc(db, "users", docSnap.id), {
                        balance: 0
                    }));
                });
                await Promise.all(batchPromises);

                alert("All reseller balances reset to $0.00 successfully.");
                if (currentUserData && currentUserData.role === 'admin') {
                    await loadResellers();
                }
            } catch (error) {
                alert("Error resetting balances: " + error.message);
            } finally {
                resetBalanceBtn.disabled = false;
                resetBalanceBtn.innerHTML = '<i class="fas fa-wallet"></i> RESET ALL BALANCES<span class="btn-subtext">Resets all reseller balances to zero</span>';
            }
        });
    }

    if (forceCleanBtn) {
        forceCleanBtn.addEventListener('click', async () => {
            const confirmed = await customConfirm(
                "FORCE CLEAN ALL PANEL DATA",
                "CRITICAL WARNING: This will delete ALL license keys, reset ALL reseller balances to $0.00, and reset total revenue to $0.00. This will completely wipe the panel data. Proceed?",
                { type: 'danger', confirmText: 'FORCE CLEAN' }
            );
            if (!confirmed) return;

            forceCleanBtn.disabled = true;
            forceCleanBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> CLEANING PANEL...';

            try {
                // 1. Wipe all keys
                const keysSnap = await getDocs(collection(db, "keys"));
                const wipeKeysPromises = [];
                keysSnap.forEach(docSnap => {
                    wipeKeysPromises.push(deleteDoc(doc(db, "keys", docSnap.id)));
                });
                await Promise.all(wipeKeysPromises);

                // 2. Reset all reseller balances
                const resellersSnap = await getDocs(query(collection(db, "users"), where("role", "==", "reseller")));
                const resetBalancePromises = [];
                resellersSnap.forEach(docSnap => {
                    resetBalancePromises.push(updateDoc(doc(db, "users", docSnap.id), {
                        balance: 0
                    }));
                });
                await Promise.all(resetBalancePromises);

                // 3. Reset total revenue stats
                await setDoc(doc(db, "settings", "stats"), {
                    total_revenue: 0
                }, { merge: true });

                alert("Force clean completed. All keys deleted, balances reset, and stats cleared.");

                // Refresh everything
                await loadKeys();
                await loadStats();
                await loadDashboardKeyLogs();
                if (currentUserData && currentUserData.role === 'admin') {
                    await loadResellers();
                }
            } catch (error) {
                alert("Error running force clean: " + error.message);
            } finally {
                forceCleanBtn.disabled = false;
                forceCleanBtn.innerHTML = '<i class="fas fa-radiation"></i> FORCE CLEAN ALL DATA<span class="btn-subtext">Wipes keys, logs, balances, full system reset</span>';
            }
        });
    }

    function showPasswordStatus(message, type) {
        if (!passwordStatus) return;
        passwordStatus.innerText = message;
        passwordStatus.classList.remove('hidden');

        if (type === 'error') {
            passwordStatus.style.color = 'var(--danger-color)';
            passwordStatus.style.textShadow = '0 0 10px var(--danger-glow)';
        } else if (type === 'success') {
            passwordStatus.style.color = 'var(--success-color)';
            passwordStatus.style.textShadow = '0 0 10px var(--success-glow)';
            setTimeout(() => passwordStatus.classList.add('hidden'), 5000);
        } else {
            passwordStatus.style.color = 'var(--blue-color)';
            passwordStatus.style.textShadow = '0 0 10px var(--blue-glow)';
        }
    }
}

// Call settings page initializer
initSettingsPage();
