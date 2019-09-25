declare namespace NodeJS {
    interface Global {
        sharedObject: SharedObject
    }
}

interface DateConstructor {
    timestamp(): number;
}

interface Array<T> {
    asyncFilter<T>(callback: AsyncFilterCallback): Promise<T[]>
}

interface AsyncFilterCallback {
    (item: any): Promise<boolean>
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
