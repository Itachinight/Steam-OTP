"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jQuery = require("jquery");
const TradesController_1 = require("../controllers/TradesController");
const electron_1 = require("electron");
let app;
try {
    const maFile = electron_1.remote.getGlobal("sharedObject").maFile;
    app = new TradesController_1.default(maFile);
    jQuery(async ($) => {
        const tradesPage = app.getTrades();
        const $body = $("body");
        const parser = new DOMParser();
        const tradesPageParsed = parser.parseFromString(await tradesPage, "text/html");
        const confirmations = $("body > .responsive_page_frame", tradesPageParsed);
        $body.append(confirmations);
        $(".mobileconf_list_entry").on("click", async function () {
            const $elem = $(this);
            const id = parseInt($elem.data('confid'));
            const key = $elem.data('key');
            console.log(id, key);
            const html = await app.getTradeDetails(id);
            $("body > .responsive_page_frame").hide();
            $("body").append(html, getMobileConfButtons(id, key));
        });
    });
}
catch (err) {
    document.write(err);
    setTimeout(() => window.close(), 2000);
}
function getMobileConfButtons(id, key) {
    return `<div id="mobileconf_buttons">
                <div>
                    <div class="mobileconf_button mobileconf_button_cancel" onclick="declineTrade(${id}, '${key}')">Cancel</div>
                    <div class="mobileconf_button mobileconf_button_accept" onclick="confirmTrade(${id}, '${key}')">Accept</div>
                </div>
            </div>`;
}
async function declineTrade(id, key) {
    console.log(await app.handleTrade("cancel", id, key));
    document.location.reload();
}
async function confirmTrade(id, key) {
    console.log(await app.handleTrade("allow", id, key));
    document.location.reload();
}
