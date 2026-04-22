// Settings
import { auth, db } from "./firebaseInitialization.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { query, addDoc, serverTimestamp, deleteDoc, collection, arrayUnion, where, getDocs, doc, getDoc, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// LOAD USERNAME 
onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
        const data = snap.data();
        const usernameVal = "@" + (data.username || "user");

        // Update Header
        const headerUsername = document.getElementById("headerUsername");
        if (headerUsername) headerUsername.textContent = usernameVal;

        // Update Sidebar (top left)
        const sidebarUsername = document.getElementById("username");
        if (sidebarUsername) sidebarUsername.textContent = usernameVal;
    }
});

// SUPPORT & REPORTING LOGIC
async function submitReport() {
    const user = auth.currentUser;
    if (!user) return;

    const title = document.getElementById('reportTitle').value.trim();
    const description = document.getElementById('reportDesc').value.trim();
    const targetURL = document.getElementById('reportURL').value.trim();

    if (!title || !description) {
        return alert("Please provide at least a title and description.");
    }

    try {
        // Add to a new 'reports' collection
        await addDoc(collection(db, "reports"), {
            reporterUid: user.uid,
            reporterName: user.displayName || "Anonymous",
            title: title,
            description: description,
            targetURL: targetURL,
            status: "pending",
            timestamp: serverTimestamp()
        });

        alert("Report submitted successfully. Our team will review it.");
        expandSupport(); // Refresh UI to clear inputs
    } catch (e) {
        console.error("Report failed:", e);
        alert("Error submitting report.");
    }
}

// Load reports from Firestore
async function loadUserReports() {
    const user = auth.currentUser;
    const listDiv = document.getElementById('userReportsList');
    if (!user || !listDiv) return;

    try {
const q = query(collection(db, "reports"), where("reporterUid", "==", user.uid));
const querySnapshot = await getDocs(q);

let html = "<p><strong>Your Recent Reports:</strong></p>";

if (querySnapshot.empty) {
    html += "<p class='smallTxt'>You haven't submitted any reports yet.</p>";
} else {
    querySnapshot.forEach((docSnap) => {
        const report = docSnap.data();
        const reportId = docSnap.id;
        html += `
            <div class='reportItem' id='report-${reportId}' style='border-bottom: 1px solid #333; margin-bottom: 10px; padding-bottom: 10px;'>
                <p class='reportItemTitle'><strong>Title:</strong> ${report.title}</p>
                <p class='smallTxt'><strong>Description:</strong> ${report.description}</p>
                <button class='delBtn' onclick="deleteReport('${reportId}')">Delete Report</button>
            </div>`;
    });
}
listDiv.innerHTML = html;
    } catch (e) {
        console.error("Error loading reports:", e);
    }
}

// Delete a specific report
async function deleteReport(reportId) {
    if (!confirm("Are you sure you want to delete this report?")) return;

    try {
        await deleteDoc(doc(db, "reports", reportId));
        alert("Report deleted.");
        loadUserReports(); // Refresh the list
    } catch (e) {
        console.error("Delete failed:", e);
        alert("Failed to delete report.");
    }
}

window.deleteReport = deleteReport;

// STATE VARIABLES 
let accOpen = false;
let themeOpen = false;
let aboutOpen = false;
let supportOpen = false;
let privacyOpen = false;

// ACCOUNT OPTIONS
function expandAcc() {
    const accOpt = document.getElementById('accOption');

    if (accOpen) {
        accOpt.innerHTML = `
            <button class='openBtn optionTxt' onclick='expandAcc()'>
                Your Account<br>
                <small class='smallTxt'>
                    See information about your account, update details, or sign out
                </small>
            </button>
        `;
        accOpen = false;
    } else {
        accOpt.innerHTML = `
            <button class='openBtn optionTxt' onclick='expandAcc()'>
                Your Account<br>
                <small class='smallTxt'>
                    See information about your account, update details, or sign out
                </small>
            </button>

            <div class='settingsOpt'>
                <p><strong>Choose a New Username</strong></p>
                <p>This will display as <strong>@username</strong></p>
                <input id='newUsername' class='settingsInput' placeholder='e.g., rodolfo_tan' />
                <button class='saveBtn' onclick='saveUsername()'>Save</button>
            </div>

            <div class='settingsOpt'>
                <p><strong>Change Email (.edu only)</strong></p>
                <input id='newEmail' class='settingsInput' placeholder='e.g., jdoe@suny.edu' />
                <button class='saveBtn' onclick='saveEmail()'>Save</button>
            </div>

            <div class='settingsOpt'>
                <p><strong>Log Out</strong></p>
                <button class='logoutBtn' onclick='handleLogout()'>Log Out</button>
            </div>

            <div class='settingsOpt'>
                <p><strong>Delete Account</strong></p>
                <button class='delBtn' onclick='confDelete()'>Delete Account</button>
            </div>
        `;
        accOpen = true;
    }
}

