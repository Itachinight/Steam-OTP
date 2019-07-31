const App = require('./app');
const helper = require('./helper');
Promise.allSettled = require('promise-settle');
window.jQuery = require('jquery');
window.mCustomScrollbar = require('malihu-custom-scrollbar-plugin')(jQuery);

jQuery(async ($) => {
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
    const app = new App();
    await app.init();
    $('#loader').fadeOut(600);

    async function toggleActiveFile($elem) {
        let fileName = $elem.attr('value');
        $filesSelector.find('li').removeClass('active-file');
        $elem.addClass('active-file');

        try {
            const otp = await app.get2faFromFile(fileName);
            renderOtp(otp);
        } catch (err) {
            console.error(err);
            renderError(new Error('File Is Not Available. Account List Refreshed'));
            await updateFilesList();
        }
    }

    async function uploadFiles(files) {
        let results = await Promise.allSettled(files.map(file => app.saveToConfig(file.path)));
        await helper.asyncForEach(results,async result => {
            if (result.isRejected()) {
                let message = result.reason().message;
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

        if(files.length !== 0) {
            files.forEach(file => {
                $filesSelector.append(`<li value="${file.fullPath}">${file.base}</li>`);
            });

            $filesSelector.mCustomScrollbar(scrollBarOpts);

            await toggleActiveFile($filesSelector.find('li:first-of-type'));
        }
    }

    function renderOtp(otp = false) {
        const { code } = otp;
        $otp.fadeOut(125, () => $otp.text(code)).fadeIn(125);
    }

    function renderError(err) {
        console.error(err);
        const { message } = err;
        return new Promise(resolve => {
            $err.text(message).fadeIn(750, () => {
                setTimeout(() => $err.fadeOut(500, () => $err.empty()), 2500)
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
            let time = Math.round(Date.now() / 1000);
            let count = time % 30;

            $progress.css('width', `${Math.round(100 / 29 * count)}%`);

            if (count === 1) {
                (function reload() {
                    const otp = app.refresh2Fa();
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

    $('body').on('dragenter', function () {
        switchSection($('#nav li:nth-of-type(2) a'));
    });

    $drop
        .on('dragover', event => {
            event.preventDefault();
            $drop.addClass('file-over');
        })
        .on('dragleave', event => {
            event.preventDefault();
            $drop.removeClass('file-over');
        })
        .on('drop', async event => {
            event.preventDefault();
            $drop.removeClass('file-over');
            const files = Object.values(event.originalEvent.dataTransfer.files);

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
        if (event.keyCode === 13) {
            let secret = $(this).val();
            $filesSelector.find('li').removeClass('active-file');
            try {
                const otp = app.get2FaFormSecret(secret);
                renderOtp(otp);
            } catch (err) {
                renderError(err);
            }
        }
    });

    $otp.on('click', () => {
        let $wrapper = $otp.parent();
        let otp = $otp.text();
        $wrapper.removeClass('copied');
        setTimeout(() => $wrapper.addClass('copied'),20);
        navigator.clipboard.writeText(otp);
    });
});