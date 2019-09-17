import {ParsedPath} from "path";
import MaFile from "../models/MaFile";
import SteamOtp from "../classes/SteamOtp";
import SteamTimeAligner from "../classes/SteamTimeAligner";
import {getDataFromFile, deleteFile, readFilesDir} from "../utils/fileReader";
import {asyncFilter} from "../utils/asyncFunc";

export default class MainController {
    private static instance: MainController;

    private _maFile!: MaFile;
    private code!: string;
    private steamOtp: SteamOtp;
    private readonly configDir: string;

    private constructor(offset: number) {
        this.configDir = process.env.CONFIG_PATH || 'accounts';
        this.steamOtp = new SteamOtp(offset);
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
        await this._maFile.save(this.configDir);
    }

    public async refreshSession() {
        await this._maFile.refreshSession();
        await this._maFile.save(this.configDir);
    }

    public static verifySharedSecret(sharedSecret?: string): boolean {
        return SteamOtp.isSecretValid(sharedSecret);
    }

    public async get2FaFromFile(file: string): Promise<string> {
        this._maFile = await MaFile.getFromFile(file);
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

    public async saveToConfig(file: string): Promise<void> {
        const maFile: MaFile = await MaFile.getFromFile(file);
        await maFile.save(this.configDir, 'wx');
    }

    public async deleteFile(): Promise<string> {
        const {path} = this._maFile;
        await deleteFile(path);

        return `${path.name}${path.ext}`;
    }

    public async getConfigFilesList(): Promise<ParsedPath[]> {
        const filesPaths: ParsedPath[] = await readFilesDir(this.configDir);

        return await asyncFilter(filesPaths, async (filePath: ParsedPath): Promise<boolean> => {
            if (filePath.ext === ".db" || filePath.ext === ".mafile") {
                try {
                    const {shared_secret} = await getDataFromFile(filePath);
                    return SteamOtp.isSecretValid(shared_secret);
                } catch {
                    return false;
                }
            }
            return false;
        });
    }
}