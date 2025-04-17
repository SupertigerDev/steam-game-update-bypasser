import { on, openFolderDialog, processRequest, retrieveManifests, revertRequest } from "./api.js";

const browseFolderBtn = document.getElementById("browseFolderBtn");
const browseFolderInput = document.getElementById("browseFolderInput");
const manifestListElement = document.getElementById("manifestList");

const dialog = document.getElementById("dialog");
const dialogContent = document.querySelector("#dialog #content");

/**
 * @type {import("./api").Manifest[]}
 */
let manifests = [];

const updateManifestList = () => {
  manifestListElement.innerHTML = "";
  let innerHtml = "";
  manifests.forEach((manifest) => {
    innerHtml += `<div class="manifest-item" id="manifest-${manifest.parsed.AppState.appid}">
      <img src="https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${manifest.parsed.AppState.appid}/header.jpg"></img>
      <div class="details">
        <div>${manifest.parsed.AppState.name}</div>
        ${manifest.hasBackup ? `<div class="revert">Click To Revert</div>` : ""}
        
      </div>
    </div>`;
  });
  manifestListElement.innerHTML = innerHtml;
};

const onBrowseFolderInput = async () => {
  const path = browseFolderInput.value;
  localStorage.setItem("input", path);
  const res = await retrieveManifests(path);
  manifests = res;
  updateManifestList();
};
const loadInputFromLocalStorage = () => {
  const input = localStorage.getItem("input");
  if (!input) return;
  browseFolderInput.value = input;
  onBrowseFolderInput();
};

loadInputFromLocalStorage();

browseFolderBtn.addEventListener("click", async () => {
  const path = await openFolderDialog();
  if (!path) return;
  browseFolderInput.value = path;
  onBrowseFolderInput();
});

browseFolderInput.addEventListener("input", onBrowseFolderInput);


manifestListElement.addEventListener("click", (e) => {
  const item = e.target.closest(".manifest-item");
  if (item) {
    const manifestId = item.id.split("-")[1];

    if (e.target.closest(".revert")) {
      showRevertConfirmDialog(manifestId);
      return;
    }


    showConfirmDialog(manifestId);
  }
})

window.closeDialog = () => {
  dialog.style.display = "none";
}


window.revertManifest = (manifestId) => {
  window.closeDialog();
  const manifest = manifests.find((m) => m.parsed.AppState.appid === manifestId);

  revertRequest(manifest.path).then(() => {
    onBrowseFolderInput();
  })
}
const showRevertConfirmDialog = (manifestId) => {
  const manifest = manifests.find((m) => m.parsed.AppState.appid === manifestId);
  dialogContent.innerHTML = `
  <div class="title">Confirm Revert?</div>
  <div class="manifest-item" id="manifest-${manifest.parsed.AppState.appid}">
    <img src="https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${manifest.parsed.AppState.appid}/header.jpg"></img>
    <div class="details">
      <div>${manifest.parsed.AppState.name}</div>
    </div>
  </div>
  <div class="warn">Make sure Steam is fully closed.</div>
  <div class="buttons">
    <button onClick="closeDialog()" class="alert">Cancel</button>
    <button onClick="revertManifest('${manifestId}')">Revert</button>
  </div>
  `;
  dialog.style.display = "flex";
}
const showConfirmDialog = (manifestId) => {
  const manifest = manifests.find((m) => m.parsed.AppState.appid === manifestId);
  dialogContent.innerHTML = `
  <div class="title">Confirm this game?</div>
  <div class="manifest-item" id="manifest-${manifest.parsed.AppState.appid}">
    <img src="https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${manifest.parsed.AppState.appid}/header.jpg"></img>
    <div class="details">
      <div>${manifest.parsed.AppState.name}</div>
    </div>
  </div>
  <div class="warn">Make sure Steam is fully closed.</div>
  <div class="buttons">
    <button onClick="closeDialog()" class="alert">Cancel</button>
    <button onClick="showConfirmedDialog('${manifestId}')">Confirm</button>
  </div>
  `;
  dialog.style.display = "flex";
}

window.showConfirmedDialog = (manifestId) => {
  const manifest = manifests.find((m) => m.parsed.AppState.appid === manifestId);
  dialogContent.innerHTML = `
  <div id="processing-title" class="title">Processing...</div>
  <div class="manifest-item" id="manifest-${manifest.parsed.AppState.appid}">
    <img src="https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${manifest.parsed.AppState.appid}/header.jpg"></img>
    <div class="details">
      <div>${manifest.parsed.AppState.name}</div>
    </div>
  </div>

  `;
  dialog.style.display = "flex";
  processRequest(manifest)

}


on((event, data) => {
  if (data.type === "processing") {
    const processingTitle = document.getElementById("processing-title");
    const status = data.status;
    processingTitle.innerHTML = `Processing... <span>(${status})</span>`;
    if (data.error) {
      console.log(data.error)
    }
    if (data.success) {
      onBrowseFolderInput();
      window.closeDialog();
    }
  }
})