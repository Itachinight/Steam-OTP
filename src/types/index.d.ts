import {ParsedPath} from "path";
import MaFile from "../models/MaFile";
import BigNumber from "bignumber.js";

interface FullFilePath extends ParsedPath {
    fullPath?: string
}

interface AccountAuthData {
    maFile: MaFile
    code: string
}

interface Session {
    SteamLogin?: string
    WebCookie?: string
    SessionID?: string
    SteamLoginSecure?: string
    OAuthToken?: string
    SteamID: BigNumber
}