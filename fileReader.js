const fs = require('fs');
const util = require('util');
const path = require('path');
const readFile = util.promisify(fs.readFile);
const SteamOtp = require('./steamOtp');

async function getDataFromDb(content, accountName) {
    let { shared_secret, identity_secret, device_id } = JSON.parse(content)._MobileAuthenticator;
    return {
        account_name: accountName,
        device_id,
        identity_secret,
        shared_secret,
    };
}

async function getDataFromMafile(content) {
    let { account_name, shared_secret, identity_secret, device_id } = JSON.parse(content);
    return {
        account_name,
        device_id,
        identity_secret,
        shared_secret,
    };
}

async function getLoginFromJson(filePath) {
    let { dir, name } = filePath;
    let fullPath = path.format({
        dir,
        name,
        ext: '.json'
    });

    try {
        let fileContent = await readFile(fullPath, 'UTF-8');
        return JSON.parse(fileContent).SteamLogin;
    } catch {
        return '';
    }
}

async function getSteam2FaFields(filePath) {
    filePath.ext = filePath.ext.toLowerCase();
    if (filePath.ext === '.db' || filePath.ext === '.mafile') {
        const fullPath = path.join(filePath.dir, filePath.base);
        const fileContent = await readFile(fullPath, 'UTF-8');

        if (filePath.ext === '.db') {
            let login = await getLoginFromJson(filePath);
            return await getDataFromDb(fileContent, login);
        } else if (filePath.ext === '.mafile') {
            return await getDataFromMafile(fileContent);
        }

    } else throw new TypeError();
}

exports.getDataFromFile = async filePath => {
    let accData;

    try {
        accData = await getSteam2FaFields(filePath);
    } catch (err) {
        if (err instanceof SyntaxError) {
            throw new Error(`${filePath.base} is not valid JSON`);
        } else if (err instanceof TypeError) {
            throw new Error(`${filePath.base} is not maFile/db`);
        } else throw err;
    }

    if (!SteamOtp.isSecretValid(accData.shared_secret)) {
        throw new Error(`${filePath.base} doesn't contain valid shared secret`);
    }

    return accData;
};