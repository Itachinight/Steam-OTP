export enum Messages {
    sesRefreshed = "Account session refreshed",
    sesRefreshErr = "Can't refresh session. Try To Login Again",
    missingFiles = "Some Files Are Not Available. Account List Refreshed",
    fileSaved = "File was successfully saved",
    unknownErr = "An Unknown error occurred",
    sameFileName = "You've already had maFile with the same name",

}

export class CompositeMessages {
    public static filesSaved (saved: number, total: number): string {
        return `${saved} of ${total} files were successfully saved`;
    }

    public static deletedFile(fileName: string): string {
        return `${fileName} Was Deleted`;
    }

    public static restrictedAccess(fileName: string): string {
        return `An Error occurred while handling ${fileName}.maFile. Check your accounts directory access permissions`
    }
}