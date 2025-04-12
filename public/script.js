import { openFolderDialog, retriveManifests } from "./api.js";

const browseFolderBtn = document.getElementById("browseFolderBtn");
const browseFolderInput = document.getElementById("browseFolderInput");
const manifestListElement = document.getElementById("manifestList");

/**
 * @type {import("./api").Manifest[]}
 */
let manifests = [];

const updateManifestList = () => {
  manifestListElement.innerHTML = "";
  let innerHtml = "";
  manifests.forEach((manifest) => {
    console.log(manifest);
    innerHtml += `<div class="manifest-item">
      <img src="https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${manifest.parsed.AppState.appid}/header.jpg"></img>
      <div class="details">
        <div>${manifest.parsed.AppState.name}</div>
      </div>
    </div>`;
  });
  manifestListElement.innerHTML = innerHtml;
};

const onBrowseFolderInput = async () => {
  const path = browseFolderInput.value;
  localStorage.setItem("input", path);
  const res = await retriveManifests(path);
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
