"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jQuery = require("jquery");
const TradesController_1 = require("../controllers/TradesController");
const electron_1 = require("electron");
let app;
jQuery(async ($) => {
    const maFile = electron_1.remote.getGlobal("sharedObject").maFile;
    document.title += ` - ${maFile.account_name}`;
    try {
        app = new TradesController_1.default(maFile);
        const tradesPage = await app.getTradesPage();
        const $body = $("body");
        const confirmations = $("body > .responsive_page_frame", tradesPage);
        $body
            .append(confirmations)
            .on("click", ".mobileconf_list_entry", async function () {
            const $elem = $(this);
            const id = Number.parseInt($elem.data("confid"));
            const key = $elem.data("key");
            const html = await app.getTradeDetails(id);
            $("body > .responsive_page_frame").hide();
            $body.append(html, getMobileConfButtons(id, key));
        });
    }
    catch (err) {
        console.error(err);
        renderMessage(err.message);
        window.close();
    }
});
function renderMessage(msg) {
    alert(msg);
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
    await app.handleTrade("cancel", id, key);
    document.location.reload();
}
async function confirmTrade(id, key) {
    await app.handleTrade("allow", id, key);
    document.location.reload();
}
