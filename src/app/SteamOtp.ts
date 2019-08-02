import * as crypto from 'crypto';

export default class SteamOtp {

    public readonly steamTimeOffset: number;
    public readonly chars: string;

    public constructor(offset: number) {
        this.steamTimeOffset = offset;
        this.chars = '23456789BCDFGHJKMNPQRTVWXY';
    }

    public static isSecretValid(secret: string): boolean {
        return /^[a-z0-9+\\\/=]{28}$/i.test(secret);
    }

    public static bufferSecret(secret: string): Buffer {
        if (this.isSecretValid(secret)) {
            return Buffer.from(secret, 'base64');
        } else throw new Error('Wrong Secret Given');
    };


    private bufferToOTP(fullCode: number): string {
        let otp: string = '';

        for (let i = 0; i < 5; i++) {
            otp += this.chars.charAt(fullCode % this.chars.length);
            fullCode /= this.chars.length;
        }

        return otp;
    }

    public getAuthCode(secret: string): string {
        const bufferedSecret: Buffer = SteamOtp.bufferSecret(secret);
        const time: number = Math.floor((Date.now() / 1000) + this.steamTimeOffset);
        const buffer: Buffer = Buffer.allocUnsafe(8);

        buffer.writeUInt32BE(0, 0);
        buffer.writeUInt32BE(Math.floor(time / 30), 4);

        const hmac: crypto.Hmac = crypto.createHmac('sha1', bufferedSecret);
        let hmacBuffer: Buffer = hmac.update(buffer).digest();
        let start: number = hmac[19] & 0x0F;

        hmacBuffer = hmacBuffer.slice(start, start + 4);

        return this.bufferToOTP(hmacBuffer.readUInt32BE(0) & 0x7FFFFFFF);
    };

};