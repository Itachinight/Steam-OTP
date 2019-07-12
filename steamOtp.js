function bufferizeSecret(secret) {
    if (typeof secret === 'string') {
        if (secret.match(/[0-9a-f]{40}/i)) {
            return Buffer.from(secret, 'hex');
        } else if (secret.length === 28) {
            return Buffer.from(secret, 'base64');
        } throw new Error('Wrong Secret Given');
    } throw new Error('Wrong Secret Given');
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

exports.getAuthCode = async secret => {
    secret = bufferizeSecret(secret);
    const Crypto = require('crypto');
    const steamTimeAligner = require('./steamTimeAligner');

    let offset = await steamTimeAligner.getOffset();
    let time = Math.floor((Date.now() / 1000) + offset);
    let buffer = Buffer.allocUnsafe(8);
    let hmac = Crypto.createHmac('sha1', secret);

    buffer.writeUInt32BE(0, 0); // This will stop working in 2038!
    buffer.writeUInt32BE(Math.floor(time / 30), 4);
    hmac = hmac.update(buffer).digest();

    let start = hmac[19] & 0x0F;
    hmac = hmac.slice(start, start + 4);

    return bufferToOTP(hmac.readUInt32BE(0) & 0x7FFFFFFF);
};