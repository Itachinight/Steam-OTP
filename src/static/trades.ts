import * as jQuery from 'jquery';
import TradesController from "../controllers/TradesController";
import MaFile from "../models/MaFile";
import {remote} from "electron"

let app: TradesController;

try {
    const maFile: MaFile = remote.getGlobal("sharedObject").maFile;
    app = new TradesController(maFile);

    jQuery(async $ => {
        const tradesPage: Promise<string> = app.getTrades();
        const $body: JQuery = $("body");
        const parser: DOMParser = new DOMParser();
        const tradesPageParsed: Document = parser.parseFromString(await tradesPage, "text/html");
        const confirmations: JQuery = $("body > .responsive_page_frame", tradesPageParsed);

        $body.append(confirmations);

        $(".mobileconf_list_entry").on("click", async function() {
            const $elem: JQuery<EventTarget> = $(this);
            const id: number = parseInt($elem.data('confid'));
            const key: string = $elem.data('key');
            console.log(id,key);
            const html: string = await app.getTradeDetails(id);

            $("body > .responsive_page_frame").hide();
            $("body").append(
                html,
                getMobileConfButtons(id, key)
            );
        })
    });
} catch (err) {
    document.write(err);
    setTimeout(() => window.close(), 2000);
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
    console.log(await app.handleTrade("cancel", id, key));
}

async function confirmTrade(id: number, key: string): Promise<void> {
    console.log(await app.handleTrade("allow", id, key));
}