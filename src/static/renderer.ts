import App from '../app/app';
import * as helper from '../app/helper';
import * as AllSettled from 'promise.allsettled'
import * as jQuery from 'jquery';
import * as mCustomScrollbar from 'malihu-custom-scrollbar-plugin';
import CustomScrollbarOptions = MCustomScrollbar.CustomScrollbarOptions;
import {AccountAuthData, FullFilePath, WebKitDragEvent, WebKitFile} from "../app";
import Event = JQuery.Event;

jQuery(async ($) => {
    mCustomScrollbar($);
    const $filesSelector: JQuery = $('#files');
    const $otp: JQuery = $('#otp p');
    const $err: JQuery = $('#err p');
    const $secret: JQuery = $('#secret');
    const $drop: JQuery = $('#from-file');
    const $progress: JQuery = $('#progress > div');
    const scrollBarOpts: CustomScrollbarOptions = {
        theme: 'minimal-dark',
        scrollInertia: 350,
        mouseWheel: {
            preventDefault: true,
            scrollAmount: 150,
        }
    };

    const app: App = await App.getInstance();
    $('#loader').fadeOut(600);

    async function toggleActiveFile($elem: JQuery) {
        const fileName: string = $elem.attr('value');
        $filesSelector.find('li').removeClass('active-file');
        $elem.addClass('active-file');

        try {
            const otp: AccountAuthData = await app.get2faFromFile(fileName);
            renderOtp(otp);
        } catch (err) {
            console.error(err);
            renderError(new Error('File Is Not Available. Account List Refreshed'));
            await updateFilesList();
        }
    }

    async function uploadFiles(files: WebKitFile[]) {
        const results = await AllSettled(files.map(async file => await app.saveToConfig(file.path)));

        await helper.asyncForEach(results,async function(result) {
            if (result.status === 'rejected') {
                let message: string = result.reason;
                if (message !== $err.text()) {
                    await renderError(new Error(message));
                }
            }
        });

        await updateFilesList();
    }

    async function updateFilesList(): Promise<void> {
        $filesSelector.mCustomScrollbar('destroy').empty();
        const files: FullFilePath[] = await app.getConfigFiles();

        if(files.length !== 0) {
            files.forEach(file => {
                $filesSelector.append(`<li value="${file.fullPath}">${file.base}</li>`);
            });

            $filesSelector.mCustomScrollbar(scrollBarOpts);

            await toggleActiveFile($filesSelector.find('li:first-of-type'));
        }
    }

    function renderOtp(otp: AccountAuthData) {
        const { code } = otp;
        $otp.fadeOut(125, () => $otp.text(code)).fadeIn(125);
    }

    function renderError(err: Error) {
        console.error(err);
        const { message } = err;
        return new Promise(resolve => {
            $err.text(message).fadeIn(750, () => {
                setTimeout(() => $err.fadeOut(500, () => $err.empty()), 2500)
            });
            resolve(message);
        });
    }

    function switchSection($link: JQuery): void {
        toggleActiveMenu($link);
        toggleActiveSection($link.attr('href'));
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

    (function updateOtp(): void {
        setInterval(() => {
            const time: number = Math.round(Date.now() / 1000) + app.steamTimeOffset;
            const count: number = time % 30;

            $progress.css('width', `${Math.round(100 / 29 * count)}%`);

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
    }());

    await updateFilesList();

    // Events //

    $('body').on('dragenter', () => {
        switchSection($('#nav li:nth-of-type(2) a'));
    });

    $drop
        .on('dragover', function(event: Event) {
            event.preventDefault();
            $drop.addClass('file-over');
        })
        .on('dragleave',function(event: Event) {
            event.preventDefault();
            $drop.removeClass('file-over');
        })
        .on('drop', async function (event: any) {
            event.preventDefault();
            $drop.removeClass('file-over');

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

    $filesSelector.on('click', 'li', async function() {
        await toggleActiveFile($(this));
    });

    $secret.on('keydown', function (event) {
        if (event.key === 'Enter') {
            const secret: string = <string>$(this).val();

            try {
                const otp: AccountAuthData = app.get2FaFormSecret(secret);
                $filesSelector.find('li').removeClass('active-file');
                renderOtp(otp);
            } catch (err) {
                renderError(err);
            }
        }
    });

    $otp.on('click', () => {
        const $wrapper: JQuery = $otp.parent();
        const otp: string = $otp.text();

        $wrapper.removeClass('copied');
        setTimeout(() => $wrapper.addClass('copied'),20);

        navigator.clipboard.writeText(otp);
    });
});