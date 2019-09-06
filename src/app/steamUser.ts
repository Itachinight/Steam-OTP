import SteamUser = require("steam-user");
import {AccountAuthData, AuthInfo} from "./index";
import SteamOtp from "./SteamOtp";
const SteamCommunity = require('steamcommunity');
const TradeOfferManager = require('steam-tradeoffer-manager');

export function loginUser(logOnOptions: {accountName: string, password: string, authData: AccountAuthData}) {
    const {accountName, password, authData} = logOnOptions;
    const {code: twoFactorCode, identity_secret} = authData;
    const client = new SteamUser();
    const community = new SteamCommunity();
    const manager = new TradeOfferManager({
        steam: client,
        community: community,
        language: 'en'
    });

    client.logOn({accountName, password, twoFactorCode});

    client.on('loggedOn', () => {
        console.log(`Logged into Steam ${accountName}`);
        console.log(client);
    });

    client.on('webSession', (sessionId, cookies) => {
        manager.setCookies(cookies);
        community.setCookies(cookies);

        const time = Math.floor(Date.now() / 1000);
        const confKey = SteamOtp.getConfirmationKey(identity_secret, time,'conf');
        console.log(cookies);

        community.getConfirmations(time, confKey, (error, confirmations) => {
            console.log(confirmations);
            //community.acceptConfirmationForObject(identity_secret, confirmations[0].offerID, () => console.log('yes'));
        });
    });

    client.on('error', function(e) {
        console.log(e);
    });
}

export function getSteamAuthInfo(logOnOptions: {accountName: string, password: string, authData: AccountAuthData}): Promise<AuthInfo> {
    return new Promise((resolve, reject) => {
        const client = new SteamUser();
        const {accountName, password, authData} = logOnOptions;
        const {code: twoFactorCode} = authData;

        client.logOn({accountName, password, twoFactorCode});

        client.on('webSession', (sessionId: number, cookies: string[]) => {
            const SteamID: string = client.steamID.getSteamID64();
            resolve({cookies, SteamID})
        });
        client.on('error', err => reject(err));
        
    })
}