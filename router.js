const fs = require('fs');
const steamOtp = require('./steamOtp');

async function getLoginAnd2fa(dirPath, file) {
    if (file.endsWith('.db')) {
        file = file.replace('.db', '');
        let secret = await getSharedSecretFromDb(dirPath, file);
        return {
            secret,
            name : file,
            login : await getLoginFromJson(dirPath, file),
            code : await steamOtp.getAuthCode(secret),
        }
    }
}

function getSharedSecretFromDb(dirPath, file) {
    return new Promise((resolve, reject) => {
        fs.readFile(`${dirPath}/${file}.db`, 'UTF-8', (err, content) => {
            if (err) reject(err);
            resolve(JSON.parse(content)._MobileAuthenticator.shared_secret);
        })
    })
}

function getLoginFromJson(dirPath, file) {
    return new Promise((resolve, reject) => {
        fs.readFile(`${dirPath}/${file}.json`, 'UTF-8', (err, content) => {
            if (err) reject(err);
            resolve(JSON.parse(content).SteamLogin);
        })
    })
}

function readAllFiles(path) {
    return new Promise((resolve, reject) => {
        fs.readdir(path, (err, files) => {
            if (err) reject(err);
            else resolve(files.filter(file => file.endsWith('.db')));
        })
    })
}

// async function get2faFromASF(dirPath) {
//     const files = await readAllFiles(dirPath);
//     return Promise.all(files.map(async file => await getLoginAnd2fa(dirPath, file)));
// }

exports.get2faFromFile = async (dirPath, file) => await getLoginAnd2fa(dirPath, file);

exports.get2FaFormSecret = async secret => {
    return {
        secret,
        code: await steamOtp.getAuthCode(secret.trim())
    }

};

exports.getConfigFiles = async dirPath => await readAllFiles(dirPath);