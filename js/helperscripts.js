const path = require("path");
const os = require("os");
const {ipcRenderer} = require("electron");

//Getting form inputs
const form = document.getElementById("image-form");
const slider = document.getElementById("slider");
const img = document.getElementById("img");

//Outputting the path.
document.getElementById("output-path").innerText = path.join(os.homedir(), "imageshrink");

//Onsubmit event
form.addEventListener("submit", (e) => {
    e.preventDefault();
    const imgPath = img.files[0].path;
    const quality = slider.value;
    // First argument is a custom identifier and the second is the data we send, we can also send an action or event. So we are sending this to the main process. The main process is process is contained in the main.js file. The identifier de defined here will be used to catch the data in the main process.
    //STEP 13
    ipcRenderer.send("image:minimize", {imgPath, quality});
});

//On done
ipcRenderer.on("image:done", () => {
    // M is part of materialize is an alert window that is called a toast but you can use any other.
    M.toast({
        html: `Image has been compressed to ${slider.value}%`
    });
});