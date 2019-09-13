import {parse, format, ParsedPath} from "path"
import {getDataFromFile} from "../utils/fileReader";
import * as util from "util";
import * as fs from "fs";
import BigNumber from "bignumber.js";
import {Session, SteamCookies} from "../types";

const JsonBigInt = require("json-bigint")();
const writeFile = util.promisify(fs.writeFile);

export default class MaFile {
    public path: string = "";
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
        const maFile: MaFile = new MaFile();
        const parsedPath: ParsedPath = parse(path);
        const accountData: Partial<MaFile> = await getDataFromFile(parsedPath);

        try {
            maFile.path = path;
            MaFile.assign(maFile, accountData)
        } catch (err) {
            console.log(err);
        }

        return maFile;
    }

    public static getFromSharedSecret(shared_secret: string): MaFile {
        const maFile: MaFile = new MaFile();

        return MaFile.assign(maFile, {shared_secret});
    }

    set SessionCookies(cookies: SteamCookies) {
        this.Session = {...this.Session, ...cookies};
    }

    public static assign(maFile: MaFile, partialMaFile: Partial<MaFile>): MaFile {
        if (partialMaFile.Session) {
            const {Session} = partialMaFile;

            for (const elem in Session) {
                if (Session.hasOwnProperty(elem) && !maFile.Session.hasOwnProperty(elem)) delete Session[<keyof Session> elem];
            }
        }

        for (const elem in partialMaFile) {
            if (partialMaFile.hasOwnProperty(elem) && !maFile.hasOwnProperty(elem)) delete partialMaFile[<keyof MaFile> elem];
        }

        return Object.assign(maFile, partialMaFile);
    }

    public async save(dir: string): Promise<void> {
        const {path, ...fields} = this;
        const parsedPath: ParsedPath = parse(path);
        const outputPath: string = format({
            dir,
            name: parsedPath.name,
            ext: ".maFile"
        });

        const jsonString: string = JsonBigInt.stringify(fields, function(this: any, key: string, value: any) {
            return value ? value : null;
        }, 2);

        try {
            await writeFile(outputPath, jsonString);
        } catch (err) {
            throw new Error(`An Error occurred while saving ${parsedPath.name}.maFile.\r\n Check your accounts directory files permission`);
        }
    }
}