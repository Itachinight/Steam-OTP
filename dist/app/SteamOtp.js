"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = require("crypto");
class SteamOtp {
    constructor(offset) {
        this.steamTimeOffset = offset;
    }
    static isSecretValid(secret) {
        return /^[a-z0-9+\\\/=]{28}$/i.test(secret);
    }
    static bufferSecret(secret) {
        if (SteamOtp.isSecretValid(secret)) {
            return Buffer.from(secret, 'base64');
        }
        else
            throw new Error('Wrong Secret Given');
    }
    ;
    static bufferToOTP(fullCode) {
        let otp = '';
        for (let i = 0; i < 5; i++) {
            otp += SteamOtp.chars.charAt(fullCode % SteamOtp.chars.length);
            fullCode /= SteamOtp.chars.length;
        }
        return otp;
    }
    getAuthCode(secret) {
        const bufferedSecret = SteamOtp.bufferSecret(secret);
        const time = Math.floor((Date.now() / 1000) + this.steamTimeOffset);
        const buffer = Buffer.allocUnsafe(8);
        buffer.writeUInt32BE(0, 0);
        buffer.writeUInt32BE(Math.floor(time / 30), 4);
        const hmac = crypto.createHmac('sha1', bufferedSecret);
        let hmacBuffer = hmac.update(buffer).digest();
        const start = hmacBuffer[19] & 0x0F;
        hmacBuffer = hmacBuffer.slice(start, start + 4);
        return SteamOtp.bufferToOTP(hmacBuffer.readUInt32BE(0) & 0x7FFFFFFF);
    }
    ;
}
SteamOtp.chars = '23456789BCDFGHJKMNPQRTVWXY';
exports.default = SteamOtp;
;
