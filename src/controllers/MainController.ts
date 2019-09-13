import * as fs from "fs";
import * as util from "util";
import * as path from "path";
import SteamOtp from "../classes/SteamOtp";
import {getDataFromFile} from "../utils/fileReader";
import {asyncFilter} from "../utils/asyncFunc";
import SteamTimeAligner from "../classes/SteamTimeAligner";
import MaFile from "../models/MaFile";
import {AccountAuthData, FullFilePath} from "../types";
import {getCookies} from "../utils/steamAuth";

const readDir = util.promisify(fs.readdir);

export default class MainController {

    private static instance: MainController;

    private steamOtp: SteamOtp;
    private accountAuthData!: AccountAuthData;
    private readonly configDir: string;

    private constructor(offset: number) {
        this.configDir = <string>process.env.CONFIG_PATH;
        this.steamOtp = new SteamOtp(offset);
    }

    public get currentMaFile(): MaFile {
        return this.accountAuthData.maFile;
    }

    public get steamTimeOffset(): number {
        return this.steamOtp.steamTimeOffset;
    }

    public async updateSession(login: string, password: string) {
        this.currentMaFile.SessionCookies = await getCookies(login, password, this.accountAuthData.code);
        await this.currentMaFile.save(this.configDir);
    }

    public static verifySharedSecret(sharedSecret?: string): boolean {
        return SteamOtp.isSecretValid(sharedSecret);
    }

    public static async getInstance(): Promise<MainController> {
        if (!MainController.instance) {
            MainController.instance = new MainController(await SteamTimeAligner.getOffset());
        }

        return MainController.instance;
    }

    public async get2FaFromFile(file: string): Promise<AccountAuthData> {
        const maFile: MaFile = await MaFile.getFromFile(file);

        this.accountAuthData = {
            maFile,
            code: this.steamOtp.getAuthCode(maFile.shared_secret),
        };

        return this.accountAuthData;
    };

    public get2FaFromSecret(shared_secret: string): AccountAuthData {
        this.accountAuthData = {
            maFile: MaFile.getFromSharedSecret(shared_secret),
            code: this.steamOtp.getAuthCode(shared_secret)
        };

        return this.accountAuthData;
    };

    public refresh2Fa(): AccountAuthData {
        this.accountAuthData.code = this.steamOtp.getAuthCode(this.currentMaFile.shared_secret);

        return this.accountAuthData;
    };

    public async saveToConfig(file: string): Promise<void> {
        const maFile: MaFile = await MaFile.getFromFile(file);
        await maFile.save(this.configDir);
    };

    public async getConfigFilesList(): Promise<FullFilePath[]> {
        const files: string[] = await readDir(this.configDir);
        const filesPath: FullFilePath[] = files.map(file => {
            const fullPath = path.join(this.configDir, file);
            const filePath: FullFilePath = path.parse(fullPath);

            filePath.ext = filePath.ext.toLowerCase();
            filePath.fullPath = fullPath;

            return filePath;
        });

        async function filterFiles(filePath: FullFilePath): Promise<boolean> {
            if (filePath.ext === ".db" || filePath.ext === ".mafile") {
                try {
                    const {shared_secret} = await getDataFromFile(filePath);
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