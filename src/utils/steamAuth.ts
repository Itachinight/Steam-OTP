import {SteamCookies} from "../types";
import BigNumber from "bignumber.js";

// export function getCookies(accountName: string, password: string, twoFactorCode: string): Promise<string[]> {
//     return new Promise((resolve, reject) => {
//         const client: SteamUser = new SteamUser();
//         const logOnOptions = {
//             accountName,
//             password,
//             twoFactorCode,
//             rememberPassword: true
//         };
//
//         client.logOn(logOnOptions);
//
//         client.on("webSession", (sessionId: number, cookies: string[]) => resolve(cookies));
//         client.on("error", (err: Error) => reject(err));
//     })
// }

export function getCookies(accountName: string, password: string, twoFactorCode: string): Promise<SteamCookies> {
    return new Promise((resolve, reject) => {
        const SteamCommunity = require("steamcommunity");
        let community = new SteamCommunity();
        const options = {
            accountName,
            password,
            twoFactorCode
        };
        community.login(options, (err: Error, SessionID: string, cookies: string[], steamGuard: string|null, OAuthToken?: string) => {
            if (err) reject(err);

            const secureCookiePair: string = cookies.filter((elem: string) => /^steamLoginSecure/i.test(elem))[0];
            const SteamLoginSecure: string = secureCookiePair.split('=', 2)[1];
            const SteamID: BigNumber = new BigNumber(SteamLoginSecure.split('%7C%7C', 2)[0]);

            resolve({SessionID, SteamLoginSecure, OAuthToken, SteamID});
        });
    })
}