import BigNumber from "bignumber.js";

interface Session {
    SteamLogin: string|null
    WebCookie: string|null
    SessionID: string|null
    SteamLoginSecure: string|null
    OAuthToken: string|null
    SteamID: BigNumber
}