function changeTheme(){ 
    var rootCSS = document.querySelector(':root');
    var rootComputed = getComputedStyle(rootCSS); // debug

    var selBox = document.getElementById("themeSelector");
    var selValue = selBox.options[selBox.selectedIndex].value;

    console.log(rootComputed.getPropertyValue('--theme-accent')); //debug

    rootCSS.style.setProperty('--theme-accent', selValue);

    switch (selValue) { // theres a better way to do this I just don't have the time or patience right now - PR
        case "#0f73ff": // blue
            rootCSS.style.setProperty('--button-hover', "#113D7A");
            break;
        case "#A11010": // red
            rootCSS.style.setProperty('--button-hover', "#4A0808");
            break;
        case "#E86C13": // orange
            rootCSS.style.setProperty('--button-hover', "#99490F");
            break;
        case "#A947C9": // purple
            rootCSS.style.setProperty('--button-hover', "#4D205C");
            break;
        case "#004a41": // green
            rootCSS.style.setProperty('--button-hover', "#01241F");
            break;
    }

}

function changeBG(){
    var rootCSS = document.querySelector(':root');

    var selBox = document.getElementById("bgSelector");
    var selValue = selBox.options[selBox.selectedIndex].value;

    rootCSS.style.setProperty('--bg-primary', selValue);

    switch (selValue){
        case "#151D28": // Dark
            rootCSS.style.setProperty('--text-fill', "#ffffff");
            break;
        case "#000000": // Lights out
            rootCSS.style.setProperty('--text-fill', "#ffffff");
            break;
        case "#F2F2EB": // Light
            rootCSS.style.setProperty('--text-fill', "#000000");
            break;
    }
}





