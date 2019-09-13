"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const MainController_1 = require("../controllers/MainController");
const AllSettled = require("promise.allsettled");
const jQuery = require("jquery");
const mCustomScrollbar = require("malihu-custom-scrollbar-plugin");
const electron_1 = require("electron");
jQuery(async ($) => {
    const app = await MainController_1.default.getInstance();
    mCustomScrollbar($);
    const $body = $('body');
    const $filesSelector = $('#files');
    const $otp = $('#otp p');
    const $err = $('#err p');
    const $dropZone = $('#from-file');
    const $progressBar = $('#progress > div');
    const $secret = $('#secret');
    const $loginInput = $('#login');
    const $passwordInput = $('#password');
    const $modalWrapper = $('#modal-wrapper');
    const scrollBarOpts = {
        theme: "minimal",
        scrollInertia: 350,
        mouseWheel: {
            preventDefault: true,
            scrollAmount: 200,
        }
    };
    async function toggleActiveFile($elem) {
        const fullPath = $elem.data('fullPath');
        $filesSelector.find('li.active-file').removeClass('active-file');
        $elem.addClass('active-file');
        try {
            const otp = await app.get2FaFromFile(fullPath);
            $loginInput.val(otp.maFile.account_name);
            $passwordInput.val('');
            renderOtp(otp);
        }
        catch (err) {
            console.error(err);
            renderMessage('Some Files Are Not Available. Account List Refreshed');
            await updateFilesList();
        }
    }
    async function uploadFiles(files) {
        const results = await AllSettled(files.map(file => app.saveToConfig(file.path)));
        let countSuccessfulFiles = 0;
        if (results.length === 1) {
            const result = results[0];
            if (result.status === 'rejected') {
                const { message } = result.reason;
                renderMessage(message);
            }
            else
                renderMessage('File was successfully saved');
        }
        else {
            results.forEach((result) => {
                if (result.status === 'rejected')
                    return;
                countSuccessfulFiles++;
            });
            renderMessage(`${countSuccessfulFiles} of ${results.length} files were successfully saved`);
        }
        await updateFilesList();
    }
    async function updateFilesList() {
        $filesSelector.mCustomScrollbar('destroy').empty();
        const files = await app.getConfigFilesList();
        if (files.length !== 0) {
            files.forEach(file => {
                $filesSelector.append(`<li data-full-path="${file.fullPath}">${file.base}</li>`);
            });
            $filesSelector.mCustomScrollbar(scrollBarOpts);
            await toggleActiveFile($filesSelector.find('li:first-of-type'));
        }
    }
    function renderOtp(otp) {
        const { code } = otp;
        $otp.fadeOut(125, () => $otp.text(code)).fadeIn(125);
    }
    function renderMessage(message) {
        $err.text(message).fadeIn(750, () => {
            setTimeout(() => $err.fadeOut(500, () => $err.empty()), 2500);
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
    (function updateOtp($progressBar) {
        setInterval(() => {
            const time = Math.round(Date.now() / 1000) + app.steamTimeOffset;
            const count = time % 30;
            $progressBar.css('width', `${Math.round(100 / 29 * count)}%`);
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
    }($progressBar));
    await updateFilesList();
    $('#loader').fadeOut(1000);
    $body.on('dragenter', () => {
        switchSection($('#nav li:nth-of-type(2) a'));
    });
    $dropZone
        .on('dragover', function (event) {
        event.preventDefault();
        $dropZone.addClass('file-over');
    })
        .on('dragleave', function (event) {
        event.preventDefault();
        $dropZone.removeClass('file-over');
    })
        .on('drop', async function (event) {
        event.preventDefault();
        $dropZone.removeClass('file-over');
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
    $body.on('click contextmenu dblclick', $body.not($('li.active-file')), () => {
        $('#context-menu').css('visibility', 'hidden');
    });
    $filesSelector
        .on('click', 'li', async function () {
        const $elem = $(this);
        if (!$elem.hasClass('active-file'))
            await toggleActiveFile($elem);
    })
        .on('contextmenu', 'li.active-file', function (event) {
        event.stopPropagation();
        const clientX = event.clientX;
        const x = document.documentElement.clientWidth - clientX > 120 ? clientX : clientX - 180;
        const y = event.clientY;
        const $contextMenu = $('#context-menu');
        $contextMenu
            .css('visibility', 'visible')
            .css('top', `${y}px`)
            .css('left', `${x}px`);
    });
    $secret
        .on("keydown", function (event) {
        if (event.key === "Enter" && $secret.hasClass("valid")) {
            const secret = $(this).val();
            try {
                const otp = app.get2FaFromSecret(secret);
                $filesSelector.find('li.active-file').removeClass('active-file');
                renderOtp(otp);
            }
            catch (err) {
                renderMessage(err.message);
            }
        }
    })
        .on("input", () => {
        if (MainController_1.default.verifySharedSecret($secret.val())) {
            $secret.removeClass("invalid").addClass("valid");
        }
        else {
            $secret.removeClass("valid").addClass("invalid");
        }
    });
    $('.auth-data').on('click', (event) => event.stopPropagation());
    $('#session').on('click', () => $modalWrapper.fadeIn(350));
    $modalWrapper.on('click', () => $modalWrapper.fadeOut(350));
    $('#trades').on('click', () => {
        const maFile = app.currentMaFile;
        electron_1.ipcRenderer.send("open-trades", maFile);
    });
    $('#send').on('click', async () => {
        const login = $loginInput.val();
        const password = $passwordInput.val();
        $modalWrapper.fadeOut(450);
        await app.updateSession(login, password);
    });
    $otp.on('click', () => {
        const $wrapper = $otp.parent();
        const otp = $otp.text();
        navigator.clipboard.writeText(otp);
        $wrapper.removeClass('copied');
        setTimeout(() => $wrapper.addClass('copied'), 20);
    });
    const $close = $('#close-btn');
    const $minimize = $('#minimize-btn');
    $close
        .on('mouseleave mouseup', () => $close.blur())
        .on('click', () => window.close());
    $minimize
        .on('mouseleave mouseup', () => $minimize.blur())
        .on('click', () => electron_1.ipcRenderer.send('main-minimize'));
});
