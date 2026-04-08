// Settings
import { auth, db } from "./firebaseInitialization.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// LOAD USERNAME 
onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
        const data = snap.data();

        const headerUsername = document.getElementById("headerUsername");
        if (headerUsername) {
            headerUsername.textContent = "@" + (data.username || "user");
        }
    }
});

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
                    See information about your account and update details
                </small>
            </button>
        `;
        accOpen = false;
    } else {
        accOpt.innerHTML = `
            <button class='openBtn optionTxt' onclick='expandAcc()'>
                Your Account<br>
                <small class='smallTxt'>
                    See information about your account and update details
                </small>
            </button>

            <div class='settingsOpt'>
                <p><strong>Choose a New Username</strong></p>
                <p>This will display as <strong>@username</strong></p>
                <input class='settingsInput' placeholder='e.g., rodolfo_tan' />
                <button class='saveBtn'>Save</button>
            </div>

            <div class='settingsOpt'>
                <p><strong>Change Email (.edu only)</strong></p>
                <input class='settingsInput' placeholder='e.g., jdoe@suny.edu' />
                <button class='saveBtn'>Save</button>
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



function expandSupport(){
    const supportOpt = document.getElementById('supportOption');

    if(supportOpen){
        supportOpt.innerHTML = 
            `<button class="openBtn optionTxt" onclick='expandSupport()'>
                Support<br>
                <small class="smallTxt">
                FAQ, troubleshooting, and user reports
                </small>
            </button>`;
            supportOpen = false;
    } else {
        supportOpt.innerHTML = `
            <button class="openBtn optionTxt" onclick='expandSupport()'>
                Support<br>
                <small class="smallTxt">
                    FAQ, troubleshooting, and user reports
                </small>
            </button>
            
            <div class='settingsOpt'>
                <p>See the FAQ Page for helpful information and troubleshooting: <a href='faq.html'>FAQ</a></p>

                <div id='reportsContainer'>
                    <p><strong>User reports:</strong></p>
                    <input class='settingsInput' id='reportSearch' placeholder='Search Reports'/>
                    <div class='reportItem'>
                        <!-- THIS IS A SAMPLE REPORT, YOU MUST REMOVE THIS WHEN IMPLEMENTING -->
                        <p class='reportItemTitle'><strong>Title:</strong> Upsetting Content</p>
                        <p class='reportItemDesc'><strong>Description:</strong> This post caused me significant distress</p>
                        <p class='reportItemURL'><strong>Post URL:</strong> <a href="http://localhost/StudentLink/public/post.html?id=XqKSUBnOgcw665zu1iCH">Go to Post</a></p>
                        <!-- ONLY MODS CAN SEE THIS BUTTON -->
                        <button class='delBtn'>Delete Post</button>
                    </div>
                </div>
            </div>`;
            supportOpen = true;
    }
}

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
                    <button class='saveBtn'>Save</button>
                </div><br>


                <div id='reportsContainer'>
                    <p><strong>Blocked Users:</strong></p>
                    <input class='settingsInput' id='reportSearch' placeholder='Search Blocked Users'/>
                    <div class='reportItem'>
                        <!-- THIS IS A SAMPLE USER REPORT, YOU MUST REMOVE THIS WHEN IMPLEMENTING -->
                        <p class='reportItemTitle'><strong>User:</strong><br>Derek Mendez<br><small class='smallTxt'>@mendd2</small></p>
                        <p class='reportItemURL'><strong>Profile URL:</strong> <a href="http://localhost/StudentLink/public/profile.html?id=OqTA2B5xB2NcHgw6POxwaFf3yWY2">Go to Profile</a></p>
                        <!-- ONLY MODS CAN SEE THIS BUTTON -->
                        <button class='delBtn'>Unblock User</button>
                    </div>
                </div>
            </div>`;
            privacyOpen = true;
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