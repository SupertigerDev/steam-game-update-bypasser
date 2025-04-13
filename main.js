import { app, BrowserWindow, dialog, ipcMain } from "electron";
import path, { parse } from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import acfParser from "steam-acf2json";
import timers from "timers/promises";

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

    if (data.type === "revertRequest") {
      const path = data.path;
      const backupPath = `${path}.sgub-backup`;
      if (!await fs.stat(backupPath).catch(() => {})) {
        return false;
      }
      await fs.unlink(path).catch(() => {});
      await fs.rename(backupPath, path).catch(() => {});
      return true;
    }

    if (data.type === "retrieveManifests") {
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
            hasBackup: await fs.stat(`${data.path}/${manifestPath}.sgub-backup`).then(() => true).catch(() => false),
            parsed: acfParser.decode(manifest),
          };
        })
      );

      return manifests;
    }

  });

  ipcMain.on("send", async (event, data) => {
    if (data.type === "processRequest") {
      const {raw, parsed, path} = data.manifestData;

      const backupPath = `${path}.sgub-backup`;
      if (!await fs.stat(backupPath).catch(() => {})) {
        event.sender.send("send", {type: "processing", status: "Backing up manifest..."});
        const res = await fs.copyFile(path, backupPath).then(() => true).catch((err) => err);
        if (res !== true) {
          event.sender.send("send", {type: "processing", status: "Backing up manifest... Failed.", error: res?.message});
          fs.unlink(backupPath).catch(() => {});
          return;
        }  
      }

      event.sender.send("send", {type: "processing", status: "Fetching new data..."});
      const updates = await fetchUpdates(parsed.AppState.appid).catch((err) => err.message);
      if (typeof updates === "string") {
        event.sender.send("send", {type: "processing", status: "Fetching new data... Failed.", error: updates});
        return;
      }

      event.sender.send("send", {type: "processing", status: "Patching manifest..."});
      parsed.AppState.StateFlags = "4"
      parsed.AppState.buildid = updates.buildId;
      parsed.AppState.TargetBuildID = updates.buildId;
      parsed.AppState.ScheduledAutoUpdate = "0";


      const depotKeys = Object.keys(updates.depots);
        for (let i = 0; i < depotKeys.length; i++) {
          const depotKey = depotKeys[i];
          const depot = updates.depots[depotKey];
          const gid = depot.gid;
          const size = depot.size;
          parsed.AppState.InstalledDepots[depotKey] = {};
          parsed.AppState.InstalledDepots[depotKey].manifest = gid;
          parsed.AppState.InstalledDepots[depotKey].size = size;
        }


      try {
        const encoded = acfParser.encode(parsed);
        await fs.writeFile(path, encoded);
        // read only
        await fs.chmod(path, 0o444);
      } catch (err) {
        event.sender.send("send", {type: "processing", status: "Patching manifest... Failed.", error: err.message});
        return;
      }

      event.sender.send("send", {type: "processing", status: "Patching manifest... Done.", success: true});
    }
  });

  win.loadFile("public/index.html");

});



/**
 * 
 * @returns {Promise<{depots: Record<string, {size: number, gid: number}>, buildId: number}>}
 */
const fetchUpdates = async (appId) => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      webSecurity: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.loadURL(`https://steamdb.info/app/${appId}/history/`);
  
  const attemptFetch = async () => {

      const data = await win.webContents
        .executeJavaScript(
          `(() => {
      document.querySelector('.tab-pane#history')?.scrollIntoView()
  let s_buildId = null
  let s_depots = {}
  document.querySelectorAll('.tab-pane#history .app-history')?.forEach(e=> {
      const buildIdEl = [...e.querySelectorAll("i")].find(l => l.innerText.startsWith("buildid:"))
      
      const newBuildId = buildIdEl?.parentElement.getElementsByClassName("ins")[0]?.innerText;
  
      if (!s_buildId && newBuildId) {
          s_buildId = newBuildId.replace(" ", "");
      }
  
      const deportLabelEls = [...e.querySelectorAll("i")].filter(l => l.innerText.startsWith("Depot "))
      deportLabelEls.forEach((e) => {
          const id = e.getElementsByClassName("history-link")[0].innerText;
          const newSize = e.innerText.endsWith("size:") ? e.parentElement.getElementsByTagName("ins")[0]?.innerText : undefined;
          const gid =  e.innerText.endsWith("gid:") ? e.parentElement.getElementsByClassName("ins")[0]?.innerText : undefined;
          let currentDepot = s_depots[id] || {};
          if (!currentDepot.size && newSize) {
              currentDepot.size = newSize;
          }
          if (!currentDepot.gid && gid) {
              currentDepot.gid = gid.replace(" ", "");
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
        if (!data.buildId) {
          await timers.setTimeout(1000)
          return attemptFetch()
        }
        win.close();
        return data;
  }

  return attemptFetch()

}
