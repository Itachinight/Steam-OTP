import {AccountFileData} from "./index";
import fetch, {Response} from "node-fetch";
import SteamOtp from "./SteamOtp";

export default class SteamTradeConf {
    private readonly accountFileData: AccountFileData;
    private readonly cookies: string;

    constructor(authInfo: AccountFileData) {
        if (!SteamTradeConf.verifyAccountFileData(authInfo)) throw new Error('NO COOKIES');
        this.accountFileData = authInfo;
        this.cookies = this.getCookies().join("; ");
    }

    private static verifyAccountFileData(accountFileData: AccountFileData): boolean {
        const {SessionID, SteamLogin, SteamLoginSecure, SteamID} = accountFileData.Session;
        return Boolean(SessionID && SteamLogin && SteamLoginSecure && SteamID);
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
        }
    }

    public async handleTrade(tag: string, id: number, key: string): Promise<boolean> {
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
        }
    }

    private getCookies(): string[] {
        const {SessionID, SteamLogin, SteamLoginSecure} = this.accountFileData.Session;

        return [
            "mobileClient=android;",
            "Steam_Language=english;",
            `sessionid=${SessionID}`,
            `steamLogin=${SteamLogin}`,
            `steamLoginSecure=${SteamLoginSecure}`,
        ];
    }

    private getQueryString(tag: string): URLSearchParams {
        const qs: URLSearchParams = new URLSearchParams();
        const time: number = Math.floor(Date.now() / 1000);

        qs.set("p", this.accountFileData.device_id);
        qs.set("a", <string> this.accountFileData.Session.SteamID);
        qs.set("t", String(time));
        qs.set("k", SteamOtp.getConfirmationKey(this.accountFileData.identity_secret, time, tag));
        qs.set("m", "android");
        qs.set("tag", tag);

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