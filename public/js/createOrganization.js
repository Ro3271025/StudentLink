import { db, auth } from "./firebaseInitialization.js";

import {
    collection,
    addDoc,
    serverTimestamp,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

/* ELEMENTS */

const btn = document.getElementById("createOrgBtn");
const storage = getStorage();

const officerList = document.getElementById("officerList");
const addOfficerBtn = document.getElementById("addOfficerBtn");

/* ADD OFFICER INPUT ROW */

function addOfficerInput() {
    const div = document.createElement("div");
    div.className = "officerInputRow";

    div.innerHTML = `
        <input type="text" placeholder="User UID" class="officerUID">

        <select class="officerRole">
            <option value="President">President</option>
            <option value="Vice President">Vice President</option>
            <option value="Treasurer">Treasurer</option>
            <option value="Secretary">Secretary</option>
            <option value="Officer">Officer</option>
        </select>

        <button type="button" class="removeOfficerBtn">X</button>
    `;

    /* REMOVE BUTTON */
    div.querySelector(".removeOfficerBtn").onclick = () => {
        div.remove();
    };

    officerList.appendChild(div);
}

/* ADD BUTTON EVENT */
if (addOfficerBtn) {
    addOfficerBtn.onclick = addOfficerInput;
}

/* CREATE ORG */

btn.addEventListener("click", async () => {

    const user = auth.currentUser;
    if (!user) return alert("Not logged in");

    /* CHECK ROLE */
    const snap = await getDoc(doc(db, "users", user.uid));
    const role = snap.data()?.role;

    if (role !== "orgLeader" && role !== "admin") {
        return alert("Not allowed");
    }

    const name = document.getElementById("orgName").value;
    const desc = document.getElementById("orgDesc").value;
    const file = document.getElementById("orgImage").files[0];

    if (!name) return alert("Name required");

    try {

        let imageURL = "";
        /* UPLOAD IMAGE */

        if (file) {
            const storageRef = ref(
                storage,
                `orgImages/${user.uid}_${Date.now()}`
            );

            await uploadBytes(storageRef, file);
            imageURL = await getDownloadURL(storageRef);
        }
        /* COLLECT OFFICERS */

        let officers = [];

        const officerRows = document.querySelectorAll(".officerInputRow");

        officerRows.forEach(row => {
            const uid = row.querySelector(".officerUID").value.trim();
            const role = row.querySelector(".officerRole").value;

            if (uid) {
                officers.push({
                    uid,
                    role
                });
            }
        });
        /* SAVE TO FIRESTORE */

        await addDoc(collection(db, "organizations"), {
            name,
            description: desc,
            imageURL,
            createdBy: user.uid,
            timestamp: serverTimestamp(),
            officers: officers
        });

        alert("Organization created!");
        window.location.href = "organizations.html";

    } catch (err) {
        console.error(err);
        alert("Error creating organization");
    }
});