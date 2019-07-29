const crypto = require('crypto');
const steamTimeAligner = require('./steamTimeAligner');

module.exports = class SteamOtp {

    static instance;

    constructor(offset) {
        this.steamTimeOffset = offset;
    }

    static async getInstance() {
        if (void 0 === SteamOtp.instance) {
            let offset = await steamTimeAligner.getOffset();
            SteamOtp.instance = new SteamOtp(offset);
        }
        return SteamOtp.instance
    }

    static bufferSecret(secret) {
        if ('string' === typeof secret && secret.length === 28) {
            return Buffer.from(secret, 'base64');
        } else if (secret.match(/[0-9a-f]{40}/i)) {
            return Buffer.from(secret, 'hex');
        }

        throw new Error('Wrong Secret Given');
    };


    static bufferToOTP(fullcode) {
        const chars = '23456789BCDFGHJKMNPQRTVWXY';
        let otp = '';

        for (let i = 0; i < 5; i++) {
            otp += chars.charAt(fullcode % chars.length);
            fullcode /= chars.length;
        }

        return otp;
    }

    async getAuthCode(secret) {
        secret = SteamOtp.bufferSecret(secret);

        let time = Math.floor((Date.now() / 1000) + this.steamTimeOffset);
        let buffer = Buffer.allocUnsafe(8);
        let hmac = crypto.createHmac('sha1', secret);

        buffer.writeUInt32BE(0, 0); // This will stop working in 2038!
        buffer.writeUInt32BE(Math.floor(time / 30), 4);
        hmac = hmac.update(buffer).digest();

        let start = hmac[19] & 0x0F;
        hmac = hmac.slice(start, start + 4);

        return SteamOtp.bufferToOTP(hmac.readUInt32BE(0) & 0x7FFFFFFF);
    };

};