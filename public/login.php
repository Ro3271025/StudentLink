<!DOCTYPE html>
<html>
<head>
    <title>Sign in | StudentLink</title>
    <link rel="stylesheet" href="styles/style.css">
    <meta name="viewport" content="width=device-width, initial-scale=1">
</head>

<body id="loginBody">

    <div id="loginContainer">

        <!-- LEFT -->
        <div id="loginLeft">
            <p id="signIn">StudentLink</p>
            <p id="subtitle">Connect with your campus</p>
        </div>

        <!-- DIVIDER -->
        <div id="verticalDivider"></div>

        <!-- RIGHT -->
        <div id="loginRight">

            <!-- GOOGLE -->
            <button id="gLoginBtn" class="themeObject">
                <img src="styles/images/GOOGLE_LOGO.svg">
                Sign in with Google
            </button>

            <!-- MICROSOFT -->
            <button id="msLoginBtn" class="themeObject">
                <img src="styles/images/MS_LOGO.svg">
                Sign in with Microsoft
            </button>

        </div>

    </div>

    <script type="module">
        import { setupLogin } from "../public/js/auth.js";
        setupLogin();
    </script>

</body>
</html>