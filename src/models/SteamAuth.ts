import MaFile from "./MaFile";
import {Messages} from "../messages";

export default abstract class SteamAuth {
    protected readonly cookies: string;

    protected constructor (protected readonly maFile: MaFile) {
        if (!SteamAuth.verifyAccountFileData(maFile)) throw new Error(Messages.noAuthInfo);
        this.cookies = this.getCookies().join("; ");
    }

    protected static verifyAccountFileData(maFile: MaFile): boolean {
        const {SessionID, SteamLoginSecure, SteamID} = maFile.Session;
        return Boolean(SessionID && SteamLoginSecure && SteamID);
    }

    protected getCookies(): string[] {
        return [
            "mobileClient=android",
            "Steam_Language=english",
            `sessionid=${this.maFile.Session.SessionID}`,
            `steamLoginSecure=${this.maFile.Session.SteamLoginSecure}`,
        ];
    }

}