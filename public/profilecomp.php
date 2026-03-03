<form id="profileForm">

    <input type="text" id="campus" placeholder="Campus" required>

    <input type="text" id="major" placeholder="Major" required>

    <input type="number"  id="graduationYear" placeholder="Graduation Year" min="2026" required>

    <!-- OPTIONAL -->
    <input type="text" id="courses" placeholder="Courses (comma separated)">

    <!-- OPTIONAL -->
    <textarea id="bio" placeholder="Short bio (optional)"></textarea>

    <button type="submit">Save Profile</button>

</form>
<script type="module" src="js/profile.js"></script>
</body>
</html>