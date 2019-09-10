import fetch from 'node-fetch';
import {RequestInit, RequestInfo, Response} from "node-fetch";
import {AbortSignal} from "node-fetch/externals";

export default class SteamTimeAligner {
    controller: AbortController;
    url: RequestInfo;
    params: RequestInit;

    constructor() {
        this.controller = new AbortController();
        // @ts-ignore
        const signal: AbortSignal = this.controller.signal;
        this.url = "https://api.steampowered.com/ITwoFactorService/QueryTime/v1/";
        this.params = {
            signal,
            method: 'POST',
            headers: {
                'Content-Length': '0'
            },
        };
    }

    async getTime(): Promise<number> {
        setTimeout(() => this.controller.abort(), 2000);

        const res: Response = await fetch(this.url, this.params);
        const json: SteamResponse = await res.json();

        return parseInt(json.response.server_time, 10);
    }

    async getOffset(): Promise<number> {
        try {
            const time: number = await this.getTime();
            return time - Math.round(Date.now() / 1000);
        } catch (err) {
            console.error(err.message);
            return 0;
        }
    }
}