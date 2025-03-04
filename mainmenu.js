const times = [ "12:99 PM", "5:57 PM", "10:05 AM", "1:32 AM" ]

const windowPresets = {
    "eyespy": {
        title: "Eyespy Antivirus v1.0",
        content: `
            <span style="line-height: 2.5em; vertical-align: text-top;">
                <img src="./textures/eyespy.gif" style="height: 3em;">&nbsp;
                Eyespy Antivirus Shareware v1.0
            </span>
            <hr />
            Welcome! Please select what you would like to do today:
            <br /><br />
            <button onclick="openLevel('welcome.w95')">Tutorial [lvl 1]</button>
            <button onclick="openLevel('testing.w95')">Recover my files [???]</button>`
    },
    "iexplore": {
        title: "Net Explorer",
        content: `
            <div style="width: 100%;">
                <input style="width: 100%;" value="HTTPS://www.doogle.kom" disabled />
                <hr />
                Bookmarks: [empty]
            </div>
            <div id="iexplore-content">
                <br /><br /><br /><br /><br />
                <center>
                    <h1 style="font-size: 50px; font-family: 'Times New Roman';"><b>
                        <span style="color: #5f51c9; margin-left: -10px;">D</span>
                        <span style="color: #c9516d; margin-left: -10px;">o</span>
                        <span style="color: #c99f51; margin-left: -10px;">o</span>
                        <span style="color: #5f51c9; margin-left: -10px;">g</span>
                        <span style="color: #9bc951; margin-left: -10px;">l</span>
                        <span style="color: #c9516d; margin-left: -10px;">e</span>
                    </b></h1>
                    <input style="width: 50%;" /><br /><br />
                    <button>Doogle Search</button>
                    <button>I'm feeling lucky</button><br /><br />
                    NOTE: Doogle is currently down... we will be back up in 1.844e+18 hours!
                </center>
            </div>`
    }
}

function startTimeUpdates() {
    setInterval(() => {
        document.getElementById("time").innerText = times[Math.floor(Math.random() * times.length)]
    }, 1000);
}
function openLevel(filePath) {
    window.location.href = `./level.html?filePath=${btoa(filePath)}`;
}

function openWindow(id) {
    if (document.getElementById(id)) return;

    let window = `<div class="window" id="${id}">
        <div class="window-header">
            ${windowPresets[id].title}
            <button style="float: right;" onclick="closeWindow('${id}');">X</button>
        </div>
        <div class="window-content">${windowPresets[id].content}</div>
    </div>`;
    document.getElementById("windows").innerHTML += window;
}
function closeWindow(id) {
    document.getElementById(id).remove();
}