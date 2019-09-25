import MaFile from "./MaFile";
import fetch, {Response} from "node-fetch";
import BigNumber from "bignumber.js";
import SteamOtp from "../classes/SteamOtp";
import {Messages} from "../messages";
import SteamAuth from "./SteamAuth";

export default class SteamTrades extends SteamAuth {

    private static baseUrl = "https://steamcommunity.com/mobileconf/";

    constructor (maFile: MaFile) {
        super(maFile);
    }

    public async getTrades(): Promise<string> {
        const url: string = SteamTrades.baseUrl + "conf?" + this.getQueryString("conf").toString();
        const result: Response = await this.sendRequest(url);

        return await result.text();
    }

    public async getTradeDetails(tradeId: number): Promise<string> {
        const url: string = SteamTrades.baseUrl + `details/${tradeId}?` + this.getQueryString("details").toString();
        const result: Response = await this.sendRequest(url);
        const {success, html} = await result.json();

        if (!success) throw new Error(Messages.tradeFetchErr);

        return html;
    }

    public async handleTrade(tag: "allow" | "cancel", id: number, key: string): Promise<boolean> {
        const qs: URLSearchParams = this.getQueryString(tag);
        qs.set("op", tag);
        qs.set("cid", String(id));
        qs.set("ck", key);

        const url: string = SteamTrades.baseUrl + "ajaxop?" + qs.toString();
        const result: Response = await this.sendRequest(url);
        const {success} = await result.json();

        if (!success) throw new Error(Messages.tradeFetchErr);

        return success;
    }

    private getQueryString(tag: string): URLSearchParams {
        const qs: URLSearchParams = new URLSearchParams();
        const time: number = Date.timestamp();
        const steamId: BigNumber = new BigNumber({...this.maFile.Session.SteamID, _isBigNumber: true});

        qs.set("p", this.maFile.device_id);
        qs.set("a", steamId.toString(10));
        qs.set("t", String(time));
        qs.set("k", SteamOtp.getConfirmationKey(this.maFile.identity_secret, time, tag));
        qs.set("m", "android");
        qs.set("tag", tag);

        return qs;
    }

    private async sendRequest(url: string): Promise<Response> {
        try {
            return await fetch(url, {
                method: "GET",
                headers: {
                    Cookie: this.cookies
                }
            });
        } catch {
            throw new Error(Messages.tradeFetchErr);
        }

    }
}