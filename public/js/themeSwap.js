function swapTheme(){
    var selBox = document.getElementById("themeSelector");
    var selValue = selBox.options[selBox.selectedIndex].value;
    var object = document.getElementsByClassName("themeObject");

    for(const element of object){
        element.style.backgroundColor = selValue;
        element.style.borderColor = selValue;
    }
}