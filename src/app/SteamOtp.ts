import * as crypto from 'crypto';

export default class SteamOtp {

    public static readonly chars: string = '23456789BCDFGHJKMNPQRTVWXY';
    public readonly steamTimeOffset: number;

    public constructor(offset: number) {
        this.steamTimeOffset = offset;
    }

    public static isSecretValid(secret: string): boolean {
        return /^[a-z0-9+\\\/=]{28}$/i.test(secret);
    }

    public static bufferSecret(secret: string): Buffer {
        if (SteamOtp.isSecretValid(secret)) {
            return Buffer.from(secret, 'base64');
        } else throw new Error('Wrong Secret Given');
    };


    private static bufferToOTP(fullCode: number): string {
        let otp: string = '';

        for (let i = 0; i < 5; i++) {
            otp += SteamOtp.chars.charAt(fullCode % SteamOtp.chars.length);
            fullCode /= SteamOtp.chars.length;
        }

        return otp;
    }

    public static getConfirmationKey(identitySecret: string, time: number, tag: string): string {
        const bufferedIdentitySecret: Buffer = SteamOtp.bufferSecret(identitySecret);
        let dataLen: number = 8;

        if (tag) {
            if (tag.length > 32) {
                dataLen += 32;
            } else {
                dataLen += tag.length;
            }
        }

        const buffer: Buffer = Buffer.allocUnsafe(dataLen);
        buffer.writeUInt32BE(0, 0);
        buffer.writeUInt32BE(time, 4);

        if (tag) buffer.write(tag, 8);

        const hmac: crypto.Hmac = crypto.createHmac('sha1', bufferedIdentitySecret);
        return hmac.update(buffer).digest('base64');
    };

    public getAuthCode(sharedSecret: string): string {
        const bufferedSharedSecret: Buffer = SteamOtp.bufferSecret(sharedSecret);
        const time: number = Math.floor((Date.now() / 1000) + this.steamTimeOffset);
        const buffer: Buffer = Buffer.allocUnsafe(8);

        buffer.writeUInt32BE(0, 0);
        buffer.writeUInt32BE(Math.floor(time / 30), 4);

        const hmac: crypto.Hmac = crypto.createHmac('sha1', bufferedSharedSecret);
        let hmacBuffer: Buffer = hmac.update(buffer).digest();
        const start: number = hmacBuffer[19] & 0x0F;

        hmacBuffer = hmacBuffer.slice(start, start + 4);

        return SteamOtp.bufferToOTP(hmacBuffer.readUInt32BE(0) & 0x7FFFFFFF);
    };
};