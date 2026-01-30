# steam-path-finder

### Lightweight Steam Path Finder

This is a library to find the Steam installation path and read the `libraryfolders.vdf` file to get the paths and basic info of installed Steam applications.

### Supports:
 - Windows (by registry)
 - Linux (most package managers, flatpack, snap)
 - FreeBSD 
 - macOS (default path)

### Installation
```bash
npm install steam-path-finder
```

### Usage
```typescript
import { findSteamRootPath, getSteamInstallation } from 'steam-path-finder';

const steamPath = await findSteamRootPath();
console.log(`Steam is installed at: ${steamPath}`);
const installation = await getSteamInstallation();
const installedApps = installation.getAppIds();
console.log('Installed Steam Apps:', installedApps);
const CS2Info = installation.getAppInfo('730');
console.log(`CS2 is installed at: ${CS2Info?.path}`);
```

### API
- `findSteamRootPath(): Promise<string | undefined>` - Returns a promise that resolves to the Steam installation path or `undefined` if not found.
- `getSteamInstallation(): Promise<SteamInstallation | { error: string }>` - Returns a promise that resolves to an instance of `SteamInstallation` which can be used to get library paths and installed apps, or an error object.
- `SteamInstallation.getLibraryPaths(): string[]` - Returns an array of all Steam library paths.
- `SteamInstallation.getAppIds(): string[]` - Returns an array of installed app IDs.
- `SteamInstallation.getInstallationPath(appId: string): string | undefined` - Returns the installation path for a specific app ID or `undefined` if not installed.
- `SteamInstallation.getAppInfo(appId: string): AppInfo | undefined` - Returns detailed information about a specific app ID or `undefined` if not installed.


### License
This project is licensed under the MIT License.


### Maintainers
This project is maintained by [Lexogrine](https://lexogrine.com) ([LHM.gg](https://lhm.gg)).