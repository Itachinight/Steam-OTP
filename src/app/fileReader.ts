import * as fs from 'fs';
import * as util from 'util';
import * as path from 'path';
import SteamOtp from './SteamOtp';
import {AccountFileData} from "./index";

const JsonBigInt = require('json-bigint')({"storeAsString": true});
const readFile = util.promisify(fs.readFile);

async function getDataFromDb(content: string, accountName: string=''): Promise<AccountFileData> {
    const { shared_secret, identity_secret, device_id } = JSON.parse(content)._MobileAuthenticator;
    return {
        account_name: accountName,
        device_id,
        identity_secret,
        shared_secret,
    };
}

function getDataFromMaFile(content: string): AccountFileData {
    return JsonBigInt.parse(content);
}

async function getLoginFromJson(filePath: path.ParsedPath): Promise<string> {
    const { dir, name } = filePath;
    const fullPath: string = path.format({
        dir,
        name,
        ext: '.json'
    });

    try {
        const fileContent: string = await readFile(fullPath, 'UTF-8');
        return JSON.parse(fileContent).SteamLogin;
    } catch {
        return '';
    }
}

async function getSteam2FaFields(filePath: path.ParsedPath): Promise<AccountFileData> {
    filePath.ext = filePath.ext.toLowerCase();

    if (filePath.ext === '.db' || filePath.ext === '.mafile') {
        const fullPath = path.join(filePath.dir, filePath.base);
        const fileContent = await readFile(fullPath, 'UTF-8');

        if (filePath.ext === '.db') {
            const login = await getLoginFromJson(filePath);
            return await getDataFromDb(fileContent, login);
        } else if (filePath.ext === '.mafile') {
            return getDataFromMaFile(fileContent);
        }

    } else throw new TypeError();
}

export async function getDataFromFile(filePath: path.ParsedPath): Promise<AccountFileData> {
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
}