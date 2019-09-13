import fetch, {Response} from "node-fetch";
import SteamOtp from "../classes/SteamOtp";
import MaFile from "../models/MaFile";
import BigNumber from "bignumber.js";

export default class TradesController {
    private readonly maFile: MaFile;
    private readonly cookies: string;

    constructor(maFile: MaFile) {
        if (!TradesController.verifyAccountFileData(maFile)) throw new Error('NO COOKIES');
        this.maFile = maFile;
        this.cookies = this.getCookies().join("; ");
    }

    private static verifyAccountFileData(maFile: MaFile): boolean {
        const {SessionID, SteamLoginSecure, SteamID} = maFile.Session;
        return Boolean(SessionID && SteamLoginSecure && SteamID);
    }

    public async getTrades(): Promise<string> {
        const baseUrl: string = "https://steamcommunity.com/mobileconf/conf?";
        const qs: URLSearchParams = this.getQueryString('conf');
        const url: string = baseUrl + qs.toString();

        try {
            const result: Response = await this.sendRequest(url);

            return await result.text();
        } catch (err) {
            console.log(err);
            return "";
        }
    }

    public async getTradeDetails(tradeId: number): Promise<string> {
        const baseUrl: string = `https://steamcommunity.com/mobileconf/details/${tradeId}?`;
        const qs: URLSearchParams = this.getQueryString('details');
        const url: string = baseUrl + qs.toString();

        try {
            const result: Response = await this.sendRequest(url);
            const json: {success: boolean, html: string} = await result.json();

            return json.html;
        } catch (err) {
            console.log(err);
            return "";
        }
    }

    public async handleTrade(tag: "allow" | "cancel", id: number, key: string): Promise<boolean> {
        const baseUrl: string = "https://steamcommunity.com/mobileconf/ajaxop?";
        const qs: URLSearchParams = this.getQueryString(tag);

        qs.set('op', tag);
        qs.set("cid", String(id));
        qs.set('ck', key);

        const url: string = baseUrl + qs.toString();

        try {
            const result: Response = await this.sendRequest(url);
            const json: {success: boolean} = await result.json();

            return json.success;
        } catch (err) {
            console.log(err);
            return false;
        }
    }

    private getCookies(): string[] {
        const {SessionID, SteamLoginSecure} = this.maFile.Session;

        return [
            "mobileClient=android",
            "Steam_Language=english",
            `sessionid=${SessionID}`,
            `steamLoginSecure=${SteamLoginSecure}`,
        ];
    }

    private getQueryString(tag: string): URLSearchParams {
        const qs: URLSearchParams = new URLSearchParams();
        const time: number = Math.floor(Date.now() / 1000);
        const steamId = new BigNumber({...this.maFile.Session.SteamID, _isBigNumber: true});

        console.log(SteamOtp.getConfirmationKey(this.maFile.identity_secret, time, tag));

        qs.set("p", this.maFile.device_id);
        qs.set("a", steamId.toString(10));
        qs.set("t", String(time));
        qs.set("k", SteamOtp.getConfirmationKey(this.maFile.identity_secret, time, tag));
        qs.set("m", "android");
        qs.set("tag", tag);

        console.log(qs.toString());

        return qs;
    }

    private async sendRequest(url: string): Promise<Response> {
        return fetch(url, {
            method: "GET",
            headers: {
                Cookie: this.cookies
            }
        });
    }
}