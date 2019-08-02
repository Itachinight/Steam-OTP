"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fetch_1 = require("node-fetch");
class SteamTimeAligner {
    constructor() {
        this.controller = new AbortController();
        const { signal } = this.controller;
        this.url = "https://api.steampowered.com/ITwoFactorService/QueryTime/v1/";
        this.params = {
            signal,
            method: 'POST',
            headers: {
                'Content-Length': '0'
            },
        };
    }
    async getTime() {
        setTimeout(() => this.controller.abort(), 2000);
        const res = await node_fetch_1.default(this.url, this.params);
        const json = await res.json();
        return parseInt(json.response.server_time, 10);
    }
    async getOffset() {
        try {
            const time = await this.getTime();
            return time - Math.round(Date.now() / 1000);
        }
        catch (err) {
            console.error(err.message);
            return 0;
        }
    }
    ;
}
exports.default = SteamTimeAligner;
