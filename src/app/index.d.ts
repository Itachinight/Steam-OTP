import {ParsedPath} from "path";
import BigNumber from "bignumber.js";

export interface WebKitFile extends File {
    path: string;
}

export interface WebKitDataTransfer {
    files?: WebKitFile[];
}

export interface WebKitDragEvent extends MouseEvent {
    readonly dataTransfer?: WebKitDataTransfer;
}

export interface AccountAuthData extends AccountFileData {
    code: string
}

export interface AccountFileData {
    shared_secret: string,
    account_name?: string,
    device_id?: string,
    identity_secret?: string,
    Session?: {
        SessionID: string,
        SteamLogin: string,
        SteamLoginSecure: string,
        SteamID: BigNumber | string,
    }
}

export interface FullFilePath extends ParsedPath {
    fullPath?: string
}

export interface AuthInfo {
    cookies: string[],
    SteamID: string
}

export interface SteamResponse {
    response: {
        server_time: string,
    }
}

export interface AsyncFilterCallback {
    (item: any): Promise<boolean>;
}

export interface AsyncForEachCallback {
    (currentValue: any, index?: number, array?: any[]): Promise<void>
}
