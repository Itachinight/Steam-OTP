const Crypto = require('crypto');
const fs = require('fs');

function getAuthCode(secret) {
    secret = bufferizeSecret(secret);

    let time = Math.floor(Date.now() / 1000);
    let buffer = Buffer.allocUnsafe(8);
    let hmac = Crypto.createHmac('sha1', secret);

    buffer.writeUInt32BE(0, 0); // This will stop working in 2038!
    buffer.writeUInt32BE(Math.floor(time / 30), 4);
    hmac = hmac.update(buffer).digest();

    let start = hmac[19] & 0x0F;
    hmac = hmac.slice(start, start + 4);

    return bufferToOTP(hmac.readUInt32BE(0) & 0x7FFFFFFF);
}

function bufferToOTP(fullcode) {
    const chars = '23456789BCDFGHJKMNPQRTVWXY';
    let otp = '';

    for (let i = 0; i < 5; i++) {
        otp += chars.charAt(fullcode % chars.length);
        fullcode /= chars.length;
    }

    return otp;
}

function bufferizeSecret(secret) {
    if (typeof secret === 'string') {
        if (secret.match(/[0-9a-f]{40}/i)) {
            return Buffer.from(secret, 'hex');
        } else if (secret.length === 28) {
            return Buffer.from(secret, 'base64');
        } throw new Error('Wrong Secret Given');
    } throw new Error('Wrong Secret Given');
}

async function getLoginAnd2fa(dirPath, file) {
    if (file.endsWith('.db')) {
        file = file.replace('.db', '');
        return {
            name : file,
            login : await getLoginFromJson(dirPath, file),
            code : getAuthCode(await getSharedSecretFromDb(dirPath, file)),
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

async function get2faFromASF(dirPath) {
    const files = await readAllFiles(dirPath);
    return Promise.all(files.map(file => getLoginAnd2fa(dirPath, file)));
}

module.exports.get2faFromFile = async(dirPath, file) => getLoginAnd2fa(dirPath, file);

module.exports.get2FaFormSecret = secret => ({ code: getAuthCode(secret.trim()) });

module.exports.getConfigFiles = async dirPath => await readAllFiles(dirPath);