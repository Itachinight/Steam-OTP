import * as path from "path";
import {AccountFileData} from "./index";
import {getDataFromFile} from "./fileReader";
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
    SteamID?: BigNumber | string,
}

export default class MaFile {
    public shared_secret: string = "";
    public device_id: string = "";
    public identity_secret: string = "";
    public account_name: string = "";
    public serial_number: string = null;
    public revocation_code: string = null;
    public uri: string = null;
    public server_time: number = Math.floor(Date.now() / 1000);
    public token_gid: string = null;
    public secret_1: string = null;
    public status: number = 1;
    public fully_enrolled: boolean = true;
    public Session: Session = {
        SessionID: null,
        SteamLogin: null,
        SteamLoginSecure: null,
        WebCookie: null,
        OAuthToken: null,
        SteamID: "76000000000000000"
    };

    private code: string;
    private path;

    private constructor(fields: Partial<MaFile>) {
        for (const fieldsKey in fields) {
            if (fields.hasOwnProperty(fieldsKey) && this.hasOwnProperty(fieldsKey)) {
                this[fieldsKey] = fields[fieldsKey];
            }
        }
    }

    public static async getFromFile(file: string): Promise<MaFile> {
        const filePath: path.ParsedPath = path.parse(file);
        const accountData: AccountFileData = await getDataFromFile(filePath);

        const maFile: MaFile = new MaFile(accountData);
        //maFile.path(file);
        return maFile;
    }

    public async save() {
        //const filePath: path.ParsedPath = path.parse(this.path);
        const fullPath: string = path.format({
            dir: "accounts",
            name: "test",
            ext: ".maFile"
        });

        if (this.Session && this.Session.SteamID && typeof this.Session.SteamID === "string") {
            this.Session.SteamID = new BigNumber(this.Session.SteamID);
        }

        await writeFile(fullPath, JsonBigInt.stringify({...this}, null, 2), {
            encoding: "UTF-8",
            flag: "w",
        });
    }

    // get filePath() {
    //     return this.path;
    // }
    //
    // set filePath(path) {
    //     this.path = path;
    // }
    //
    // get oneTimePassword() {
    //     return this.code;
    // }

    refreshOneTimePassword() {
        this.code = 'code';
        return this.code;
    }

}