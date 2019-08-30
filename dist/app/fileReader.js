"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const util = require("util");
const path = require("path");
const SteamOtp_1 = require("./SteamOtp");
const readFile = util.promisify(fs.readFile);
async function getDataFromDb(content, accountName = '') {
    const { shared_secret, identity_secret, device_id } = JSON.parse(content)._MobileAuthenticator;
    return {
        account_name: accountName,
        device_id,
        identity_secret,
        shared_secret,
    };
}
async function getDataFromMaFile(content) {
    return JSON.parse(content);
}
async function getLoginFromJson(filePath) {
    const { dir, name } = filePath;
    const fullPath = path.format({
        dir,
        name,
        ext: '.json'
    });
    try {
        const fileContent = await readFile(fullPath, 'UTF-8');
        return JSON.parse(fileContent).SteamLogin;
    }
    catch (_a) {
        return '';
    }
}
async function getSteam2FaFields(filePath) {
    filePath.ext = filePath.ext.toLowerCase();
    if (filePath.ext === '.db' || filePath.ext === '.mafile') {
        const fullPath = path.join(filePath.dir, filePath.base);
        const fileContent = await readFile(fullPath, 'UTF-8');
        if (filePath.ext === '.db') {
            const login = await getLoginFromJson(filePath);
            return await getDataFromDb(fileContent, login);
        }
        else if (filePath.ext === '.mafile') {
            return await getDataFromMaFile(fileContent);
        }
    }
    else
        throw new TypeError();
}
async function getDataFromFile(filePath) {
    let accData;
    try {
        accData = await getSteam2FaFields(filePath);
    }
    catch (err) {
        if (err instanceof SyntaxError) {
            throw new Error(`${filePath.base} is not valid JSON`);
        }
        else if (err instanceof TypeError) {
            throw new Error(`${filePath.base} is not maFile/db`);
        }
        else
            throw err;
    }
    if (!SteamOtp_1.default.isSecretValid(accData.shared_secret)) {
        throw new Error(`${filePath.base} doesn't contain valid shared secret`);
    }
    return accData;
}
exports.getDataFromFile = getDataFromFile;
async function getExampleMaFile() {
    const content = await readFile('./example/example.maFile', 'UTF-8');
    return JSON.parse(content);
}
exports.getExampleMaFile = getExampleMaFile;
