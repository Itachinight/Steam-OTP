const app = require('./router');
const allSettled = require('promise-settle');
const pathToConfig = 'config';
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
        app.get2faFromFile(pathToConfig, fileName).then(
            otp => renderOtp(otp),
            err => {
                renderError(new Error("File is not available. Account list had been refreshed"));
                updateFilesList();
            }
        );
    }

    $otp.on('dblclick', () => {
        let $temp = $('<input>');
        $('body').append($temp);
        $temp.val($otp.text()).select();
        document.execCommand('copy');
        $temp.remove();
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
        .on('dragover', false)
        .on('drop', event => {
            event.preventDefault();
            $drop.removeClass('file-over');
            let files = Object.values(event.originalEvent.dataTransfer.files);
            uploadFiles(files);
        });

    async function uploadFiles(files) {
        allSettled(files.map(file => {
            return saveFileToConfig(file.path.replace(file.name, ''), file.name)
        })).then(async results => {
            await asyncForEach(results,async result => {
                console.log(result);
                if (result.isRejected()) {
                    let message = result.reason().message;
                    if (message !== $err.text()) {
                        await crossFade($err, message);
                    }
                }
            });
            updateFilesList();
        });
    }

    async function asyncForEach(array, callback) {
        for (let index = 0; index < array.length; index++) {
            await callback(array[index], index, array);
        }
    }

    async function updateFilesList() {
        $filesSelector.empty();
        let files = await app.getConfigFiles(pathToConfig);

        files.forEach(file => {
            $filesSelector.append(`<li value="${file}">${file}</li>`);
        });

        $filesSelector.mCustomScrollbar({
            axis:'y',
            theme:'minimal-dark',
            scrollInertia: 350,
            mouseWheel: {preventDefault: true}
        });

        toggleActiveFile($filesSelector.find('li:first-of-type'));
    }

    $('#nav li').on('click' , function (event) {
        event.preventDefault();
        let $link = $(this).children('a');
        toggleActiveMenu($link);
        toggleActiveSection($link.attr('href'));
    });

    $secret.on('keydown', function (event) {
        let secret = $(this).val();
        if (event.keyCode === 13 && secret !== $secretStorage.val()) {
            app.get2FaFormSecret(secret).then(otp => renderOtp(otp), err => renderError(err));
        }
    });

    function saveFileToConfig(path, file) {
        return new Promise((resolve,reject) => {
            app.saveToConfig(path, file).then(
                () => resolve(),
                (err) => reject(err)
            )
        });
    }

    function renderOtp(otp = false) {
        $secretStorage.val(otp.shared_secret);
        crossFade($otp, otp.code, 125);
    }

    function renderError(err) {
        crossFade($err, err.message,250);
    }

    function crossFade($elem, text, duration) {
        return new Promise(resolve => {
            $elem.fadeOut(duration, () => {
                $elem.text(text);
                resolve(text);
            }).fadeIn(duration);
        })
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
            let time = Math.round(Date.now() / 1000);// Prevent Updating Too Early
            let count = time % 30;
            let secret = $secretStorage.val();

            $progress.css('width', `${Math.round(100 / 29 * count)}%`);

            if (count === 0 && secret !== '') {
                (function reload() {
                    app.get2FaFormSecret(secret).then(otp => {
                        if (otp.code !== $otp.text()) {
                            console.log('new');
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