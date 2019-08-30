"use strict";
//Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("../app/app");
const helper = require("../app/helper");
const AllSettled = require("promise.allsettled");
const jQuery = require("jquery");
const mCustomScrollbar = require("malihu-custom-scrollbar-plugin");
jQuery(async ($) => {
    mCustomScrollbar($);
    const $filesSelector = $('#files');
    const $otp = $('#otp p');
    const $err = $('#err p');
    const $secret = $('#secret');
    const $drop = $('#from-file');
    const $progress = $('#progress > div');
    const scrollBarOpts = {
        theme: 'minimal-dark',
        scrollInertia: 350,
        mouseWheel: {
            preventDefault: true,
            scrollAmount: 150,
        }
    };
    const app = await app_1.default.getInstance();
    $('#loader').fadeOut(600);
    async function toggleActiveFile($elem) {
        const fileName = $elem.attr('value');
        $filesSelector.find('li').removeClass('active-file');
        $elem.addClass('active-file');
        try {
            const otp = await app.get2faFromFile(fileName);
            renderOtp(otp);
        }
        catch (err) {
            console.error(err);
            renderError(new Error('File Is Not Available. Account List Refreshed'));
            await updateFilesList();
        }
    }
    async function uploadFiles(files) {
        const results = await AllSettled(files.map(async (file) => await app.saveToConfig(file.path)));
        await helper.asyncForEach(results, async function (result) {
            if (result.status === 'rejected') {
                let message = result.reason;
                if (message !== $err.text()) {
                    await renderError(new Error(message));
                }
            }
        });
        await updateFilesList();
    }
    async function updateFilesList() {
        $filesSelector.mCustomScrollbar('destroy').empty();
        const files = await app.getConfigFiles();
        if (files.length !== 0) {
            files.forEach(file => {
                $filesSelector.append(`<li value="${file.fullPath}">${file.base}</li>`);
            });
            $filesSelector.mCustomScrollbar(scrollBarOpts);
            await toggleActiveFile($filesSelector.find('li:first-of-type'));
        }
    }
    function renderOtp(otp) {
        const { code } = otp;
        $otp.fadeOut(125, () => $otp.text(code)).fadeIn(125);
    }
    function renderError(err) {
        console.error(err);
        const { message } = err;
        return new Promise(resolve => {
            $err.text(message).fadeIn(750, () => {
                setTimeout(() => $err.fadeOut(500, () => $err.empty()), 2500);
            });
            resolve(message);
        });
    }
    function switchSection($link) {
        toggleActiveMenu($link);
        toggleActiveSection($link.attr('href'));
    }
    function toggleActiveMenu($elem) {
        $('header > ul > li > a').removeClass('active');
        $elem.addClass('active');
    }
    function toggleActiveSection(elem) {
        let $elem = $(elem);
        let $sections = $('section');
        $sections.removeClass('active visible');
        $elem.addClass('active');
        setTimeout(() => $elem.addClass('visible'), 20);
    }
    (function updateOtp() {
        setInterval(() => {
            const time = Math.round(Date.now() / 1000) + app.steamTimeOffset;
            const count = time % 30;
            $progress.css('width', `${Math.round(100 / 29 * count)}%`);
            if (count === 1) {
                (function reload() {
                    const otp = app.refresh2Fa();
                    if (otp.code !== $otp.text()) {
                        console.log('new code');
                        renderOtp(otp);
                    }
                    else {
                        console.log('miss');
                        setTimeout(reload, 500);
                    }
                }());
            }
        }, 1000);
    }());
    await updateFilesList();
    // Events //
    $('body').on('dragenter', () => {
        switchSection($('#nav li:nth-of-type(2) a'));
    });
    $drop
        .on('dragover', function (event) {
        event.preventDefault();
        $drop.addClass('file-over');
    })
        .on('dragleave', function (event) {
        event.preventDefault();
        $drop.removeClass('file-over');
    })
        .on('drop', async function (event) {
        event.preventDefault();
        $drop.removeClass('file-over');
        const originalEvent = event.originalEvent;
        const files = Object.values(originalEvent.dataTransfer.files);
        await uploadFiles(files);
    });
    $('#nav li a').on('click', function (event) {
        event.preventDefault();
        const $link = $(this);
        if ($link.hasClass('active'))
            return false;
        switchSection($link);
    });
    $filesSelector.on('click', 'li', async function () {
        await toggleActiveFile($(this));
    });
    $secret.on('keydown', function (event) {
        if (event.key === 'Enter') {
            const secret = $(this).val();
            try {
                const otp = app.get2FaFromSecret(secret);
                $filesSelector.find('li').removeClass('active-file');
                renderOtp(otp);
            }
            catch (err) {
                renderError(err);
            }
        }
    });
    $otp.on('click', () => {
        const $wrapper = $otp.parent();
        const otp = $otp.text();
        $wrapper.removeClass('copied');
        setTimeout(() => $wrapper.addClass('copied'), 20);
        navigator.clipboard.writeText(otp);
    });
});
