/**
 * @typedef {{
 *   path: string
 *   raw: string
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
export const retriveManifests = async (path) => {
  return electronAPI.invoke({
    type: "retriveManifests",
    path,
  });
};
