const app = require('./router');
const helper = require('./helper');
const allSettled = require('promise-settle');
window.jQuery = require('jquery');
window.mCustomScrollbar = require('malihu-custom-scrollbar-plugin')(jQuery);

jQuery(($) => {
    let $filesSelector = $('#files');
    let $otp = $('#otp p');
    let $err = $('#err p');
    let $secret = $('#secret');
    let $drop = $('#from-file');
    let $secretStorage = $('#shared-secret');
    let $progress = $('#progress > div');

    $filesSelector.on('click', 'li', function() {
        toggleActiveFile($(this));
    });

    function toggleActiveFile($elem) {
        let fileName = $elem.attr('value');
        $filesSelector.find('li').removeClass('active-file');
        $elem.addClass('active-file');
        app.get2faFromFile(fileName).then(
            otp => renderOtp(otp),
            err => {
                console.log(err);
                renderError(new Error('File Is Not Available. Account List Refreshed'));
                updateFilesList();
            }
        );
    }

    $otp.on('click', () => {
        let $wrapper = $otp.parent();
        let otp = $otp.text();
        $wrapper.removeClass('copied');
        setTimeout(() => $wrapper.addClass('copied'),1);
        navigator.clipboard.writeText(otp);
    });

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
        .on('drop', event => {
            event.preventDefault();
            $drop.removeClass('file-over');
            let files = Object.values(event.originalEvent.dataTransfer.files);
            uploadFiles(files);
        });

    async function uploadFiles(files) {
        allSettled(files.map(file => {
            setTimeout(() => console.log(file), 250);
            return app.saveToConfig(file.path)
        })).then(async results => {
            await helper.asyncForEach(results,async result => {
                if (result.isRejected()) {
                    let message = result.reason().message;
                    if (message !== $err.text()) {
                        await renderError(new Error(message));
                    }
                }
            });
            updateFilesList();
        });
    }

    async function updateFilesList() {
        $filesSelector.mCustomScrollbar('destroy').empty();
        let files = await app.getConfigFiles();

        if(files.length !== 0) {
            files.forEach(file => {
                $filesSelector.append(`<li value="${file.fullPath}">${file.base}</li>`);
            });

            $filesSelector.mCustomScrollbar({
                theme: 'minimal-dark',
                scrollInertia: 350,
                mouseWheel: {preventDefault: true}
            });

            toggleActiveFile($filesSelector.find('li:first-of-type'));
        }
    }

    $('#nav li a').on('click' , function (event) {
        event.preventDefault();
        $link = $(this);
        if($link.hasClass('active')) return false;
        switchSection($link);
    });

    $secret.on('keydown', function (event) {
        let secret = $(this).val();
        if (event.keyCode === 13 && secret !== $secretStorage.val()) {
            app.get2FaFormSecret(secret).then(otp => renderOtp(otp), err => renderError(err));
        }
    });

    function renderOtp(otp = false) {
        $secretStorage.val(otp.shared_secret);
        $otp.fadeOut(125, () => $otp.text(otp.code)).fadeIn(125);
    }

    function renderError(err) {
        return new Promise(resolve => {
            $err.text(err.message).fadeIn(750, () => {
                setTimeout(() => $err.fadeOut(500, () => $err.empty()), 2500)
            });
            resolve(err.message);
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
            let secret = $secretStorage.val();

            $progress.css('width', `${Math.round(100 / 29 * count)}%`);

            if (count === 0 && secret !== '') {
                (function reload() {
                    app.get2FaFormSecret(secret).then(otp => {
                        if (otp.code !== $otp.text()) {
                            console.log('new code');
                            renderOtp(otp)
                        } else {
                            console.log('miss');
                            setTimeout(reload, 500);
                        }
                    })
                }());
            }
        }, 1000);
    }());

    updateFilesList();
});