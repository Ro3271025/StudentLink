import { db } from "./firebaseInitialization.js";
import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const searchInputs = document.querySelectorAll(".searchBar");

searchInputs.forEach(input => {

  input.addEventListener("keypress", async (e) => {

    if (e.key === "Enter") {

      const value = input.value.trim().toLowerCase();

      if (!value) return;

      try {

        // SEARCH USERNAME
        const usernameQuery = query(
          collection(db, "users"),
          where("username", ">=", value),
          where("username", "<=", value + "\uf8ff")
        );

        const usernameSnap = await getDocs(usernameQuery);

        // SEARCH DISPLAY NAME
        const nameQuery = query(
          collection(db, "users"),
          where("name", ">=", value),
          where("name", "<=", value + "\uf8ff")
        );

        const nameSnap = await getDocs(nameQuery);

        let results = [];

        usernameSnap.forEach(doc => results.push({ id: doc.id, ...doc.data() }));
        nameSnap.forEach(doc => results.push({ id: doc.id, ...doc.data() }));

        if (results.length === 0) {
          alert("No users found");
          return;
        }

        // for now: go to first result
        window.location.href = `profile.html?id=${results[0].id}`;

      } catch (error) {
        console.error("Search failed:", error);
      }

    }

  });

});