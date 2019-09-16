import MainController from '../controllers/MainController';
import * as AllSettled from 'promise.allsettled'
import * as jQuery from 'jquery';
import * as mCustomScrollbar from 'malihu-custom-scrollbar-plugin';
import CustomScrollbarOptions = MCustomScrollbar.CustomScrollbarOptions;
import {AccountAuthData, FullFilePath} from "../types";
import Event = JQuery.Event;
import {ipcRenderer} from "electron";
import MaFile from "../models/MaFile";
import {PromiseResult} from "promise.allsettled";
import ClickEvent = JQuery.ClickEvent;

jQuery(async ($) => {
    const app: MainController = await MainController.getInstance();

    mCustomScrollbar($);
    const $body = $('body');
    const $filesSelector: JQuery<Element> = $('#files');
    const $otp: JQuery<Element> = $('#otp p');
    const $msg: JQuery<Element> = $('#msg-area p');
    const $dropZone: JQuery<Element> = $('#from-file');
    const $progressBar: JQuery<Element> = $('#progress > div');
    const $secret: JQuery<HTMLInputElement> = $('#secret');
    const $loginInput: JQuery<HTMLInputElement> = $('#login');
    const $passwordInput: JQuery<HTMLInputElement> = $('#password');
    const $modalWrapper: JQuery<Element> = $('#modal-wrapper');

    const scrollBarOpts: CustomScrollbarOptions = {
        theme: "minimal",
        scrollInertia: 350,
        mouseWheel: {
            preventDefault: true,
            scrollAmount: 200,
        }
    };

    async function toggleActiveFile($elem: JQuery<Element>) {
        const fullPath: string = <string> $elem.data('fullPath');
        $filesSelector.find('li.active-file').removeClass('active-file');
        $elem.addClass('active-file');

        const elemNumber: number = parseInt($elem.data('id'));
        const numberToScroll: number = elemNumber > 4 ? elemNumber-4 : 1;
        $filesSelector.mCustomScrollbar('scrollTo', $(`li[data-id ="${numberToScroll}"]`));

        try {
            const otp: AccountAuthData = await app.get2FaFromFile(fullPath);
            $loginInput.val(otp.maFile.account_name);
            $passwordInput.val('');
            renderOtp(otp);
        } catch (err) {
            console.error(err);
            renderMessage('Some Files Are Not Available. Account List Refreshed');
            await updateFilesList();
        }
    }

    async function uploadFiles(files: WebKitFile[]) {
        const results: PromiseResult<Promise<void>, unknown>[] = await AllSettled(files.map(file => app.saveToConfig(file.path)));
        let successfulFiles: number = 0;

        if (results.length === 1) {
            const result: PromiseResult<Promise<void>, unknown> = results[0];
            if (result.status === 'rejected') {
                const {message} = <Error> result.reason;
                renderMessage(message);
            } else renderMessage('File was successfully saved');
        } else {
            results.forEach((result: PromiseResult<Promise<void>, unknown>) => {
                if (result.status === 'rejected') return;
                successfulFiles++;
            });

            renderMessage(`${successfulFiles} of ${results.length} files were successfully saved`);
        }

        if (successfulFiles != 0) await updateFilesList();
    }

    async function updateFilesList(): Promise<void> {
        $filesSelector.mCustomScrollbar('destroy').empty();
        const files: FullFilePath[] = await app.getConfigFilesList();

        if(files.length !== 0) {
            let i: number = 1;

            files.forEach(file => {
                $filesSelector.append(`<li data-id="${i++}" data-full-path="${file.fullPath}">${file.base}</li>`);
            });

            $filesSelector.mCustomScrollbar(scrollBarOpts);

            await toggleActiveFile($filesSelector.find('li:first-of-type'));
        }
    }

    function renderOtp(otp: AccountAuthData) {
        const { code } = otp;
        $otp.fadeOut(125, () => $otp.text(code)).fadeIn(125);
    }

    function renderMessage(message: string) {
        $msg.text(message).fadeIn(750, () => {
            setTimeout(() => $msg.fadeOut(500, () => $msg.empty()), 2000)
        });
    }

    function switchSection($link: JQuery): void {
        toggleActiveMenu($link);
        toggleActiveSection(<string>$link.attr('href'));
    }

    function toggleActiveMenu($elem: JQuery): void {
        $('header > ul > li > a').removeClass('active');
        $elem.addClass('active');
    }

    function toggleActiveSection(elem: string): void {
        let $elem: JQuery = $(elem);
        let $sections: JQuery = $('section');

        $sections.removeClass('active visible');
        $elem.addClass('active');
        setTimeout(() => $elem.addClass('visible'), 20);
    }

    (function updateOtp($progressBar: JQuery<Element>): void {
        setInterval(() => {
            const time: number = Math.round(Date.now() / 1000) + app.steamTimeOffset;
            const count: number = time % 30;

            $progressBar.css('width', `${Math.round(100 / 29 * count)}%`);

            if (count === 1) {
                (function reload(): void {
                    const otp: AccountAuthData = app.refresh2Fa();
                    if (otp.code !== $otp.text()) {
                        console.log('new code');
                        renderOtp(otp)
                    } else {
                        console.log('miss');
                        setTimeout(reload, 500);
                    }
                }());
            }
        }, 1000);
    }($progressBar));

    await updateFilesList();

    $('#loader').fadeOut(700);

    // Events //

    $body.on('dragenter', () => {
        switchSection($('#nav li:nth-of-type(2) a'));
    });

    $dropZone
        .on('dragover', function(event: Event) {
            event.preventDefault();
            $dropZone.addClass('file-over');
        })
        .on('dragleave',function(event: Event) {
            event.preventDefault();
            $dropZone.removeClass('file-over');
        })
        .on('drop', async function (event: any) {
            event.preventDefault();
            $dropZone.removeClass('file-over');

            const originalEvent: WebKitDragEvent = event.originalEvent;
            const files: WebKitFile[] = Object.values(originalEvent.dataTransfer.files);

            await uploadFiles(files);
        });

    $('#nav li a').on('click' , function (event) {
        event.preventDefault();
        const $link = $(this);

        if ($link.hasClass('active')) return false;
        switchSection($link);
    });

    $body.on('click contextmenu dblclick', $body.not($('li.active-file')), () => {
        $('#context-menu').css('visibility', 'hidden');
    });


    $filesSelector
        .on('click', 'li', async function () {
            const $elem: JQuery = $(this);
            if (!$elem.hasClass('active-file')) await toggleActiveFile($elem);
        })
        .on('contextmenu', 'li', async function (event: Event) {
            const $elem: JQuery = $(this);
            if (!$elem.hasClass('active-file')) await toggleActiveFile($elem);
            showContextMenu(event);
        })
        .on('contextmenu', 'li.active-file', showContextMenu);

    function showContextMenu(event: Event) {
        event.stopPropagation();
        const clientX: number = <number> event.clientX;
        const x: number = document.documentElement.clientWidth - clientX > 120 ? clientX : clientX - 180;
        const y: number = <number> event.clientY;
        const $contextMenu = $('#context-menu');

        $contextMenu
            .css('visibility', 'visible')
            .css('top', `${y}px`)
            .css('left', `${x}px`);
    }

    $secret
        .on("keydown", function (event: Event) {
            if (event.key === "Enter" && $secret.hasClass("valid")) {
                const secret: string = <string> $(this).val();

                try {
                    const otp: AccountAuthData = app.get2FaFromSecret(secret);
                    $filesSelector.find('li.active-file').removeClass('active-file');
                    renderOtp(otp);
                } catch (err) {
                    renderMessage(err.message);
                }
            }
        })
        .on("input", () => {
            if (MainController.verifySharedSecret(<string> $secret.val())) {
                $secret.removeClass("invalid").addClass("valid");
            } else {
                $secret.removeClass("valid").addClass("invalid");
            }
        });

    $('#trades').on('click', () => {
        const maFile: MaFile = app.currentMaFile;
        ipcRenderer.send("open-trades", maFile);
    });

    $('#refresh-session').on('click', async () => {
        try {
            await app.refreshSession();
            renderMessage("Account Session Refreshed");
        } catch (err) {
            renderMessage(err);
        }

    });

    $('#delete').on('click', async () => {
        const $activeFile: JQuery<Element> = $('li.active-file');
        const fileName: string = await app.deleteFile();
        await toggleActiveFile($activeFile.next());
        $activeFile.remove();
        renderMessage(`${fileName} Was Deleted`);
    });

    $('.auth-data').on('click', (event: ClickEvent) => event.stopPropagation());
    $('#login-again').on('click', () => $modalWrapper.fadeIn(350));
    $modalWrapper.on('click', () => $modalWrapper.fadeOut(300));

    $('#send').on('click', async () => {
        const login: string = <string> $loginInput.val();
        const password: string = <string> $passwordInput.val();

        $modalWrapper.fadeOut(400);
        await app.login(login, password);
    });

    $otp.on('click', () => {
        const $wrapper: JQuery<Element> = $otp.parent();
        const otp: string = $otp.text();

        navigator.clipboard.writeText(otp);

        $wrapper.removeClass('copied');
        setTimeout(() => $wrapper.addClass('copied'),20);
    });

    const $close = $('#close-btn');
    const $minimize = $('#minimize-btn');

    $close
        .on('mouseleave mouseup', () => $close.trigger('blur'))
        .on('click', () => window.close());

    $minimize
        .on('mouseleave mouseup', () => $minimize.trigger('blur'))
        .on('click', () => ipcRenderer.send('main-minimize'));

});