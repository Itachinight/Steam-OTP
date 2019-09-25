import fetch from 'node-fetch';
import {RequestInit, Response} from "node-fetch";
import {AbortSignal} from "node-fetch/externals";


export default abstract class SteamTimeAligner {

    static url: string = "https://api.steampowered.com/ITwoFactorService/QueryTime/v1/";
    static params: RequestInit = {
        method: "POST",
        headers: {"Content-Length": "0"}
    };

    private static async getSteamTime(): Promise<number> {
        const controller: AbortController = new AbortController();
        const signal: AbortSignal = <AbortSignal> controller.signal;

        setTimeout(() => controller.abort(), 2000);

        const res: Response = await fetch(SteamTimeAligner.url, {...SteamTimeAligner.params, signal});
        const json: SteamResponse = await res.json();

        return Number.parseInt(json.response.server_time, 10);
    }

    public static async getOffset(): Promise<number> {
        try {
            const steamTime: number = await SteamTimeAligner.getSteamTime();
            return steamTime - Date.timestamp();
        } catch (err) {
            console.error(err.message);
            return 0;
        }
    }
}