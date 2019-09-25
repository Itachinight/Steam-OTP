import MaFile from "../models/MaFile";
import SteamTrades from "../models/SteamTrades";
require("../helpers")();

export default class TradesController {
    private readonly steamTrades: SteamTrades;

    constructor(maFile: MaFile) {
        this.steamTrades = new SteamTrades(maFile);
    }

    public async getTradesPage(): Promise<Document> {
        const tradesPage: Promise<string> = this.steamTrades.getTrades();
        const parser: DOMParser = new DOMParser();

        return parser.parseFromString(await tradesPage, "text/html");
    }

    public async getTradeDetails(tradeId: number): Promise<string> {
        return this.steamTrades.getTradeDetails(tradeId);
    }

    public async handleTrade(tag: "allow" | "cancel", id: number, key: string): Promise<boolean> {
        return this.steamTrades.handleTrade(tag, id, key);
    }
}