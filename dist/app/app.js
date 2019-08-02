"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const util = require("util");
const path = require("path");
const dotEnv = require("dotenv");
const SteamOtp_1 = require("./SteamOtp");
const fileReader_1 = require("./fileReader");
const helper_1 = require("./helper");
const SteamTimeAligner_1 = require("./SteamTimeAligner");
const readDir = util.promisify(fs.readdir);
const writeFile = util.promisify(fs.writeFile);
class App {
    constructor(offset) {
        this.writeOpts = {
            encoding: 'UTF-8',
            flag: 'wx',
        };
        dotEnv.config();
        this.steamTimeOffset = offset;
        this.configDir = process.env.CONFIG_PATH;
        this.steamOtp = new SteamOtp_1.default(this.steamTimeOffset);
    }
    static async getInstance() {
        if (void 0 === App.instance) {
            const steamTimeAligner = new SteamTimeAligner_1.default();
            App.instance = new App(await steamTimeAligner.getOffset());
        }
        return App.instance;
    }
    async get2faFromFile(file) {
        const filePath = path.parse(file);
        const accountData = await fileReader_1.getDataFromFile(filePath);
        this.accountAuthData = {
            ...accountData,
            code: this.steamOtp.getAuthCode(accountData.shared_secret),
        };
        return this.accountAuthData;
    }
    ;
    get2FaFormSecret(shared_secret) {
        this.accountAuthData = {
            shared_secret,
            code: this.steamOtp.getAuthCode(shared_secret)
        };
        return this.accountAuthData;
    }
    ;
    refresh2Fa() {
        this.accountAuthData.code = this.steamOtp.getAuthCode(this.accountAuthData.shared_secret);
        return this.accountAuthData;
    }
    ;
    async saveToConfig(file) {
        const filePath = path.parse(file);
        const accData = fileReader_1.getDataFromFile(filePath);
        const fullPath = path.format({
            dir: this.configDir,
            name: filePath.name,
            ext: '.maFile'
        });
        return writeFile(fullPath, JSON.stringify(await accData, null, 2), this.writeOpts);
    }
    ;
    async getConfigFiles() {
        const files = await readDir(this.configDir);
        const filesPath = files.map(file => {
            const fullPath = path.join(this.configDir, file);
            const filePath = path.parse(fullPath);
            filePath.ext = filePath.ext.toLowerCase();
            filePath.fullPath = fullPath;
            return filePath;
        });
        async function filterFiles(filePath) {
            if (filePath.ext === '.db' || filePath.ext === '.mafile') {
                try {
                    const { shared_secret } = await fileReader_1.getDataFromFile(filePath);
                    return SteamOtp_1.default.isSecretValid(shared_secret);
                }
                catch (_a) {
                    return false;
                }
            }
            return false;
        }
        return await helper_1.asyncFilter(filesPath, filterFiles);
    }
    ;
}
exports.default = App;
;
