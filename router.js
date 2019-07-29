const fs = require('fs');
const util = require('util');
const path = require('path');
const readDir = util.promisify(fs.readdir);
const writeFile = util.promisify(fs.writeFile);
const fileReader = require('./fileReader');
const helper = require('./helper');
const SteamOtp = require('./steamOtp');
const dotEnv = require('dotenv');
dotEnv.config();

exports.get2faFromFile = async filePath => {
    filePath = path.parse(filePath);
    const accData = await fileReader.getDataFromFile(filePath);
    const steamOtp = await SteamOtp.getInstance();

    return Object.assign(accData, {
        code: await steamOtp.getAuthCode(accData.shared_secret)
    });
};

exports.get2FaFormSecret = async shared_secret => {
    const steamOtp = await SteamOtp.getInstance();
    return {
        shared_secret,
        code: await steamOtp.getAuthCode(shared_secret.trim())
    }
};

exports.saveToConfig = async (file) => {
    const filePath = path.parse(file.toLowerCase());
    const accData = await fileReader.getDataFromFile(filePath);
    const options = {
        encoding: 'UTF-8',
        flag: 'wx',
    };
    const fullPath = path.format({
        dir: process.env.CONFIG_PATH,
        name: filePath.name,
        ext: '.maFile'
    });

    try {
        return await writeFile(fullPath, JSON.stringify(accData, null, 2), options);
    } catch (err) {
        console.error(err);
        if (err.code === 'EEXIST') throw new Error(`${file} is already exists`);
    }
};

exports.getConfigFiles = async () => {
    let files = await readDir(process.env.CONFIG_PATH);
    files = files.map(file => {
        let fullPath = path.join(process.env.CONFIG_PATH, file.toLowerCase());
        return Object.assign(path.parse(fullPath), { fullPath });
    });


    async function filterFiles(filePath) {
        if (filePath.ext === '.db' || filePath.ext === '.mafile') {
            try {
                let { shared_secret } = await fileReader.getDataFromFile(filePath);
                SteamOtp.bufferSecret(shared_secret);
                return true;
            } catch {
                return false;
            }
        }
        return false;
    }

    return await helper.asyncFilter(files, filterFiles);
};