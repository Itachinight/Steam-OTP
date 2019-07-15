const fs = require('fs');
const util = require('util');
const otpModule = require('./steamOtp');
const steamOtp = new otpModule.SteamOtp();
const readFile = util.promisify(fs.readFile);
const readDir = util.promisify(fs.readdir);
const writeFile = util.promisify(fs.writeFile);

async function getDataFromDb(dirPath, file) {
    let fileContent = await readFile(`${dirPath}/${file}`, 'UTF-8');
    let {shared_secret, identity_secret, device_id} = JSON.parse(fileContent)._MobileAuthenticator;
    return {
        account_name: await getLoginFromJson(dirPath, file),
        device_id,
        identity_secret,
        shared_secret,
    };
}

async function getDataFromMafile(dirPath, file) {
    let fileContent = await readFile(`${dirPath}/${file}`, 'UTF-8');
    let {account_name, shared_secret, identity_secret, device_id} = JSON.parse(fileContent);
    return {
        account_name,
        device_id,
        identity_secret,
        shared_secret,
    };
}

async function getLoginFromJson(dirPath, file) {
    file = file.split('.', 2)[0];
    try {
        let fileContent = await readFile(`${dirPath}/${file}.json`, 'UTF-8');
        return JSON.parse(fileContent).SteamLogin;
    } catch {
        return '';
    }
}

async function getDataFromFile(dirPath, file) {
    file = file.toLowerCase();
    let accData;

    if (file.endsWith('.db')) {
        accData = await getDataFromDb(dirPath, file);
    } else if (file.endsWith('.mafile')) {
        accData = await getDataFromMafile(dirPath, file);
    }

    if (!accData) {
        throw new Error("File doesn't contain shared secret");
    }

    return accData;
}

exports.get2faFromFile = async (dirPath, file) => {
    let accData = await getDataFromFile(dirPath, file);
    return Object.assign(accData, {
        code: await steamOtp.getAuthCode(accData.shared_secret)
    });
};

exports.get2FaFormSecret = async shared_secret => {
    return {
        shared_secret,
        code: await steamOtp.getAuthCode(shared_secret.trim())
    }
};

exports.saveToConfig = async (dirPath, file) => {
    let accData = await getDataFromFile(dirPath, file);
    let options = {
        encoding: 'UTF-8',
        flag: 'wx',
    };

    file = file.split('.', 2)[0];
    try {
        return await writeFile(`config/${file}.maFile`, JSON.stringify(accData, null, 2), options);
    } catch (err) {
        throw new Error('File with such name already exists');
    }
};

exports.getConfigFiles = async path => {
    let files = await readDir(path);
    return files.filter(file => file.toLowerCase().endsWith('.db') || file.toLowerCase().endsWith('.mafile'));
};