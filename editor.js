function importSelectedFile() {
    var reader = new FileReader();
    reader.readAsText(document.getElementById("file").files[0], "UTF-8");
    reader.onload = function(event) {
        const contents = event.target.result;
        // document.getElementById("editor").innerHTML

        let rows = contents.split("\n");
        let x = 0; let z = 0;
        rows.forEach(row => {
            x = 0;
            let rowSplit = row.split(" ");
            let rowInnerHTML = "";
            rowSplit.forEach(char => {
                char = char.replace("\r", "")
                const id = btoa(`${x}:${z}`)
                rowInnerHTML += `<button id="${id}" class="tile ${(char == '.') ? '' : 'occupied-tile'}" onclick="replaceTile('${id}')">${char}</button>`;
                x++;
            });
            document.getElementById("editor").innerHTML += `<div>${rowInnerHTML}</div>`;
            z++;
        });

    }
    reader.onerror = function(event) { alert("Unable to load file :("); }
}
function replaceTile(id) {
    const char = document.getElementById("tile-select").value;
    document.getElementById(id).className = `tile ${(char == '.') ? '' : 'occupied-tile'}`;
    document.getElementById(id).innerText = char;
}
function exportMap() {
    let contents = "";
    document.querySelectorAll("#editor div").forEach((element) => {
        element.querySelectorAll(".tile").forEach((_element) => {
            contents += `${_element.innerText} `;
        });
        contents += "\n";
    })
    contents = contents.substring(0, contents.length - 1)
    const blob = new Blob([contents], { type: "text/plain" });
    const link = document.querySelector("#export-link");
    link.download = "untitled_level.w95";
    link.href = URL.createObjectURL(blob);
    link.click();
}
function playMap() {
    let contents = "";
    document.querySelectorAll("#editor div").forEach((element) => {
        element.querySelectorAll(".tile").forEach((_element) => {
            contents += `${_element.innerText} `;
        });
        contents += "\n";
    })
    contents = contents.substring(0, contents.length - 1)
    const link = document.querySelector("#export-link");
    link.href = `./level.html?filePath=${btoa(URL.createObjectURL(new Blob([contents], { type: "text/plain" })))}`
    link.click();
}