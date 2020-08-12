//app表示当前electron，BrowserWindow为开启的窗口，ipcMain与子线程通信，Menu与MenuItem注册快捷键
const { app, BrowserWindow, ipcMain, Menu, MenuItem } = require('electron')
const path = require('path');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    height: 563,
    useContentSize: true,
    width: 800,
    minWidth: 800,
    minHeight: 563,
    webPreferences: {
      nodeIntegration: true
    }
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, '../index.html'));

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
  
  //使用webContents的did-finish-load事件来达到启动时加载功能
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.send('main-window-ready')
  })

  // 绑定菜单，注册快捷键
  const menu = new Menu()
  menu.append(new MenuItem({
    label: '载文',
    accelerator: 'F4',
    click: () => {
      console.log('载文') 
      mainWindow.send('zaiwen')
    }
  }))
  menu.append(new MenuItem({
    label: '发文',
    accelerator: 'F6',
    click: () => {
      console.log('发文') 
      mainWindow.send('fawen')
    }
  }))
  Menu.setApplicationMenu(menu)
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  //TODO 记录成绩持久化数据库
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.