import {Hmac, createHmac} from "crypto";

export default class SteamOtp {

    public static readonly chars: string = "23456789BCDFGHJKMNPQRTVWXY";

    public constructor(public readonly steamTimeOffset: number) {}

    public static isSecretValid(secret?: any): boolean {
        if (typeof secret !== "string") return false;
        return /^[a-z0-9+\/=]{28}$/i.test(secret);
    }

    public static bufferSecret(secret: string): Buffer {
        if (!SteamOtp.isSecretValid(secret)) throw new Error("Wrong Secret Given");

        return Buffer.from(secret, "base64");
    }


    private static bufferToOTP(bufferValue: number): string {
        let otp: string = "";

        for (let i = 0; i < 5; i++) {
            otp += SteamOtp.chars.charAt(bufferValue % SteamOtp.chars.length);
            bufferValue /= SteamOtp.chars.length;
        }

        return otp;
    }

    public static getConfirmationKey(identitySecret: string, time: number, tag: string): string {
        const bufferedIdentitySecret: Buffer = SteamOtp.bufferSecret(identitySecret);
        let dataLength: number = 8;

        if (tag.length > 32) {
            dataLength += 32;
        } else {
            dataLength += tag.length;
        }

        const buffer: Buffer = Buffer.allocUnsafe(dataLength);
        buffer.writeUInt32BE(0, 0);
        buffer.writeUInt32BE(time, 4);

        if (tag) buffer.write(tag, 8);

        const hmac: Hmac = createHmac("sha1", bufferedIdentitySecret);
        return hmac.update(buffer).digest("base64");
    }

    public getAuthCode(sharedSecret: string): string {
        const bufferedSharedSecret: Buffer = SteamOtp.bufferSecret(sharedSecret);
        const time: number = Date.timestamp() + this.steamTimeOffset;
        const buffer: Buffer = Buffer.allocUnsafe(8);

        buffer.writeUInt32BE(0, 0);
        buffer.writeUInt32BE(Math.floor(time / 30), 4);

        const hmac: Hmac = createHmac("sha1", bufferedSharedSecret);
        let hmacBuffer: Buffer = hmac.update(buffer).digest();
        const start: number = hmacBuffer[19] & 0x0F;

        hmacBuffer = hmacBuffer.slice(start, start + 4);

        return SteamOtp.bufferToOTP(hmacBuffer.readUInt32BE(0) & 0x7FFFFFFF);
    }
}