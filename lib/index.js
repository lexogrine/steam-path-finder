"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// tsc/index.ts
var index_exports = {};
__export(index_exports, {
  findSteamRootPath: () => findSteamRootPath,
  getSteamInstallation: () => getSteamInstallation
});
module.exports = __toCommonJS(index_exports);

// tsc/path_finding.ts
var import_vdf_parser = require("@lexogrine/vdf-parser");
var fs = __toESM(require("fs"));
var os = __toESM(require("os"));
var path = __toESM(require("path"));
var import_registry_js = require("registry-js");
var findLibraryFolders = (rootPath) => {
  const libraryFilePath = path.join(rootPath, "steamapps", "libraryfolders.vdf");
  if (!fs.existsSync(libraryFilePath)) {
    return [];
  }
  const libraryFileContent = fs.readFileSync(libraryFilePath, "utf-8");
  const vdfObject = (0, import_vdf_parser.parseVdf)(libraryFileContent);
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
        hive: import_registry_js.HKEY.HKEY_LOCAL_MACHINE,
        key: "SOFTWARE\\WOW6432Node\\Valve\\Steam",
        name: "InstallPath"
      }, { hive: import_registry_js.HKEY.HKEY_CURRENT_USER, key: "Software\\Valve\\Steam", name: "SteamPath" }];
      for (const key of registryKeysToCheck) {
        const keyValues = (0, import_registry_js.enumerateValuesSafe)(key.hive, key.key);
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
    const vdfObject = (0, import_vdf_parser.parseVdf)(appManifestContent);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  findSteamRootPath,
  getSteamInstallation
});
