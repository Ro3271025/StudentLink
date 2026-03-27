<!DOCTYPE html>
<html>
<head>
    <title>Sign in | StudentLink</title>
    <link rel="stylesheet" href="../public/styles/style.css">
    <meta name="viewport" content="width=device-width, initial-scale=1">
</head>

<body id="loginBody">

    <div id="loginContainer">

        <!-- LEFT SIDE -->
        <div id="loginLeft">
            <p id="signIn">StudentLink</p>
            <p id="subtitle">Connect with your campus</p>
        </div>

        <!-- DIVIDER -->
        <div id="verticalDivider"></div>

        <!-- RIGHT SIDE -->
        <div id="loginRight">

            <button id="gLoginBtn" class="themeObject">
                <img src="../public/styles/images/placeholder/GOOGLE_LOGO.svg">
                Sign in with Google
            </button>

            <!-- (optional for later) -->
            <button id="msLoginBtn" class="themeObject">
                <img src="../public/styles/images/placeholder/MS_LOGO.svg">
                Sign in with Microsoft
            </button>

        </div>

    </div>

    <!-- LOAD YOUR EXISTING AUTH LOGIC -->
    <script type="module">
        import { setupLogin } from "../public/js/auth.js";
        setupLogin();
    </script>

</body>
</html>