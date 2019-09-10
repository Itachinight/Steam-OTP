declare module "steam-user" {
    namespace SteamUser {
    }

    class SteamUser {
        constructor()

        public logOn(logOnOptions: LogOnOptionsPassword | LogOnOptionsLoginKey): void

        public on(event: "webSession", callback: WebSessionCallback): void
        public on(event: "error", callback: ErrorCallback): void
        public on(event: "loginKey", callback: LoginKeyCallback): void
    }

    interface WebSessionCallback {
        (sessionId: number, cookies: string[]): void
    }

    interface ErrorCallback {
        (error: Error): void
    }

    interface LoginKeyCallback {
        (key: string): void
    }

    interface LogOnOptionsPassword {
        accountName: string
        password: string
        twoFactorCode: string
        rememberPassword?: boolean
    }

    interface LogOnOptionsLoginKey {
        accountName: string
        loginKey: string
        rememberPassword?: boolean
    }

    export = SteamUser
}