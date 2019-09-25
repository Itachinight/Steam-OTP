import * as jQuery from 'jquery';
import TradesController from "../controllers/TradesController";
import MaFile from "../models/MaFile";
import {remote} from "electron";

let app: TradesController;

jQuery(async $ => {
    const maFile: MaFile = remote.getGlobal("sharedObject").maFile;
    document.title += ` - ${maFile.account_name}`;

    try {
        app = new TradesController(maFile);
        const tradesPage: Document = await app.getTradesPage();
        const $body: JQuery = $("body");
        const confirmations: JQuery = $("body > .responsive_page_frame", tradesPage);

        $body
            .append(confirmations)
            .on("click", ".mobileconf_list_entry", async function () {
                const $elem: JQuery<EventTarget> = $(this);
                const id: number = Number.parseInt($elem.data("confid"));
                const key: string = $elem.data("key");
                const html: string = await app.getTradeDetails(id);

                $("body > .responsive_page_frame").hide();
                $body.append(html, getMobileConfButtons(id, key));
            });
    } catch (err) {
        console.error(err);
        renderMessage(err.message);
        window.close();
    }
});

function renderMessage(msg: string): void {
    alert(msg);
}

function getMobileConfButtons(id: number, key: string): string {
    return `<div id="mobileconf_buttons">
                <div>
                    <div class="mobileconf_button mobileconf_button_cancel" onclick="declineTrade(${id}, '${key}')">Cancel</div>
                    <div class="mobileconf_button mobileconf_button_accept" onclick="confirmTrade(${id}, '${key}')">Accept</div>
                </div>
            </div>`
}

async function declineTrade(id: number, key: string): Promise<void> {
    await app.handleTrade("cancel", id, key);
    document.location.reload();
}

async function confirmTrade(id: number, key: string): Promise<void> {
    await app.handleTrade("allow", id, key)
    document.location.reload();
}