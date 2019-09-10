import {parse, format, ParsedPath} from "path"
import {getDataFromFile} from "../utils/fileReader";
import * as util from "util";
import * as fs from "fs";
import BigNumber from "bignumber.js";

const JsonBigInt = require("json-bigint")({"storeAsString": true});
const writeFile = util.promisify(fs.writeFile);

interface Session {
    SessionID?: string,
    SteamLogin?: string,
    SteamLoginSecure?: string,
    WebCookie?: string,
    OAuthToken?: string,
    SteamID: BigNumber | string,
}

export default class MaFile {
    public path!: string;
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

        return MaFile.assign(maFile, accountData, {path});
    }

    public static getFromSharedSecret(shared_secret: string): MaFile {
        const maFile: MaFile = new MaFile();

        return MaFile.assign(maFile, {shared_secret});
    }

    public static assign(maFile: MaFile, ...partialMaFile: Partial<MaFile>[]): MaFile {
        return Object.assign(maFile, ...partialMaFile);
    }

    public async save(dir: string): Promise<void> {
        const {path, ...fields} = this;
        const parsedPath: ParsedPath = parse(path);
        const outputPath: string = format({
            dir,
            name: parsedPath.name,
            ext: ".maFile"
        });

        if (typeof this.Session.SteamID === "string") {
            this.Session.SteamID = new BigNumber(this.Session.SteamID);
        }

        const jsonString: string = JsonBigInt.stringify(fields, function(this: any, key: string, value: any) {
            return value ? value : null;
        }, 2);

        await writeFile(outputPath, jsonString, {
            encoding: "UTF-8",
            flag: "w",
        });
    }
}