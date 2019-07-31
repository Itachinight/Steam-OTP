const crypto = require('crypto');

module.exports = class SteamOtp {

    constructor(offset) {
        this.steamTimeOffset = offset;
    }

    static isSecretValid(secret) {
        return /^[a-z0-9+\\\/=]{28}$/i.test(secret);
    }

    static bufferSecret(secret) {
        if (SteamOtp.isSecretValid(secret)) {
            return Buffer.from(secret, 'base64');
        } else throw new Error('Wrong Secret Given');
    };


    static bufferToOTP(fullCode) {
        const chars = '23456789BCDFGHJKMNPQRTVWXY';
        let otp = '';

        for (let i = 0; i < 5; i++) {
            otp += chars.charAt(fullCode % chars.length);
            fullCode /= chars.length;
        }

        return otp;
    }

    getAuthCode(secret) {
        const bufferedSecret = SteamOtp.bufferSecret(secret);
        const time = Math.floor((Date.now() / 1000) + this.steamTimeOffset);
        const buffer = Buffer.allocUnsafe(8);
        let hmac = crypto.createHmac('sha1', bufferedSecret);

        buffer.writeUInt32BE(0, 0);
        buffer.writeUInt32BE(Math.floor(time / 30), 4);
        hmac = hmac.update(buffer).digest();

        let start = hmac[19] & 0x0F;
        hmac = hmac.slice(start, start + 4);

        return SteamOtp.bufferToOTP(hmac.readUInt32BE(0) & 0x7FFFFFFF);
    };

};