// SAVE USERNAME FUNCTION
async function saveUsername() {
    const user = auth.currentUser;
    if (!user) return;

    const newUsername = document.getElementById('newUsername').value.trim();
    if (!newUsername) return alert("Please enter a username.");

    try {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, { username: newUsername });

        // Update UI immediately in both places
        document.getElementById("headerUsername").textContent = "@" + newUsername;
        document.getElementById("username").textContent = "@" + newUsername;

        alert("Username updated successfully!");
    } catch (error) {
        console.error("Error updating username:", error);
        alert("Failed to update username.");
    }
}

// SAVE EMAIL FUNCTION
async function saveEmail() {
    const user = auth.currentUser;
    if (!user) return;

    const newEmail = document.getElementById('newEmail').value.trim();

    // Validates .edu only
    if (!newEmail.toLowerCase().endsWith(".edu")) {
        return alert("Please use a valid .edu email address.");
    }

    try {
        await updateEmail(user, newEmail);
        alert("Email updated successfully!");
    } catch (error) {
        // Firebase requires a recent login to change emails
        if (error.code === 'auth/requires-recent-login') {
            alert("Security check: Please log out and back in to change your email.");
        } else {
            alert("Error: " + error.message);
        }
    }
}

// DELETE ACCOUNT
function confDelete() {
    let trueUsername = document.getElementById('username').innerText.replace("@", "");

    let username = prompt(
        'Are you sure?\n\nType your username to delete your account:'
    );

    if (!username) return;

    if (username.toLowerCase() === trueUsername.toLowerCase()) {
        alert("Account deleted (placeholder)");
        window.location.href = "login.php";
    } else {
        alert("Username does not match.");
    }
}

// PRIVACY OPTIONS
// Logic for Privacy Settings
async function saveVisibility() {
    const user = auth.currentUser;
    if (!user) return;

    const selected = document.querySelector('input[name="profileVisOpt"]:checked');
    if (!selected) return alert("Please select a visibility option.");
    
    const visibility = selected.value;
    
    try {
        await updateDoc(doc(db, "users", user.uid), { visibility: visibility });
        alert("Visibility updated to " + visibility);
    } catch (e) {
        console.error(e);
        alert("Failed to update visibility.");
    }
}

async function blockUser(targetUid) {
    const user = auth.currentUser;
    if (!user) return;

    try {
        await updateDoc(doc(db, "users", user.uid), {
            blockedUsers: arrayUnion(targetUid)
        });
        alert("User blocked.");
    } catch (e) {
        console.error(e);
        alert("Failed to block user.");
    }
}
// Search logic
async function searchUsersToBlock() {
    const queryText = document.getElementById('reportSearch').value.trim();
    const resultsDiv = document.getElementById('blockSearchResults');
    
    // Don't trigger a search for very short strings to save on database reads
    if (queryText.length < 3) {
        resultsDiv.innerHTML = ""; 
        return;
    }

    try {
        // Query Firestore for an exact username match
        const q = query(collection(db, "users"), where("username", "==", queryText));
        const querySnapshot = await getDocs(q);
        
        resultsDiv.innerHTML = ""; 

        if (querySnapshot.empty) {
            resultsDiv.innerHTML = "<p class='smallTxt' style='padding: 10px;'>No users found with that username.</p>";
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const userData = docSnap.data();
            const userId = docSnap.id;

            // Prevent blocking yourself
            if (userId === auth.currentUser.uid) return;

            resultsDiv.innerHTML += `
                <div class='reportItem'>
                    <p class='reportItemTitle'>
                        <strong>User:</strong><br>
                        ${userData.displayName || userData.name || "User"}<br>
                        <small class='smallTxt'>@${userData.username}</small>
                    </p>
                    <p class='reportItemURL'>
                        <strong>Profile URL:</strong> 
                        <a href="profile.html?id=${userId}" target="_blank">View Profile</a>
                    </p>
                    <button class='delBtn' onclick="blockUser('${userId}')">Block User</button>
                </div>
            `;
        });
    } catch (e) {
        console.error("Search error:", e);
    }
}

// PRIVACY OPTIONS UI
function expandPrivacy(){
    const privacyOpt = document.getElementById('privacyOption');

    if(privacyOpen){
        privacyOpt.innerHTML = 
            `<button class="openBtn optionTxt" onclick="expandPrivacy()">
            Privacy<br>
            <small class="smallTxt">
                Manage your account's security and interactions with other users
            </small>
            </button>`;
            privacyOpen = false;
    } else {
        privacyOpt.innerHTML = `
            <button class="openBtn optionTxt" onclick="expandPrivacy()">
                Privacy<br>
                <small class="smallTxt">
                    Manage your account's security and interactions with other users
                </small>
            </button>
            
            <div class='settingsOpt'>
                <div id='profileVisContainer'>
                    <p><strong>Profile Visibility:</strong></p>
                    <input type='radio' id='profileVisOpt-PUBLIC' value='public' name='profileVisOpt'>
                    <label for='profileVisOpt-PUBLIC'>Public</label><br>
                    <input type='radio' id='profileVisOpt-PRIVATE' value='private' name='profileVisOpt'>
                    <label for='profileVisOpt-PRIVATE'>Private</label><br><br>
                    <button class='saveBtn' onclick="saveVisibility()">Save</button>
                </div><br>

                <div id='reportsContainer'>
                    <p><strong>Blocked Users:</strong></p>
                    <input class='settingsInput' id='reportSearch' placeholder='Search user to block...' oninput='searchUsersToBlock()'/>
                    <div id='blockSearchResults'>
                        </div>
                </div>
            </div>`;
            privacyOpen = true;
    }
}


