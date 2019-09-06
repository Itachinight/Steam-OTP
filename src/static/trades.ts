import * as jQuery from 'jquery';
import {AccountAuthData} from "../app";
import SteamTradeConf from "../app/SteamTradeConf";

let app: SteamTradeConf;

try {
    const accountData: AccountAuthData = require('electron').remote.getGlobal('sharedObject').accountData;
    app = new SteamTradeConf(accountData);

    jQuery(async $ => {
        const tradesPage: Promise<string> = app.getTrades();
        const $body: JQuery = $("body");
        const parser: DOMParser = new DOMParser();
        const tradesPageParsed: Document = parser.parseFromString(await tradesPage, "text/html");
        const confirmations: JQuery = $("body > .responsive_page_frame", tradesPageParsed);

        $body.append(confirmations);

        $(".mobileconf_list_entry").on("click", addConfButtons)
    });
} catch (err) {
    document.write(err);
    setTimeout(() => window.close(), 2000);
}

async function addConfButtons() {
    const id: number = parseInt($(this).attr('data-confid'));
    const key: string = $(this).attr('data-key');
    const html: string = await app.getTradeDetails(id);
    $("body > .responsive_page_frame").hide();
    $("body").append(
        html,
        `<div id="mobileconf_buttons">
                <div>
                    <div class="mobileconf_button mobileconf_button_cancel" onclick="declineTrade(${id}, ${key})">Cancel</div>
                    <div class="mobileconf_button mobileconf_button_accept" onclick="confirmTrade(${id}, ${key})">Accept</div>
                </div>
            </div>`
    );
}

async function declineTrade(id: number, key: string): Promise<void> {
    console.log(await app.handleTrade("cancel", id, key));
}

async function confirmTrade(id: number, key: string): Promise<void> {
    console.log(await app.handleTrade("allow", id, key));
}