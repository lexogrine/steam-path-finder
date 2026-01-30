import { VDFObject } from '@lexogrine/vdf-parser';

declare const findSteamRootPath: () => string | undefined;
type AppInfo = {
    name: string;
    path: string;
    sizeOnDisk?: number;
    lastOwnerId?: string;
    rawVdf?: VDFObject;
};
declare class SteamInstallation {
    libraries: {
        path: string;
        apps: {
            [appId: string]: AppInfo;
        };
    }[];
    constructor(libraries: {
        path: string;
        apps: {
            [appId: string]: AppInfo;
        };
    }[]);
    getLibraries(): {
        path: string;
        appIds: string[];
    }[];
    getAppIds(): string[];
    hasAppId(appId: string): boolean;
    getInstallationPath(appId: string): string | undefined;
    getAppInfo(appId: string): AppInfo | undefined;
}
declare const getSteamInstallation: () => SteamInstallation | {
    error: string;
};

export { SteamInstallation, findSteamRootPath, getSteamInstallation };
