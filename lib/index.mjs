// tsc/path_finding.ts
import { parseVdf } from "@lexogrine/vdf-parser";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { enumerateValuesSafe, HKEY } from "registry-js";
var findLibraryFolders = (rootPath) => {
  const libraryFilePath = path.join(rootPath, "steamapps", "libraryfolders.vdf");
  if (!fs.existsSync(libraryFilePath)) {
    return [];
  }
  const libraryFileContent = fs.readFileSync(libraryFilePath, "utf-8");
  const vdfObject = parseVdf(libraryFileContent);
  if (vdfObject.success === false) {
    return { error: vdfObject.error };
  }
  const libraryFolders = vdfObject.content["libraryfolders"] || vdfObject.content["LibraryFolders"];
  if (!libraryFolders || typeof libraryFolders === "string") {
    return [];
  }
  const result = [];
  for (const id in libraryFolders) {
    const entry = libraryFolders[id];
    if (!entry || typeof entry === "string") {
      continue;
    }
    const path2 = entry.path;
    if (!path2 || typeof path2 !== "string") {
      continue;
    }
    const apps = entry.app;
    if (!apps || typeof apps === "string") {
      continue;
    }
    const appIds = [];
    for (const id2 in apps) {
      if (apps[id2] && typeof apps[id2] === "string") {
        appIds.push(id2);
      }
    }
    result.push({ path: path2, appIds });
  }
  return result;
};
var isValidRootPath = (rootPath) => {
  if (!fs.existsSync(path.join(rootPath, "steamapps", "libraryfolders.vdf"))) {
    return false;
  }
  if (!fs.existsSync(path.join(rootPath, "bin"))) {
    return false;
  }
  return true;
};
var findSteamRootPath = () => {
  const platform2 = os.platform();
  switch (platform2) {
    case "win32":
      const registryKeysToCheck = [{
        hive: HKEY.HKEY_LOCAL_MACHINE,
        key: "SOFTWARE\\WOW6432Node\\Valve\\Steam",
        name: "InstallPath"
      }, { hive: HKEY.HKEY_CURRENT_USER, key: "Software\\Valve\\Steam", name: "SteamPath" }];
      for (const key of registryKeysToCheck) {
        const keyValues = enumerateValuesSafe(key.hive, key.key);
        const value = keyValues.find((x) => x.name === key.name);
        if (value) {
          if (typeof value.data === "string" && isValidRootPath(value.data)) {
            return value.data;
          }
        }
      }
      break;
    case "linux":
      const linuxPathsToTest = [
        path.join("/snap", "steam", "common", ".local", "share", "Steam"),
        path.join(os.homedir(), ".steam", "steam"),
        path.join(os.homedir(), ".var", "app", "com.valvesoftware.Steam", ".local", "share", "Steam")
      ];
      for (const path2 of linuxPathsToTest) {
        if (fs.existsSync(path2) && isValidRootPath(path2)) {
          return path2;
        }
      }
      break;
    case "darwin":
      const darwinPathsToTest = [path.join(os.homedir(), "Application Support", "Steam")];
      for (const path2 of darwinPathsToTest) {
        if (fs.existsSync(path2) && isValidRootPath(path2)) {
          return path2;
        }
      }
      break;
    case "freebsd":
      const freeBsdPathsToTest = [path.join(os.homedir(), ".steam", "steam")];
      for (const path2 of freeBsdPathsToTest) {
        if (fs.existsSync(path2) && isValidRootPath(path2)) {
          return path2;
        }
      }
      break;
  }
};
var verifyAppInstalled = (appPath) => {
  if (fs.existsSync(appPath)) {
    return true;
  }
  return false;
};
var SteamInstallation = class {
  libraries;
  constructor(libraries) {
    this.libraries = libraries;
  }
  getLibraries() {
    return this.libraries.map((library) => ({
      path: library.path,
      appIds: Object.keys(library.apps)
    }));
  }
  getAppIds() {
    return this.libraries.reduce((list, current) => list.concat(Object.keys(current.apps)), []);
  }
  hasAppId(appId) {
    return !!this.getAppIds().find((x) => x === appId);
  }
  getInstallationPath(appId) {
    for (const library of this.libraries) {
      if (appId in library.apps) {
        const app = library.apps[appId];
        if (!app) {
          continue;
        }
        const path2 = app.path;
        if (!verifyAppInstalled(path2)) {
          continue;
        }
        return path2;
      }
    }
    return void 0;
  }
  getAppInfo(appId) {
    for (const library of this.libraries) {
      if (appId in library.apps) {
        const app = library.apps[appId];
        if (!app) {
          continue;
        }
        return app;
      }
    }
    return void 0;
  }
};
var loadAppsFromLibrary = (libraryPath, appIds) => {
  const apps = {};
  for (const appId of appIds) {
    const appManifestPath = path.join(libraryPath, "steamapps", `appmanifest_${appId}.acf`);
    if (!fs.existsSync(appManifestPath)) {
      continue;
    }
    const appManifestContent = fs.readFileSync(appManifestPath, "utf-8");
    const vdfObject = parseVdf(appManifestContent);
    if (vdfObject.success === false) {
      continue;
    }
    const appState = vdfObject.content["AppState"];
    if (!appState || typeof appState === "string") {
      continue;
    }
    const name = appState["name"];
    if (!name || typeof name !== "string") {
      continue;
    }
    const installDir = appState["installdir"];
    if (!installDir || typeof installDir !== "string") {
      continue;
    }
    const appObject = {
      name,
      path: path.join(libraryPath, "steamapps", "common", installDir)
    };
    const sizeOnDisk = appState["SizeOnDisk"];
    if (sizeOnDisk && typeof sizeOnDisk === "string") {
      appObject.sizeOnDisk = parseInt(sizeOnDisk, 10);
    }
    const lastOwnerId = appState["LastOwner"];
    if (lastOwnerId && typeof lastOwnerId === "string") {
      appObject.lastOwnerId = lastOwnerId;
    }
    apps[appId] = appObject;
  }
  return apps;
};
var getSteamInstallation = () => {
  const rootPath = findSteamRootPath();
  if (!rootPath) {
    return { error: "Can't find Steam Root path" };
  }
  const libraryFolders = findLibraryFolders(rootPath);
  if ("error" in libraryFolders) {
    return libraryFolders;
  }
  const loadedLibraries = [];
  for (const library of libraryFolders) {
    const apps = loadAppsFromLibrary(library.path, library.appIds);
    loadedLibraries.push({
      path: library.path,
      apps
    });
  }
  return new SteamInstallation(loadedLibraries);
};
export {
  findSteamRootPath,
  getSteamInstallation
};
