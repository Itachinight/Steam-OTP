const fs = require('fs');
const util = require('util');
const path = require('path');
const dotEnv = require('dotenv');
const readDir = util.promisify(fs.readdir);
const writeFile = util.promisify(fs.writeFile);
const fileReader = require('./fileReader');
const helper = require('./helper');
const steamTimeAligner = require('./steamTimeAligner');
const SteamOtp = require('./steamOtp');

module.exports = class App {

    constructor() {
        dotEnv.config();
        this.configDir = process.env.CONFIG_PATH;
    }

    async init() {
        const offset = await steamTimeAligner.getOffset();
        this.steamOtp = new SteamOtp(offset);
    }

    async get2faFromFile(filePath) {
        filePath = path.parse(filePath);
        this.accountData = await fileReader.getDataFromFile(filePath);
        this.accountData.code = this.steamOtp.getAuthCode(this.accountData.shared_secret);

        return this.accountData;
    };

    get2FaFormSecret(shared_secret) {
        this.accountData = {
            shared_secret,
            code: this.steamOtp.getAuthCode(shared_secret)
        };

        return this.accountData;
    };

    refresh2Fa() {
        this.accountData.code = this.steamOtp.getAuthCode(this.accountData.shared_secret);

        return this.accountData;
    };

    async saveToConfig(file) {
        const filePath = path.parse(file);
        const accData = fileReader.getDataFromFile(filePath);
        const options = {
            encoding: 'UTF-8',
            flag: 'wx',
        };
        const fullPath = path.format({
            dir: this.configDir,
            name: filePath.name,
            ext: '.maFile'
        });

        try {
            return await writeFile(fullPath, JSON.stringify(await accData, null, 2), options);
        } catch (err) {
            console.error(err);
            if (err.code === 'EEXIST') throw new Error(`${filePath.base} is already exists`);
        }
    };

    async getConfigFiles() {
        let files = await readDir(this.configDir);
        files = files.map(file => {
            const fullPath = path.join(this.configDir, file);
            const filePath = path.parse(fullPath);
            filePath.ext = filePath.ext.toLowerCase();
            filePath.fullPath = fullPath;
            return filePath;
        });

        async function filterFiles(filePath) {
            if (filePath.ext === '.db' || filePath.ext === '.mafile') {
                try {
                    let { shared_secret } = await fileReader.getDataFromFile(filePath);
                    return SteamOtp.isSecretValid(shared_secret);
                } catch {
                    return false;
                }
            }
            return false;
        }

        return await helper.asyncFilter(files, filterFiles);
    };

};