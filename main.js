//In Electron there is no common rule how you should structure your app.
//STEP 9 - import Menu
const path = require('path');
const os = require('os');
//In order to create global shortcuts we need to import the "globalShortcut" module.
//"ipcMain" is used to catch the events from the child process (called renderer).
//"shell" is like windows powershell that allows us to run different commands like open a folder.
const { app, BrowserWindow, Menu, globalShortcut, ipcMain, shell } = require("electron");
//"app" contains the whole life cycle of the app. 
//"BrowserWindow" are actual windows.

//Import the image resize modules
//There is also an option to use the plugins recommended in the "imagemin" documentation.
const imagemin = require("imagemin");
const imageminMozjpeg = require("imagemin-mozjpeg");
const imageminPngquant = require("imagemin-pngquant");
//Is used to reverse the windows default slash direction.
const slash = require("slash");
const log = require("electron-log");

//TODO uncomment this in production const path = require("path");

// Create empty windows variables.
let mainWindow;
//STEP 12 Create a new window. It is the same procedure as we used for the mainWindow.
let aboutWindow;

//STEPS 6 and 7 help us enable different features depending on the platform and platform.
//STEP 6 The working environment variable - production or development etc. On release or testing we can set this var to production.
process.env.NODE_ENV = "production";

const isDev = process.env.NODE_ENV !== "production" ? true : false;

//STEP 7 Platform check - win32 for windows or darwin for macOS or linux for linux users etc.
const isWin = process.platform === "win32" ? true : false;
const isMac = process.platform === "darwin" ? true : false;

//STEP 8 OPTIONAL We can include nodemon as dev dependency in package.json. in order not to reload the window explicitly. But this only will update the changes me make here and not the ones we make in the index.html file.

//STEP 2
function createMainWindow(){
    //Create a new window
    mainWindow = new BrowserWindow({
        //You can also pass CSS options here to style the window.
        title: "imageShrink",
        width: isDev ? 800 : 500,
        height: 600,
        icon: "./assets/icons/Icon_256x256.png",
        resizable: isDev? true : false,
        backgroundColor: "white",
        //Enable nodejs integration.
        webPreferences: {
            nodeIntegration: true,      
            contextIsolation: false,
            //preload: path.join(app.getAppPath(), '/js/helperscripts.js')
            //For production take the source code from here. https://stackoverflow.com/questions/44391448/electron-require-is-not-defined
        }
    });
    //mainWindow has many methods. In the case bellow we actually are loading a webpage inside of it or we ca load a local file.
    //mainWindow.loadURL("https://www.google.com");
    //__dirname stands for the current directory.
    // STEP 3
    //mainWindow.loadURL(`file://${__dirname}/app/index.html`);
    // in case of loading local files there is a shorthand using .loadFile(). Both are ok.

    //Enable the devtools to show up automatically if we are in development mode.
    if(isDev){
        mainWindow.webContents.openDevTools();
    }
    mainWindow.loadFile("./app/index.html");    
}

//Usually it is good practice to not have multiple window in your app it is more like a single page app.
function createAboutWindow(){
    //Create a new window
    aboutWindow = new BrowserWindow({
        //You can also pass CSS options here to style the window.
        title: "About imageShrink",
        width: 300,
        height: 300,
        icon: "./assets/icons/Icon_256x256.png",
        resizable: false,
        backgroundColor: "white",
        webPreferences: {
            nodeIntegration: true,
        },       
    });
    aboutWindow.loadFile("./app/about.html");  
}

//STEP 4
//Launch the app.
app.on("ready", () => {
    // garbage collection.
    createMainWindow();

    //STEP 11 Initialize the Menu object with the template from STEP 10. 
    const mainMenu = Menu.buildFromTemplate(menu);
    Menu.setApplicationMenu(mainMenu);

    //Registering a global shortcut for reloading the window.
    globalShortcut.register("CmdOrCtrl+R", () => mainWindow.reload());
    //Command to open and close the devtools window.
    globalShortcut.register(isMac ? "Command+Alt+I" : "Ctrl+Shift+I", () => mainWindow.toggleDevTools());

    mainWindow.on("closed", () => mainWindow = null);
});

//STEP 10 Create a menu template. It is an array of objects.
const menu = [
    //Fix the MacOS issue with the menu not appearing right away. We can do it here of as we deed lower in the code.
    //Create the about section in the menu for the macOS.
    ...(isMac ? [{
        //app.name is returning the app name.
        label: app.name,
        submenu: [
            {
                label: "About",
                click: createAboutWindow
            }
        ]
    }]:[]),
    {
        //Instead of typing out the whole menu structure you can call menu templates
        role: "fileMenu",

        /* 
        label: "File",
         submenu: [
             {
                 label: "Quit",
                 //adding a shortcut to the menu. It is a menu shortcut. There are also global shortcuts. Now when the app window is opened if we press CTRL+W the window will close.
                 accelerator: isWin ? "Ctrl+W" : "Command+W",
                 //A shorthand notation for the above. And it is cross-platform
                 accelerator: "CmdOrCtrl+W",
                 click: () => app.quit(), 
             }           
        ]
        */
    },
    //Creating the About menu item for windows
    ...(!isMac ? [
        {
            label: "Help",
            submenu: [
                {
                    label: "About",
                    click: createAboutWindow,    
                }
            ]
        }
    ]:[]),

    //Add another menu item
    ...(isDev ? [
        {
            label: "Developer",
            submenu:[
                //Here we can type all the contents by hand or we can use the role. See the docs for all the role and types.
                {role: "reload"},
                {role: "forcereload"},
                {type: "separator"},
                {role: "toggledevtools"}
            ]
        }
    ] : [])
];

//Fix the MacOS issue with the menu not appearing right away. We can do it here or in the menu [] array.
//if(isMac){
    //role is a predefined menu item.
    //menu.unshift({role: "appMenu"});
//}

//STEP 14
//Catching the info from the image form (the renderer) send to the main process. The info can also be sent from the renderer to the main process.
ipcMain.on("image:minimize", (e, options) => {
    // Now we can use this data in the main process.

    //Adding a new field in the options object.
    options.dest = path.join(os.homedir(), "imageshrink");
    shrinkImage(options);   
});

//shrinkImage function.
//In the parameters we have destructured the options object. But we can as well use the options object directly and address its parameters as we go.
async function shrinkImage({imgPath, quality, dest}){
    //Since we use async await we it is a good idea to use try and catch here.
    try{
        //All this syntax is taken from the plugins documentation.
        //Considering that the quality is a number between 0 and 100 we need to change it to decimal in order to pass it to the imageminPngquant. Thus, we have to divide it by 100.
        const pngQuality = quality / 100;

        const files = await imagemin([slash(imgPath)], {
            destination: dest,
            plugins: [
                imageminMozjpeg({quality}),
                imageminPngquant({
                    quality: [pngQuality, pngQuality]
                })
            ]
        });

        //console.log(files);
        log.info(files);

        //open the folder where the image is saved.
        shell.openPath(dest);

        //Send a message from tha main process to the renderer.
        mainWindow.webContents.send("image:done");
    }catch(error){
        //console.log(error);
        log.error(error);
    }
}

app.on("window-all-closed", () => {
    if(!isMac){
        app.quit();
    }
});

app.on("activate", () => {
    if(BrowserWindow.getAllWindows().length === 0){
        //Name of the function we created above.
        createMainWindow();
    }
});