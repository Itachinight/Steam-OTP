import {parse, format} from "path"
import {getDataFromFile} from "../utils/fileReader";
import * as util from "util";
import * as fs from "fs";
import BigNumber from "bignumber.js";
import {FullFilePath, Session} from "../types";
import * as SteamCommunity from "steamcommunity";

const JsonBigInt = require("json-bigint")();
const writeFile = util.promisify(fs.writeFile);

export default class MaFile {
    public path!: FullFilePath;
    public shared_secret: string = "";
    public device_id: string = "";
    public identity_secret: string = "";
    public account_name: string = "";
    public serial_number?: string = undefined;
    public revocation_code?: string = undefined;
    public uri?: string = undefined;
    public server_time?: number = Math.floor(Date.now() / 1000);
    public token_gid?: string = undefined;
    public secret_1?: string = undefined;
    public status: number = 1;
    public fully_enrolled: boolean = true;
    public Session: Session = {
        SessionID: undefined,
        SteamLogin: undefined,
        SteamLoginSecure: undefined,
        WebCookie: undefined,
        OAuthToken: undefined,
        SteamID: new BigNumber("76000000000000000"),
    };

    private constructor() { }

    public static async getFromFile(path: string): Promise<MaFile> {
        const parsedPath: FullFilePath = parse(path);
        parsedPath.fullPath = path;
        const accountData: Partial<MaFile> = await getDataFromFile(parsedPath);
        const maFile: MaFile = new MaFile();

        maFile.path = parsedPath;
        maFile.assign(accountData);

        return maFile;
    }

    public static getFromSharedSecret(shared_secret: string): MaFile {
        const maFile: MaFile = new MaFile();

        return maFile.assign({shared_secret});
    }

    private assignSession(session: Partial<Session>) {
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
            if (fields.hasOwnProperty(elem) && !this.hasOwnProperty(elem)) delete fields[<keyof Omit<MaFile, 'Session'>> elem];
        }

        return Object.assign(this, fields);
    }

    public async save(dir: string, flag: 'w'|'wx' = 'w'): Promise<void> {
        const {path, ...fields} = this;
        const outputPath: string = format({
            dir,
            name: path.name,
            ext: ".maFile"
        });

        const jsonString: string = JsonBigInt.stringify(fields, function(this: any, key: string, value: any) {
            return value ? value : null;
        }, 2);

        try {
            await writeFile(outputPath, jsonString, {flag});
        } catch (err) {
            switch (err.code) {
                case 'EEXIST':
                    throw new Error("You've already had maFile with the same name.");
                case 'EPERM':
                case 'EACCES':
                    throw new Error(
                        `An Error occurred while saving ${path.name}.maFile. Check your accounts directory access permissions.`
                    );
                default:
                    throw new Error("An Unknown error occurred.");
            }
        }
    }

    public async refreshSession(): Promise<void> {
        const {SteamID, OAuthToken} = this.Session;
        if (!SteamID || !OAuthToken) throw new Error("Can't refresh session. Try To Login Again");

        const Session: Partial<Session> = await new Promise((resolve, reject) => {
            let community = new SteamCommunity();
            const steamGuard = `${SteamID.toString()}||0`;
            community.oAuthLogin(steamGuard, OAuthToken, (err: Error, SessionID: string, cookies: string[]) => {
                if (err) reject(err);

                const [secureCookiePair] = cookies.filter((elem: string) => /^steamLoginSecure/i.test(elem));
                const [, SteamLoginSecure] = secureCookiePair.split('=', 2);

                resolve({SessionID, SteamLoginSecure});
            });
        });

        this.assignSession(Session);
    }

    public async login(accountName: string, password: string, twoFactorCode: string): Promise<void> {
        const Session: Partial<Session> = await new Promise((resolve, reject) => {
            let community = new SteamCommunity();
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

        this.assignSession(Session);
    }
}