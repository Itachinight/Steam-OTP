import * as SteamUser from "steam-user";

export function getCookies(accountName: string, password: string, twoFactorCode: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
        const client: SteamUser = new SteamUser();
        const logOnOptions = {
            accountName,
            password,
            twoFactorCode,
            rememberPassword: true
        };

        client.logOn(logOnOptions);

        client.on("webSession", (sessionId: number, cookies: string[]) => resolve(cookies));
        client.on("error", (err: Error) => reject(err));
    })
}

// export function getCookiesKey(accountName: string, loginKey: string): Promise<string[]> {
//     return new Promise((resolve, reject) => {
//         const client = new SteamUser();
//         const logOnOptions = {
//             accountName,
//             loginKey,
//             rememberPassword: true,
//         };
//         client.logOn(logOnOptions);
//         client.on("loginKey", (key: string) => console.log(key));
//         client.on("webSession", (sessionId: number, cookies: string[]) => resolve(cookies));
//         client.on("error", (err: Error) => reject(err));
//     })
// }