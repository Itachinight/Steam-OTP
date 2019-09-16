import SteamOtp from "../classes/SteamOtp";
import {getDataFromFile, deleteFile, readFilesDir} from "../utils/fileReader";
import {asyncFilter} from "../utils/asyncFunc";
import SteamTimeAligner from "../classes/SteamTimeAligner";
import MaFile from "../models/MaFile";
import {AccountAuthData, FullFilePath} from "../types";

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

    public async login(login: string, password: string) {
        await this.currentMaFile.login(login, password, this.accountAuthData.code);
        await this.currentMaFile.save(this.configDir);
    }

    public async refreshSession() {
        await this.currentMaFile.refreshSession();
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
    }

    public get2FaFromSecret(shared_secret: string): AccountAuthData {
        this.accountAuthData = {
            maFile: MaFile.getFromSharedSecret(shared_secret),
            code: this.steamOtp.getAuthCode(shared_secret)
        };

        return this.accountAuthData;
    }

    public refresh2Fa(): AccountAuthData {
        this.accountAuthData.code = this.steamOtp.getAuthCode(this.currentMaFile.shared_secret);

        return this.accountAuthData;
    }

    public async saveToConfig(file: string): Promise<void> {
        const maFile: MaFile = await MaFile.getFromFile(file);
        await maFile.save(this.configDir, 'wx');
    }

    public async deleteFile(): Promise<string> {
        const {path} = this.currentMaFile;
        await deleteFile(path);
        return path.name;
    }

    public async getConfigFilesList(): Promise<FullFilePath[]> {
        const filesPaths: FullFilePath[] = await readFilesDir(this.configDir);

        return await asyncFilter(filesPaths, async (filePath: FullFilePath): Promise<boolean> => {
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