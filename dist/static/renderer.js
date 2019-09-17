"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const MainController_1 = require("../controllers/MainController");
const AllSettled = require("promise.allsettled");
const jQuery = require("jquery");
const mCustomScrollbar = require("malihu-custom-scrollbar-plugin");
const path_1 = require("path");
const electron_1 = require("electron");
const messages_1 = require("../messages");
jQuery(async ($) => {
    const $body = $('body');
    const $filesSelector = $('#files');
    const $otp = $('#otp p');
    const $msg = $('#msg-area p');
    const $dropZone = $('#from-file');
    const $progressBar = $('#progress > div');
    const $secret = $('#secret');
    const $loginInput = $('#login');
    const $passwordInput = $('#password');
    const $modalWrapper = $('#modal-wrapper');
    mCustomScrollbar($);
    const scrollBarOpts = {
        theme: "minimal",
        scrollInertia: 350,
        mouseWheel: {
            preventDefault: true,
            scrollAmount: 200,
        },
        advanced: {
            autoUpdateTimeout: 3,
        }
    };
    const app = await MainController_1.default.getInstance();
    async function toggleActiveFile($elem) {
        const fullPath = $elem.data('fullPath');
        $filesSelector.find('li.active-file').removeClass('active-file');
        $elem.addClass('active-file');
        const elemNumber = parseInt($elem.attr('id'));
        const numberToScroll = elemNumber > 5 ? elemNumber - 4 : 1;
        console.log(elemNumber, numberToScroll);
        $filesSelector.mCustomScrollbar('scrollTo', $(`li[id ="${numberToScroll}"]`));
        try {
            const otp = await app.get2FaFromFile(fullPath);
            $loginInput.val(app.maFile.account_name);
            $passwordInput.val('');
            renderOtp(otp);
        }
        catch (err) {
            renderMessage(messages_1.Messages.missingFiles);
            await updateFilesList();
        }
    }
    async function uploadFiles(files) {
        const results = await AllSettled(files.map(file => app.saveToConfig(file.path)));
        let successfulFiles = 0;
        if (results.length === 1) {
            const [result] = results;
            if (result.status === "rejected") {
                const { message } = result.reason;
                renderMessage(message);
            }
            else {
                renderMessage(messages_1.Messages.fileSaved);
                await updateFilesList();
            }
        }
        else {
            results.forEach((result) => {
                if (result.status === "rejected")
                    return;
                successfulFiles++;
            });
            renderMessage(messages_1.CompositeMessages.filesSaved(successfulFiles, results.length));
            if (successfulFiles !== 0)
                await updateFilesList();
        }
    }
    async function updateFilesList() {
        $filesSelector.mCustomScrollbar("destroy").empty();
        const filesPaths = await app.getConfigFilesList();
        if (filesPaths.length !== 0) {
            let i = 1;
            filesPaths.forEach(filePath => {
                $filesSelector.append(`<li id="${i++}" data-full-path="${path_1.format(filePath)}">${filePath.base}</li>`);
            });
            $filesSelector.mCustomScrollbar(scrollBarOpts);
            await toggleActiveFile($filesSelector.find('li:first-of-type'));
        }
    }
    function renderOtp(otp) {
        $otp.fadeOut(125, () => $otp.text(otp)).fadeIn(125);
    }
    function renderMessage(message) {
        $msg.text(message).fadeIn(500, () => {
            setTimeout(() => $msg.fadeOut(500, () => $msg.empty()), 2000);
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
                    if (otp !== $otp.text()) {
                        renderOtp(otp);
                    }
                    else
                        setTimeout(reload, 1000);
                }());
            }
        }, 1000);
    }($progressBar));
    await updateFilesList();
    $('#loader').fadeOut(700);
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
        .on('contextmenu', 'li', async function (event) {
        const $elem = $(this);
        if (!$elem.hasClass('active-file'))
            await toggleActiveFile($elem);
        showContextMenu(event);
    })
        .on('contextmenu', 'li.active-file', showContextMenu);
    function showContextMenu(event) {
        event.stopPropagation();
        const clientX = event.clientX;
        const x = document.documentElement.clientWidth - clientX > 120 ? clientX : clientX - 180;
        const y = event.clientY;
        const $contextMenu = $('#context-menu');
        $contextMenu
            .css('visibility', 'visible')
            .css('top', `${y}px`)
            .css('left', `${x}px`);
    }
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
    $('#trades').on('click', () => {
        electron_1.ipcRenderer.send("open-trades", app.maFile);
    });
    $('#refresh-session').on('click', async () => {
        try {
            await app.refreshSession();
            renderMessage(messages_1.Messages.sesRefreshed);
        }
        catch (err) {
            renderMessage(err.message);
        }
    });
    $('#delete').on('click', async () => {
        try {
            const $activeFile = $('li.active-file');
            const fileName = await app.deleteFile();
            const $newActive = $activeFile.attr('id') === "1" ? $activeFile.next() : $activeFile.prev();
            await $activeFile.animate({ height: "0", padding: "0" }, 300).promise();
            $activeFile.remove();
            await toggleActiveFile($newActive);
            let id = 1;
            $filesSelector.find("li").each(function () {
                $(this).attr("id", id++);
            });
            if ($filesSelector.find("li:last-of-type").attr('id') === '9') {
                $filesSelector.mCustomScrollbar("destroy");
            }
            renderMessage(messages_1.CompositeMessages.deletedFile(fileName));
        }
        catch (err) {
            renderMessage(messages_1.Messages.unknownErr);
        }
    });
    $('.auth-data').on('click', (event) => event.stopPropagation());
    $('#login-again').on('click', () => $modalWrapper.fadeIn(400));
    $modalWrapper.on('click', () => $modalWrapper.fadeOut(300));
    $('#send').on('click', async () => {
        const login = $loginInput.val();
        const password = $passwordInput.val();
        $modalWrapper.fadeOut(400);
        try {
            await app.login(login, password);
        }
        catch (err) {
            renderMessage(err.message);
        }
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
        .on('mouseleave mouseup', () => $close.trigger('blur'))
        .on('click', () => window.close());
    $minimize
        .on('mouseleave mouseup', () => $minimize.trigger('blur'))
        .on('click', () => electron_1.ipcRenderer.send('main-minimize'));
});
