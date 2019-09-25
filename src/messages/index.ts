export const enum Messages {
    sesRefreshed = "Account session refreshed",
    sesRefreshErr = "Can't refresh session. Try to login to this account",
    missingFiles = "Some files were not available. Account list was refreshed",
    fileSaved = "File was successfully saved",
    unknownErr = "An unknown error occurred",
    sameFileName = "You've already had maFile with the same name",
    fileNotFound = "File with such name was not found",
    tradeFetchErr = "An error occurred while handling trades. Try to repeat your action or refresh your session",
    noAuthInfo = "Can't get Steam trades because this maFile doesn't contain auth information",
    accLoggedIn = "Login was successful"
}

export class CompositeMessages {
    public static filesSaved (saved: number, total: number): string {
        return `${saved} of ${total} files were successfully saved`;
    }

    public static deletedFile(fileName: string): string {
        return `${fileName} was Deleted`;
    }

    public static restrictedAccess(fileName: string): string {
        return `An Error occurred while handling ${fileName}. Check your accounts directory access permissions`
    }

    public static notMaFileOrDb(fileName: string): string {
        return `${fileName} is not maFile/db`;
    }

    public static invalidJson(fileName: string): string {
        return `${fileName} is not valid JSON`;
    }

    public static invalidSharedSecret(fileName: string): string {
        return `${fileName} doesn't contain valid shared secret`;
    }
}