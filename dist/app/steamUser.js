"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SteamUser = require("steam-user");
async function loginUser(logOnOptions) {
    const client = new SteamUser();
    console.log('here');
    client.logOn(logOnOptions);
    client.on('loggedOn', () => {
        console.log(`Logged into Steam ${logOnOptions.accountName}`);
        console.log(client);
    });
    client.on('error', function (e) {
        // Some error occurred during logon
        console.log(e);
    });
}
exports.loginUser = loginUser;
