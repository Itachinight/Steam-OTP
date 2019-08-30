import SteamUser = require("steam-user");

export async function loginUser(logOnOptions: {accountName: string, password: string, twoFactorCode: string}) {
    const client = new SteamUser();

    console.log('here');

    client.logOn(logOnOptions);

    client.on('loggedOn', () => {
        console.log(`Logged into Steam ${logOnOptions.accountName}`);
        console.log(client);
    });

    client.on('error', function(e) {
        // Some error occurred during logon
        console.log(e);
    });
}