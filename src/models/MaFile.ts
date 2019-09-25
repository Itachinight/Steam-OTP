import {parse, ParsedPath} from "path"
import FS from "../classes/FS";
import BigNumber from "bignumber.js";
import * as SteamCommunity from "steamcommunity";
import {CompositeMessages, Messages} from "../messages";
import SteamOtp from "../classes/SteamOtp";
import * as JsonBigInt from "json-bigint";

interface Session {
    SessionID: string|null
    SteamLoginSecure: string|null
    OAuthToken: string|null
    SteamID: BigNumber
}

export default class MaFile {
    public path!: ParsedPath;
    public shared_secret: string = "";
    public device_id: string = "";
    public identity_secret: string = "";
    public account_name: string = "";
    public serial_number: string|null = null;
    public revocation_code: string|null = null;
    public uri: string|null = null;
    public server_time: number = Date.timestamp();
    public token_gid: string|null = null;
    public secret_1: string|null = null;
    public status: number = 1;
    public fully_enrolled: boolean = true;
    public Session: Session = {
        SessionID: null,
        SteamLoginSecure: null,
        OAuthToken: null,
        SteamID: new BigNumber("76".padEnd(17, "0")),
    };

    private constructor() {}

    public static async getFromFile(path: string): Promise<MaFile> {
        const parsedPath: ParsedPath = parse(path);
        const accountData: Partial<MaFile> = await MaFile.get2FaFields(parsedPath);
        const maFile: MaFile = new MaFile();
        maFile.path = parsedPath;

        return maFile.assign(accountData);
    }

    public static getFromSharedSecret(shared_secret: string): MaFile {
        const maFile: MaFile = new MaFile();

        return maFile.assign({shared_secret});
    }

    private assignSession(session: Partial<Session>): void {
        Object.assign(this.Session, session);
    }

    private assign(partialMaFile: Partial<MaFile>): MaFile {
        const {Session, ...fields} = partialMaFile;

        if (Session) {
            for (const elem in Session) {
                if (Session.hasOwnProperty(elem) && !this.Session.hasOwnProperty(elem)) delete Session[<keyof Session> elem];
            }
            this.assignSession(Session);
        }

        for (const elem in fields) {
            if (fields.hasOwnProperty(elem) && !this.hasOwnProperty(elem)) delete fields[<keyof Omit<MaFile, "Session">> elem];
        }

        return Object.assign(this, fields);
    }

    public async create(dir: string): Promise<void> {
        const {path, ...fields} = this;
        const jsonString: string = JsonBigInt.stringify(fields, null, 2);
        const {name} = path;
        const newPath: ParsedPath = {name, ext: ".maFile", dir, base: `${name}.maFile`, root: ""};

        await FS.writeFile(newPath, jsonString, "wx");
    }

    public async save(): Promise<void> {
        const {path, ...fields} = this;
        const jsonString: string = JsonBigInt.stringify(fields, null, 2);

        await FS.writeFile(path, jsonString, "w");
    }

    public async refreshSession(): Promise<void> {
        const {SteamID, OAuthToken} = this.Session;
        if (!SteamID || !OAuthToken) throw new Error(Messages.sesRefreshErr);

        const session: Partial<Session> = await new Promise((resolve, reject) => {
            const community = new SteamCommunity();
            const steamGuard = `${SteamID.toString()}||0`;
            community.oAuthLogin(steamGuard, OAuthToken, (err: Error, SessionID: string, cookies: string[]) => {
                if (err) reject(err);

                const [secureCookiePair] = cookies.filter((elem: string) => /^steamLoginSecure/i.test(elem));
                const [, SteamLoginSecure] = secureCookiePair.split("=", 2);

                resolve({SessionID, SteamLoginSecure});
            });
        });

        this.assignSession(session);
    }

    public async login(accountName: string, password: string, twoFactorCode: string): Promise<void> {
        const session: Partial<Session> = await new Promise((resolve, reject) => {
            const community = new SteamCommunity();
            const options = {
                accountName,
                password,
                twoFactorCode
            };
            community.login(options, (err: Error, SessionID: string, cookies: string[], steamGuard?: string, OAuthToken?: string) => {
                if (err) reject(err);

                const secureCookiePair: string = cookies.filter((elem: string) => /^steamLoginSecure/i.test(elem))[0];
                const SteamLoginSecure: string = secureCookiePair.split('=', 2)[1];
                const SteamID: BigNumber = new BigNumber(SteamLoginSecure.split('%7C%7C', 2)[0]);

                resolve({SessionID, SteamLoginSecure, OAuthToken, SteamID});
            });
        });

        if (this.account_name !== accountName) this.account_name = accountName;
        this.assignSession(session);
    }

    public static async get2FaFields(path: ParsedPath): Promise<Partial<MaFile>> {
        path.ext = path.ext.toLowerCase();

        if (path.ext !== '.db' && path.ext !== '.mafile') throw new Error(CompositeMessages.notMaFileOrDb(path.base));

        let maFile: Partial<MaFile>;

        try {
            const fileContent = await FS.readFile(path);

            if (path.ext === '.db') {
                maFile = await MaFile.getDataFromDb(fileContent, await MaFile.getLoginFromJson(path));
            } else {
                maFile = MaFile.getDataFromMaFile(fileContent);
            }
        } catch (err) {
            if (err instanceof SyntaxError) {
                throw new Error(CompositeMessages.invalidJson(path.base));
            } else throw err;
        }

        if (!SteamOtp.isSecretValid(maFile.shared_secret)) {
            throw new Error(CompositeMessages.invalidSharedSecret(path.base));
        }

        return maFile;
    }

    private static async getDataFromDb(content: string, account_name: string): Promise<Partial<MaFile>> {
        const {shared_secret, identity_secret, device_id} = JSON.parse(content)._MobileAuthenticator;
        return {
            account_name,
            device_id,
            identity_secret,
            shared_secret,
        };
    }

    private static getDataFromMaFile(content: string): Partial<MaFile> {
        return JsonBigInt.parse(content);
    }

    private static async getLoginFromJson(filePath: ParsedPath): Promise<string> {
        const {dir, name, root} = filePath;
        const jsonPath: ParsedPath = {dir, root, name, ext: ".json", base: `${name}.json`};

        try {
            const fileContent: string = await FS.readFile(jsonPath);
            return JSON.parse(fileContent).SteamLogin;
        } catch {
            return name;
        }
    }
}