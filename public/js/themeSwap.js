function swapTheme(){
    var selBox = document.getElementById("themeSelector");
    var selValue = selBox.options[selBox.selectedIndex].value;
    var object = document.getElementsByClassName("themeObject");

    for(const element of object){
        console.log(element);

        element.style.backgroundColor = selValue;
        element.style.borderColor = selValue;
    }
}