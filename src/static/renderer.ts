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
    const $err: JQuery<Element> = $('#err p');
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
        let countSuccessfulFiles: number = 0;

        if (results.length === 1) {
            const result: PromiseResult<Promise<void>, unknown> = results[0];
            if (result.status === 'rejected') {
                const {message} = <Error> result.reason;
                renderMessage(message);
            } else renderMessage('File was successfully saved');
        } else {
            results.forEach((result: PromiseResult<Promise<void>, unknown>) => {
                if (result.status === 'rejected') return;
                countSuccessfulFiles++;
            });

            renderMessage(`${countSuccessfulFiles} of ${results.length} files were successfully saved`);
        }

        await updateFilesList();
    }

    async function updateFilesList(): Promise<void> {
        $filesSelector.mCustomScrollbar('destroy').empty();
        const files: FullFilePath[] = await app.getConfigFilesList();

        if(files.length !== 0) {
            files.forEach(file => {
                $filesSelector.append(`<li data-full-path="${file.fullPath}">${file.base}</li>`);
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
        $err.text(message).fadeIn(750, () => {
            setTimeout(() => $err.fadeOut(500, () => $err.empty()), 2500)
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

    $('#loader').fadeOut(1000);

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
        .on('contextmenu', 'li.active-file', function (event: Event) {
            event.stopPropagation();
            const clientX: number = <number> event.clientX;
            const x: number = document.documentElement.clientWidth - clientX > 120 ? clientX : clientX - 180;
            const y: number = <number> event.clientY;
            const $contextMenu = $('#context-menu');

            $contextMenu
                .css('visibility', 'visible')
                .css('top', `${y}px`)
                .css('left', `${x}px`);
        });

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


    $('.auth-data').on('click', (event: ClickEvent) => event.stopPropagation());
    $('#session').on('click', () => $modalWrapper.fadeIn(350));
    $modalWrapper.on('click', () => $modalWrapper.fadeOut(350));

    $('#trades').on('click', () => {
        const maFile: MaFile = app.currentMaFile;
        ipcRenderer.send("open-trades", maFile);
    });

    $('#send').on('click', async () => {
        const login: string = <string> $loginInput.val();
        const password: string = <string> $passwordInput.val();

        $modalWrapper.fadeOut(450);
        await app.updateSession(login, password);
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
        .on('mouseleave mouseup', () => $close.blur())
        .on('click', () => window.close());

    $minimize
        .on('mouseleave mouseup', () => $minimize.blur())
        .on('click', () => ipcRenderer.send('main-minimize'));

});