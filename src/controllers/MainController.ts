import {ParsedPath} from "path";
import MaFile from "../models/MaFile";
import SteamOtp from "../classes/SteamOtp";
import SteamTimeAligner from "../classes/SteamTimeAligner";
import FS from "../classes/FS";
import * as AllSettled from "promise.allsettled";
import {PromiseResult} from "promise.allsettled";
require("../helpers")();
import {mkdir} from "fs";

export default class MainController {

    private static instance: MainController;

    private _maFile!: MaFile;
    private code!: string;
    private readonly steamOtp: SteamOtp;
    private readonly configDir: string;

    private constructor(offset: number) {
        this.configDir = process.env.CONFIG_PATH || 'accounts';
        this.steamOtp = new SteamOtp(offset);
        mkdir(this.configDir, {recursive: true}, (err: Error|null) => {
            if (err) process.exit(0);
        });
    }

    public static async getInstance(): Promise<MainController> {
        if (!MainController.instance) {
            MainController.instance = new MainController(await SteamTimeAligner.getOffset());
        }

        return MainController.instance;
    }

    public get maFile(): MaFile {
        return this._maFile;
    }

    public get steamTimeOffset(): number {
        return this.steamOtp.steamTimeOffset;
    }

    public async login(login: string, password: string) {
        await this._maFile.login(login, password, this.code);
        await this._maFile.save();
    }

    public async refreshSession() {
        await this._maFile.refreshSession();
        await this._maFile.save();
    }

    public static verifySharedSecret(sharedSecret?: any): boolean {
        return SteamOtp.isSecretValid(sharedSecret);
    }

    public async get2FaFromFile(path: string): Promise<string> {
        this._maFile = await MaFile.getFromFile(path);
        this.code = this.steamOtp.getAuthCode(this._maFile.shared_secret);

        return this.code;
    }

    public get2FaFromSecret(sharedSecret: string): string {
        this._maFile = MaFile.getFromSharedSecret(sharedSecret);
        this.code = this.steamOtp.getAuthCode(sharedSecret);

        return this.code;
    }

    public refresh2Fa(): string {
        this.code = this.steamOtp.getAuthCode(this._maFile.shared_secret);

        return this.code;
    }

    public async saveToConfig(filePaths: string[]): Promise<PromiseResult<Promise<void>, unknown>[]> {
        filePaths = await FS.readAuthFiles(filePaths);

        return AllSettled(filePaths.map(async (filePath) => {
            const maFile: MaFile = await MaFile.getFromFile(filePath);
            await maFile.create(this.configDir);
        }));
    }

    public async deleteFile(): Promise<string> {
        const {path} = this._maFile;
        await FS.deleteFile(path);

        return `${path.name}${path.ext}`;
    }

    public async getConfigFilesList(): Promise<ParsedPath[]> {
        const filesPaths: ParsedPath[] = await FS.readAccountsDir(this.configDir);

        return await filesPaths.asyncFilter(async (filePath: ParsedPath): Promise<boolean> => {
            if (filePath.ext === ".db" || filePath.ext === ".mafile") {
                try {
                    const {shared_secret} = await MaFile.get2FaFields(filePath);
                    return SteamOtp.isSecretValid(shared_secret);
                } catch {
                    return false;
                }
            }
            return false;
        });
    }
}