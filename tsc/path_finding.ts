import { parseVdf, type VDFObject } from '@lexogrine/vdf-parser';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { enumerateValuesSafe, HKEY } from 'registry-js';

const findLibraryFolders = (rootPath: string): { path: string, appIds: string[] }[] | { error: string } => {
    const libraryFilePath = path.join(rootPath, "steamapps", "libraryfolders.vdf");

    if (!fs.existsSync(libraryFilePath)) {
        return [];
    }

    const libraryFileContent = fs.readFileSync(libraryFilePath, 'utf-8');
    const vdfObject = parseVdf(libraryFileContent);
    if (vdfObject.success === false) {
        return { error: vdfObject.error };
    }

    const libraryFolders = vdfObject.content['libraryfolders'] || vdfObject.content['LibraryFolders'];

    if (!libraryFolders || typeof libraryFolders === 'string') {
        return [];
    }

    const result = [];

    for (const id in libraryFolders) {
        const entry = libraryFolders[id];
        if (!entry || typeof entry === 'string') {
            continue;
        }

        const path = entry.path;

        if (!path || typeof path !== 'string') {
            continue;
        }

        const apps = entry.app;

        if (!apps || typeof apps === 'string') {
            continue;
        }

        const appIds = [];

        for (const id in apps) {
            if (apps[id] && typeof apps[id] === 'string') {
                appIds.push(id);
            }
        }

        result.push({ path, appIds });
    }

    return result;
}

const isValidRootPath = (rootPath: string): boolean => {
    if (!fs.existsSync(path.join(rootPath, 'steamapps', 'libraryfolders.vdf'))) {
        return false;
    }

    if (!fs.existsSync(path.join(rootPath, 'bin'))) {
        return false;
    }

    return true;
}

export const findSteamRootPath = (): string | undefined => {
    const platform = os.platform();

    switch (platform) {
        case 'win32':
            const registryKeysToCheck = [{
                hive: HKEY.HKEY_LOCAL_MACHINE, key: "SOFTWARE\\WOW6432Node\\Valve\\Steam", name: "InstallPath"
            }, { hive: HKEY.HKEY_CURRENT_USER, key: "Software\\Valve\\Steam", name: "SteamPath" }];

            for (const key of registryKeysToCheck) {
                const keyValues = enumerateValuesSafe(key.hive, key.key);
                const value = keyValues.find(x => x.name === key.name);

                if (value) {
                    if (typeof value.data === 'string' && isValidRootPath(value.data)) {
                        return value.data;
                    }
                }
            }
            break;

        case 'linux':
            const linuxPathsToTest = [path.join("/snap", "steam", "common", ".local", "share", "Steam"),
            path.join(os.homedir(), ".steam", "steam"),
            path.join(os.homedir(), ".var", "app", "com.valvesoftware.Steam", ".local", "share", "Steam")];

            for (const path of linuxPathsToTest) {
                if (fs.existsSync(path) && isValidRootPath(path)) {
                    return path;
                }
            }

            break;

        case 'darwin':
            const darwinPathsToTest = [path.join(os.homedir(), "Application Support", "Steam")];

            for (const path of darwinPathsToTest) {
                if (fs.existsSync(path) && isValidRootPath(path)) {
                    return path;
                }
            }

            break;

        case 'freebsd':
            const freeBsdPathsToTest = [path.join(os.homedir(), ".steam", "steam")];

            for (const path of freeBsdPathsToTest) {
                if (fs.existsSync(path) && isValidRootPath(path)) {
                    return path;
                }
            }

            break;
    }
}

const verifyAppInstalled = (appPath: string): boolean => {
    if (fs.existsSync(appPath)) {
        return true;
    }

    return false;
}

type AppInfo = {
    name: string,
    path: string,
    sizeOnDisk?: number,
    lastOwnerId?: string,
    rawVdf?: VDFObject
};

export class SteamInstallation {
    libraries: {
        path: string,
        apps: {
            [appId: string]: AppInfo
        }
    }[];

    constructor(libraries: { path: string, apps: { [appId: string]: AppInfo } }[]) {
        this.libraries = libraries;
    }

    getLibraries(): { path: string, appIds: string[] }[] {
        return this.libraries.map(library => ({
            path: library.path,
            appIds: Object.keys(library.apps)
        }));
    };

    getAppIds(): string[] {
        return this.libraries.reduce((list, current) => list.concat(Object.keys(current.apps)), [] as string[])
    }

    hasAppId(appId: string): boolean {
        return !!this.getAppIds().find(x => x === appId);
    }

    getInstallationPath(appId: string): string | undefined {
        for (const library of this.libraries) {
            if (appId in library.apps) {
                const app = library.apps[appId];
                if (!app) {
                    continue;
                }
                const path = app.path;
                if (!verifyAppInstalled(path)) {
                    continue;
                }
                return path;
            }
        }

        return undefined;
    }

    getAppInfo(appId: string): AppInfo | undefined {
        for (const library of this.libraries) {
            if (appId in library.apps) {
                const app = library.apps[appId];
                if (!app) {
                    continue;
                }
                return app;
            }
        }

        return undefined;
    }
};

const loadAppsFromLibrary = (libraryPath: string, appIds: string[]): { [appId: string]: { name: string, path: string } } => {
    const apps: { [appId: string]: { name: string, path: string } } = {};

    for (const appId of appIds) {
        const appManifestPath = path.join(libraryPath, "steamapps", `appmanifest_${appId}.acf`);

        if (!fs.existsSync(appManifestPath)) {
            continue;
        }

        const appManifestContent = fs.readFileSync(appManifestPath, 'utf-8');
        const vdfObject = parseVdf(appManifestContent);

        if (vdfObject.success === false) {
            continue;
        }

        const appState = vdfObject.content['AppState'];

        if (!appState || typeof appState === 'string') {
            continue;
        }

        const name = appState['name'];

        if (!name || typeof name !== 'string') {
            continue;
        }

        const installDir = appState['installdir'];

        if (!installDir || typeof installDir !== 'string') {
            continue;
        }

        const appObject: AppInfo = {
            name,
            path: path.join(libraryPath, "steamapps", "common", installDir)
        }

        const sizeOnDisk = appState['SizeOnDisk'];
        if (sizeOnDisk && typeof sizeOnDisk === 'string') {
            appObject.sizeOnDisk = parseInt(sizeOnDisk, 10);
        }

        const lastOwnerId = appState['LastOwner'];
        if (lastOwnerId && typeof lastOwnerId === 'string') {
            appObject.lastOwnerId = lastOwnerId;
        }

        apps[appId] = appObject;
    }
    return apps;
}

export const getSteamInstallation = (): SteamInstallation | { error: string } => {
    const rootPath = findSteamRootPath();

    if (!rootPath) {
        return { error: "Can't find Steam Root path" };
    }

    const libraryFolders = findLibraryFolders(rootPath);

    if ('error' in libraryFolders) {
        return libraryFolders;
    }

    const loadedLibraries: { path: string, apps: { [appId: string]: AppInfo } }[] = [];

    for (const library of libraryFolders) {
        const apps = loadAppsFromLibrary(library.path, library.appIds);
        loadedLibraries.push({
            path: library.path,
            apps
        });
    }

    return new SteamInstallation(loadedLibraries);
}
