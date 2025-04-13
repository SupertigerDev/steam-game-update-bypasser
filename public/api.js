/**
 * @typedef {{
 *   path: string
 *   raw: string
 *   hasBackup: boolean
 *   parsed: object
 * }} Manifest
 */

/**
 * @param {string} path
 * @returns {Promise<string>}
 */
export const openFile = async (path) => {
  return electronAPI.invoke({ type: "openFile", path });
};

export const openFolderDialog = async () => {
  return electronAPI.invoke({ type: "openFolderDialog" });
};

/**
 * @param {string} path
 * @returns {Promise<Manifest[]>}
 */
export const retrieveManifests = async (path) => {
  return electronAPI.invoke({
    type: "retrieveManifests",
    path,
  });
};



export const processRequest = async (manifestData) => {
  return electronAPI.send({
    type: "processRequest",
    manifestData,
  });
};
export const revertRequest = async (path) => {
  return electronAPI.invoke({
    type: "revertRequest",
    path
  });
};


export const on = (opts) => electronAPI.on(opts);