// THEME OPTIONS
function expandTheme() {
    const themeOpt = document.getElementById('themeOption');

    if (themeOpen) {
        themeOpt.innerHTML = `
            <button class='openBtn optionTxt' onclick='expandTheme()'>
                Appearance<br>
                <small class='smallTxt'>
                    Change your color scheme or background
                </small>
            </button>
        `;
        themeOpen = false;
    } else {
        themeOpt.innerHTML = `
            <button class='openBtn optionTxt' onclick='expandTheme()'>
                Appearance<br>
                <small class='smallTxt'>
                    Change your color scheme or background
                </small>
            </button>

            <div class='settingsOpt'>
                <p><strong>Theme</strong></p>

                <select id='themeSelector' onchange='changeTheme()'>
                    <option disabled selected hidden>Color</option>
                    <option value='#0f73ff'>Blue</option>
                    <option value='#A11010'>Red</option>
                    <option value='#E86C13'>Orange</option>
                    <option value='#A947C9'>Purple</option>
                    <option value='#004a41'>Green</option>
                </select>

                <select id='bgSelector' onchange='changeBG()'>
                    <option disabled selected hidden>Background</option>
                    <option value='#000000'>Lights Out</option>
                    <option value='#F2F2EB'>Light</option>
                    <option value='#151D28'>Dark</option>
                </select>
            </div>
        `;
        themeOpen = true;
    }
}

// ABOUT
function expandAbout() {
    const aboutOpt = document.getElementById('aboutOption');

    if (aboutOpen) {
        aboutOpt.innerHTML = `
            <button class='openBtn optionTxt' onclick='expandAbout()'>
                About<br>
                <small class='smallTxt'>
                    View application information
                </small>
            </button>
        `;
        aboutOpen = false;
    } else {
        aboutOpt.innerHTML = `
            <button class='openBtn optionTxt' onclick='expandAbout()'>
                About<br>
                <small class='smallTxt'>
                    View application information
                </small>
            </button>

            <div class='settingsOpt'>
                <p><strong>Application Info</strong></p>
                <p>App Version: 0.5a</p>
            </div>
        `;
        aboutOpen = true;
    }
}


// SUPPORT OPTIONS
function expandSupport() {
    const supportOpt = document.getElementById('supportOption');

    if (supportOpen) {
        supportOpt.innerHTML = `
            <button class="openBtn optionTxt" onclick="expandSupport()">
                Support<br>
                <small class="smallTxt">FAQ, troubleshooting, and user reports</small>
            </button>`;
        supportOpen = false;
    } else {
        supportOpt.innerHTML = `
            <button class="openBtn optionTxt" onclick="expandSupport()">
                Support<br>
                <small class="smallTxt">FAQ, troubleshooting, and user reports</small>
            </button>
            <div class='settingsOpt'>
                <p>See the FAQ Page for helpful information and troubleshooting: <a href="faq.html"><strong>FAQ</strong></a></p>
                
                <div id='reportFormContainer' style="border: 1px solid #444; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <p><strong>Create a New Report:</strong></p>
                    <input class='settingsInput' id='reportTitle' placeholder='Report Title'/><br>
                    <textarea class='settingsInput' id='reportDesc' placeholder='Describe the issue...' style='height:80px; resize:none;'></textarea><br>
                    <input class='settingsInput' id='reportURL' placeholder='URL of Profile or Post'/><br>
                    <button class='saveBtn' onclick="submitReport()">Submit Report</button>
                </div>

                <div id='userReportsList'>
    <p class='smallTxt' style='padding: 10px;'>Fetching your reports...</p>
</div>
            </div>`;
        supportOpen = true;
        loadUserReports(); // Trigger the fetch immediately
    }
}



// LOGOUT
function handleLogout() {
    import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js")
    .then(({ signOut }) => {
        import("./firebaseInitialization.js").then(({ auth }) => {
            signOut(auth).then(() => {
                window.location.href = "login.php";
            });
        });
    });
}

window.expandPrivacy = expandPrivacy;
window.expandSupport = expandSupport;
window.expandAcc = expandAcc;
window.expandTheme = expandTheme;
window.expandAbout = expandAbout;
window.handleLogout = handleLogout;
window.confDelete = confDelete;
window.saveUsername = saveUsername;
window.saveEmail = saveEmail;
window.saveVisibility = saveVisibility;
window.blockUser = blockUser;
window.expandPrivacy = expandPrivacy;
window.searchUsersToBlock = searchUsersToBlock;
window.submitReport = submitReport;
window.expandSupport = expandSupport;
window.loadUserReports = loadUserReports;
window.deleteReport = deleteReport;