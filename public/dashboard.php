<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Dashboard</title>
    </head>
<body>

    <div class="container">
        <h2>Dashboard</h2>
        <p id="userInfo"></p>
        <button id="logoutBtn">Logout</button>
        
        <hr>

        <h2>Student Support & Exchange Feed</h2>
        <div id="feedContainer"></div> 
    </div>

    <script type="module">
        import { setupDashboard } from "./js/dashboard.js";
        setupDashboard();
    </script>

    <script type="module" src="js/feed.js"></script>

</body>
</html>