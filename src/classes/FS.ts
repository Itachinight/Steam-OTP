import {readFile, unlink, readdir, stat, Stats, writeFile} from "fs";
import {promisify} from "util";
import {format, join, parse, ParsedPath} from "path";
import {CompositeMessages, Messages} from "../messages";
const readFilePromise = promisify(readFile);
const unlinkPromise = promisify(unlink);
const readDirPromise = promisify(readdir);
const writeFilePromise = promisify(writeFile);
const statPromise = promisify(stat);

export default abstract class FS {

    public static async readAuthFiles(filePaths: string[]): Promise<string[]> {
        const arr: string[] = [];

        for (const filePath of filePaths) {
            const stat: Stats = await statPromise(filePath);

            if (stat.isFile()) {
                const pathLowCase = filePath.toLowerCase();
                if (pathLowCase.endsWith("mafile") || pathLowCase.endsWith("db")) arr.push(filePath);
            } else if (stat.isDirectory()) {
                const dirFiles = await readDirPromise(filePath);
                const dirFilesPaths = dirFiles.map(fileBasePath => join(filePath, fileBasePath));

                arr.push(...await FS.readAuthFiles([...dirFilesPaths]));
            }
        }

        return arr;
    }

    public static async readFile(path: ParsedPath): Promise<string> {
        try {
            return await readFilePromise(format(path), "UTF-8");
        } catch (err) {
            switch (err.code) {
                case "ENOENT":
                    throw new Error(Messages.fileNotFound);
                case "EPERM":
                case "EACCES":
                    throw new Error(CompositeMessages.restrictedAccess(path.base));
                default:
                    throw new Error(Messages.unknownErr);
            }
        }
    }

    public static async writeFile(path: ParsedPath, content: string, flag: "w"|"wx"): Promise<void> {
        try {
            await writeFilePromise(format(path), content, {flag});
        } catch (err) {
            switch (err.code) {
                case "EEXIST":
                    throw new Error(Messages.sameFileName);
                case "EPERM":
                case "EACCES":
                    throw new Error(CompositeMessages.restrictedAccess(path.base));
                default:
                    throw new Error(Messages.unknownErr);
            }
        }
    }

    public static async deleteFile(path: ParsedPath): Promise<void> {
        try {
            await unlinkPromise(format(path));
        } catch (err) {
            switch (err.code) {
                case "ENOENT":
                    throw new Error(Messages.fileNotFound);
                case "EPERM":
                case "EACCES":
                    throw new Error(CompositeMessages.restrictedAccess(path.base));
                default:
                    throw new Error(Messages.unknownErr);
            }
        }
    }

    public static async readAccountsDir(dir: string): Promise<ParsedPath[]> {
        const files: string[] = await readDirPromise(dir);
        return files.map(file => {
            const fullPath = join(dir, file);
            const path: ParsedPath = parse(fullPath);
            path.ext = path.ext.toLowerCase();

            return path;
        });
    }
}