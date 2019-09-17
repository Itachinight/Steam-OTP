import {parse, format, ParsedPath} from "path"
import {getDataFromFile} from "../utils/fileReader";
import * as util from "util";
import * as fs from "fs";
import BigNumber from "bignumber.js";
import {Session} from "../types";
import * as SteamCommunity from "steamcommunity";
import {Messages, CompositeMessages} from "../messages";

const JsonBigInt = require("json-bigint")();
const writeFile = util.promisify(fs.writeFile);

export default class MaFile {
    public path!: ParsedPath;
    public shared_secret: string = "";
    public device_id: string = "";
    public identity_secret: string = "";
    public account_name: string = "";
    public serial_number: string|null = null;
    public revocation_code: string|null = null;
    public uri: string|null = null;
    public server_time?: number = Math.floor(Date.now() / 1000);
    public token_gid: string|null = null;
    public secret_1: string|null = null;
    public status: number = 1;
    public fully_enrolled: boolean = true;
    public Session: Session = {
        SessionID: null,
        SteamLogin: null,
        SteamLoginSecure: null,
        WebCookie: null,
        OAuthToken: null,
        SteamID: new BigNumber("76000000000000000"),
    };

    private constructor() { }

    public static async getFromFile(path: string): Promise<MaFile> {
        const parsedPath: ParsedPath = parse(path);
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

    public async save(dir: string, flag: "w"|"wx" = "w"): Promise<void> {
        const {path, ...fields} = this;
        const outputPath: string = format({
            dir,
            name: path.name,
            ext: ".maFile"
        });

        const jsonString: string = JsonBigInt.stringify(fields, null, 2);

        try {
            await writeFile(outputPath, jsonString, {flag});
        } catch (err) {
            switch (err.code) {
                case 'EEXIST':
                    throw new Error(Messages.sameFileName);
                case 'EPERM':
                case 'EACCES':
                    throw new Error(CompositeMessages.restrictedAccess(path.name));
                default:
                    throw new Error(Messages.unknownErr);
            }
        }
    }

    public async refreshSession(): Promise<void> {
        const {SteamID, OAuthToken} = this.Session;
        if (!SteamID || !OAuthToken) throw new Error(Messages.sesRefreshErr);

        const Session: Partial<Session> = await new Promise((resolve, reject) => {
            const community = new SteamCommunity();
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
        this.assignSession(Session);
    }
}