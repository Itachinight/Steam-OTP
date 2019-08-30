import * as fs from 'fs';
import * as util from 'util';
import * as path from 'path';
import * as dotEnv from 'dotenv';
import SteamOtp from './SteamOtp';
import {getDataFromFile, getExampleMaFile} from './fileReader';
import { asyncFilter } from './helper';
import SteamTimeAligner from './SteamTimeAligner';
import {AccountAuthData, AccountFileData, FullFilePath} from "./index";

const readDir = util.promisify(fs.readdir);
const writeFile = util.promisify(fs.writeFile);

export default class App {
    private static instance: App;

    private readonly configDir: string;
    private steamOtp: SteamOtp;
    private accountAuthData: AccountAuthData;
    private readonly writeOpts = {
        encoding: 'UTF-8',
        flag: 'wx',
    };

    public readonly steamTimeOffset: number;

    private constructor(offset: number) {
        dotEnv.config();
        this.steamTimeOffset = offset;
        this.configDir = process.env.CONFIG_PATH;
        this.steamOtp = new SteamOtp(this.steamTimeOffset);
    }

    static async getInstance(): Promise<App> {
        if (void 0 === App.instance) {
            const steamTimeAligner = new SteamTimeAligner();
            App.instance = new App(await steamTimeAligner.getOffset());
        }

        return App.instance;
    }

    async get2faFromFile(file: string): Promise<AccountAuthData> {
        const filePath: path.ParsedPath = path.parse(file);
        const accountData: AccountFileData = await getDataFromFile(filePath);

        this.accountAuthData = {
            ...accountData,
            code: this.steamOtp.getAuthCode(accountData.shared_secret),
        };

        return this.accountAuthData;
    };

    get2FaFromSecret(shared_secret: string): AccountAuthData {
        this.accountAuthData = {
            shared_secret,
            code: this.steamOtp.getAuthCode(shared_secret)
        };

        return this.accountAuthData;
    };

    refresh2Fa(): AccountAuthData {
        this.accountAuthData.code = this.steamOtp.getAuthCode(this.accountAuthData.shared_secret);
        return this.accountAuthData;
    };

    async saveToConfig(file: string): Promise<void> {
        const filePath: path.ParsedPath = path.parse(file);
        const accData: Promise<AccountFileData> = getDataFromFile(filePath);
        const example: Promise<object> = getExampleMaFile();
        const fullPath: string = path.format({
            dir: this.configDir,
            name: filePath.name,
            ext: '.maFile'
        });

        return writeFile(fullPath, JSON.stringify({...await example, ...await accData}, null, 2), this.writeOpts);
    };

    async getConfigFiles(): Promise<FullFilePath[]> {
        const files: string[] = await readDir(this.configDir);
        const filesPath = files.map(file => {
            const fullPath = path.join(this.configDir, file);
            const filePath: FullFilePath = path.parse(fullPath);
            filePath.ext = filePath.ext.toLowerCase();
            filePath.fullPath = fullPath;
            return filePath;
        });

        async function filterFiles(filePath: path.ParsedPath): Promise<boolean> {
            if (filePath.ext === '.db' || filePath.ext === '.mafile') {
                try {
                    const { shared_secret } = await getDataFromFile(filePath);
                    return SteamOtp.isSecretValid(shared_secret);
                } catch {
                    return false;
                }
            }
            return false;
        }

        return await asyncFilter(filesPath, filterFiles);
    };

};