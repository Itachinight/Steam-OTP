declare module "steamcommunity" {
    namespace SteamCommunity {}
    
    class SteamCommunity {
        constructor()
        
        public login(options: LoginOptions, callback: LoginCallback): void
        public oAuthLogin(steamGuard: string, oAuthToken: string, callback: OAuthLoginCallback): void
    }
    
    interface LoginOptions {
        accountName: string
        password: string
        steamguard?: string // only required if logging in with a Steam Guard authorization
        authCode?: string // only required if logging in with a new email auth code
        twoFactorCode: string // only required if logging in with a Steam Guard app code
        captcha?: string // only required if you have been prompted with a CAPTCHA
        disableMobile?: boolean // pass `true` here to have node-steamcommunity not use the mobile login flow. This might help keep your login session alive longer, but you won't get an oAuth token in the login response.
    }
    
    interface LoginCallback {
        (error: Error, sessionID: string, cookies: string[], steamGuard?: string, oAuthToken?: string): void
    }

    interface OAuthLoginCallback {
        (error: Error, sessionID: string, cookies: string[]): void
    }

    export = SteamCommunity
}