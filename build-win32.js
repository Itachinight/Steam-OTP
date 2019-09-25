const electronPackager = require("electron-packager");
const {promisify} = require("util");
const {join} = require("path");
const copyFile = promisify(require("fs").copyFile);

const opts = {
    asar: true,
    dir: "./",
    icon: "./favicon.ico",
    out: "./",
    ignore: [/backup/, /accounts/, /.idea/],
    name: "Steam-Otp",
    arch: "x64",
    platform: "win32"
};

(async (opts) => {
    const [appPath] = await electronPackager(opts);
    await copyFile("./.env", join(appPath, ".env"));

    console.log(`App created at ${appPath}`);
})(opts);