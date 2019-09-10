declare namespace NodeJS {
    interface Global {
        sharedObject: SharedObject
    }
}

interface SteamResponse {
    response: {
        server_time: string,
    }
}

interface WebKitDragEvent extends MouseEvent {
    readonly dataTransfer: WebKitDataTransfer
}

interface WebKitDataTransfer {
    files: WebKitFile[]
}

interface WebKitFile extends File {
    path: string
}

interface SharedObject {
    [propName: string]: any;
}

interface AsyncFilterCallback {
    (item: any): Promise<boolean>
}

interface AsyncForEachCallback {
    (currentValue: any, index?: number, array?: any[]): Promise<void>
}