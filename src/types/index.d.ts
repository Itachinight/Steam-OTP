import {ParsedPath} from "path";
import MaFile from "../models/MaFile";

interface FullFilePath extends ParsedPath {
    fullPath?: string
}

interface AccountAuthData {
    maFile: MaFile,
    code: string,
}