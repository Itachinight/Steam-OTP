import * as fs from 'fs';
import * as util from 'util';
import {format, join, ParsedPath} from 'path';
import SteamOtp from '../classes/SteamOtp';
import MaFile from "../models/MaFile";

const JsonBigInt = require('json-bigint')();
const readFile = util.promisify(fs.readFile);

async function getDataFromDb(content: string, account_name: string): Promise<Partial<MaFile>> {
    const { shared_secret, identity_secret, device_id } = JSON.parse(content)._MobileAuthenticator;
    return {
        account_name,
        device_id,
        identity_secret,
        shared_secret,
    };
}

function getDataFromMaFile(content: string): Partial<MaFile> {
    return JsonBigInt.parse(content);
}

async function getLoginFromJson(filePath: ParsedPath): Promise<string> {
    const { dir, name } = filePath;
    const fullPath: string = format({
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

async function getSteam2FaFields(filePath: ParsedPath): Promise<Partial<MaFile>> {
    filePath.ext = filePath.ext.toLowerCase();
    if (!(filePath.ext === '.db' || filePath.ext === '.mafile')) throw new TypeError();

    let maFile: Partial<MaFile>;
    const fullPath = join(filePath.dir, filePath.base);
    const fileContent = await readFile(fullPath, 'UTF-8');

    if (filePath.ext === '.db') {
        const login = await getLoginFromJson(filePath);
        maFile = await getDataFromDb(fileContent, login);
    } else maFile = getDataFromMaFile(fileContent);

    return maFile;
}

export async function getDataFromFile(filePath: ParsedPath): Promise<Partial<MaFile>> {
    let accData: Partial<MaFile>;

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