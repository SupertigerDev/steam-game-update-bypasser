import { app, BrowserWindow, dialog, ipcMain } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import acfParser from "steam-acf2json";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AppManifestRegex = /^appmanifest_(\d+)\.acf$/;

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    autoHideMenuBar: true,
    webPreferences: {
      webSecurity: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  ipcMain.handle("invoke", async (event, data) => {
    if (data.type === "openFolderDialog") {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ["openDirectory"],
      });
      return canceled ? null : filePaths?.[0];
    }

    if (data.type === "retriveManifests") {
      const steamAppsDir = await fs.readdir(data.path);
      const manifestPaths = steamAppsDir.filter((file) =>
        AppManifestRegex.test(file)
      );

      const manifests = await Promise.all(
        manifestPaths.map(async (manifestPath) => {
          const manifest = await fs.readFile(
            path.join(data.path, manifestPath),
            "utf-8"
          );
          return {
            path: path.join(data.path, manifestPath),
            raw: manifest,
            parsed: acfParser.decode(manifest),
          };
        })
      );

      return manifests;
    }
  });

  ipcMain.on("send", (event, data) => {});

  win.loadURL("https://steamdb.info/app/2357570/history/");

  setInterval(() => {
    win.webContents
      .executeJavaScript(
        `(() => {
    
let s_buildId = null
let s_depots = {}
document.querySelectorAll('.tab-pane#history .app-history').forEach(e=> {
    const buildIdEl = [...e.querySelectorAll("i")].find(l => l.innerText.startsWith("buildid:"))
    
    const newBuildId = buildIdEl?.parentElement.getElementsByClassName("ins")[0]?.innerText;

    if (!s_buildId && newBuildId) {
        s_buildId = JSON.parse(newBuildId.replace(" ", ""));
    }

    const deportLabelEls = [...e.querySelectorAll("i")].filter(l => l.innerText.startsWith("Depot "))
    deportLabelEls.forEach((e) => {
        const id = e.getElementsByClassName("history-link")[0].innerText;
        const newSize = e.parentElement.getElementsByTagName("ins")[0]?.innerText;
        const gid = e.parentElement.getElementsByClassName("ins")[0]?.innerText;
        let currentDepot = s_depots[id] || {};
        if (!currentDepot.size && newSize) {
            currentDepot.size = JSON.parse(newSize);
        }
        if (!currentDepot.gid && gid) {
            currentDepot.gid = JSON.parse(gid.replace(" ", ""));
        }
        s_depots[id] = currentDepot
    })
})
    return {
        depots: s_depots,
        buildId: s_buildId
    }
})()`
      )
      .then(console.log);
  }, 1000);
});
