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

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

/* ELEMENTS */
const btn = document.getElementById("createOrgBtn");
const storage = getStorage();

const officerList = document.getElementById("officerList");
const addOfficerBtn = document.getElementById("addOfficerBtn");

const galleryInput = document.getElementById("orgGalleryImages");
const previewEl = document.getElementById("galleryPreview");

/* OFFICER STATE */
let officers = [];

/* ADD OFFICER INPUT */
function renderOfficers() {
    officerList.innerHTML = "";

    officers.forEach((officer, index) => {
        const div = document.createElement("div");
        div.className = "officerInputRow";

        div.innerHTML = `
            <input type="text" placeholder="Full Name" class="officerName" value="${officer.name}">

            <select class="officerRole">
                <option value="President" ${officer.role === "President" ? "selected" : ""}>President</option>
                <option value="Vice President" ${officer.role === "Vice President" ? "selected" : ""}>Vice President</option>
                <option value="Treasurer" ${officer.role === "Treasurer" ? "selected" : ""}>Treasurer</option>
                <option value="Secretary" ${officer.role === "Secretary" ? "selected" : ""}>Secretary</option>
                <option value="Officer" ${officer.role === "Officer" ? "selected" : ""}>Officer</option>
            </select>

            <input type="text" placeholder="Email (optional)" class="officerEmail" value="${officer.email || ""}">

            <button type="button" class="removeOfficerBtn">✕</button>
        `;

        const inputs = div.querySelectorAll("input");
        inputs[0].oninput = (e) => officers[index].name = e.target.value;
        inputs[1] /* select */ ;
        div.querySelector("select").oninput = (e) => officers[index].role = e.target.value;
        inputs[1].oninput = (e) => officers[index].email = e.target.value;

        div.querySelector(".removeOfficerBtn").onclick = () => {
            officers.splice(index, 1);
            renderOfficers();
        };

        officerList.appendChild(div);
    });
}

if (addOfficerBtn) {
    addOfficerBtn.onclick = () => {
        officers.push({ name: "", role: "Officer", email: "" });
        renderOfficers();
    };
}

/* GALLERY PREVIEW */
let galleryFiles = [];

if (galleryInput) {
    galleryInput.onchange = () => {
        const files = Array.from(galleryInput.files);
        galleryFiles.push(...files);

        previewEl.innerHTML = "";

        galleryFiles.forEach((file, index) => {
            const wrapper = document.createElement("div");
            wrapper.className = "imageWrapper";
            wrapper.style.position = "relative";
            wrapper.style.display = "inline-block";

            const img = document.createElement("img");
            img.src = URL.createObjectURL(file);
            img.style.width = "80px";
            img.style.height = "80px";
            img.style.objectFit = "cover";
            img.style.borderRadius = "6px";

            const removeBtn = document.createElement("button");
            removeBtn.className = "removeImgBtn";
            removeBtn.textContent = "✕";
            removeBtn.onclick = () => {
                galleryFiles.splice(index, 1);
                galleryInput.value = "";
                renderGalleryPreview();
            };

            wrapper.appendChild(img);
            wrapper.appendChild(removeBtn);
            previewEl.appendChild(wrapper);
        });
    };
}

function renderGalleryPreview() {
    previewEl.innerHTML = "";

    galleryFiles.forEach((file, index) => {
        const wrapper = document.createElement("div");
        wrapper.className = "imageWrapper";
        wrapper.style.position = "relative";
        wrapper.style.display = "inline-block";

        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        img.style.width = "80px";
        img.style.height = "80px";
        img.style.objectFit = "cover";
        img.style.borderRadius = "6px";

        const removeBtn = document.createElement("button");
        removeBtn.className = "removeImgBtn";
        removeBtn.textContent = "✕";
        removeBtn.onclick = () => {
            galleryFiles.splice(index, 1);
            renderGalleryPreview();
        };

        wrapper.appendChild(img);
        wrapper.appendChild(removeBtn);
        previewEl.appendChild(wrapper);
    });
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

    const name = document.getElementById("orgName").value.trim();
    const desc = document.getElementById("orgDesc").value.trim();
    const category = document.getElementById("categoryInput")?.value.trim() || "";
    const email = document.getElementById("emailInput")?.value.trim() || "";
    const file = document.getElementById("orgImage").files[0];

    if (!name) return alert("Name required");

    btn.innerText = "Creating...";
    btn.disabled = true;

    try {
        let mainImageURL = "";
        let galleryURLs = [];

        /* UPLOAD MAIN IMAGE */
        if (file) {
            const storageRef = ref(storage, `organizationMain/${user.uid}_${Date.now()}`);
            await uploadBytes(storageRef, file);
            mainImageURL = await getDownloadURL(storageRef);
        }

        /* UPLOAD GALLERY */
        for (let i = 0; i < galleryFiles.length; i++) {
            const gFile = galleryFiles[i];
            const storageRef = ref(storage, `organizationGallery/${user.uid}_${Date.now()}_${i}_${gFile.name}`);
            await uploadBytes(storageRef, gFile);
            const url = await getDownloadURL(storageRef);
            galleryURLs.push(url);
        }

        /* COLLECT OFFICERS (filter out empty) */
        const finalOfficers = officers.filter(o => o.name && o.role);

        /* SAVE — field names match editOrganization.js */
        await addDoc(collection(db, "organizations"), {
            name,
            description: desc,
            category,
            email,
            mainImageURL,
            galleryImages: galleryURLs,
            createdBy: user.uid,
            timestamp: serverTimestamp(),
            officers: finalOfficers
        });

        alert("Organization created!");
        window.location.href = "organizations.html";

    } catch (err) {
        console.error(err);
        alert("Error creating organization");
    }

    btn.innerText = "Create Organization";
    btn.disabled = false;
});
/* AUTH — matches editOrganization.js pattern */
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "organizations.html";
    }
});