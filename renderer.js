const app = require('./router');
const steamTimeAligner = require('./steamTimeAligner');
const pathToConfig = 'config';
window.$ = window.jQuery = require('jquery');

$(() => {
    let $filesSelector = $('#files');
    let $otp = $('#otp p');
    let $err = $('#err p');
    let $secret = $('#secret');
    let $drop = $('#from-file');
    let $secretStorage = $('#shared-secret');
    let $progress = $('#progress > div');

    app.getConfigFiles(pathToConfig).then(values => values.forEach(value => {
        $filesSelector.append(`<option value="${value}">${value}</option>`);
    }));

    $filesSelector.on('change', function() {
        let file = $(this).val();
        app.get2faFromFile(pathToConfig, file).then(otp => renderOtp(otp))
    });

    $otp.on('dblclick', () => {
        let $temp = $('<input>');
        $('body').append($temp);
        $temp.val($otp.text()).select();
        document.execCommand("copy");
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
            for (let file of event.originalEvent.dataTransfer.files) {
                getOtpFromFiles(file.path.replace(file.name, ''), file.name);
            }
        });

    $('#nav a').on('click' , function (event) {
        event.preventDefault();
        toggleActiveMenu(this);
        toggleActiveSection($(this).attr('href'));
    });

    $secret.on('keydown', function (event) {
        if (event.keyCode === 13) {
            app.get2FaFormSecret( $(this).val() ).then(otp => renderOtp(otp), err => renderError(err));
        }
    });

    function getOtpFromFiles(path, file) {
        app.get2faFromFile(path, file).then(otp => renderOtp(otp));

    }

    function renderOtp(otp = false) {
        $secretStorage.val(otp.secret);
        crossFade($otp, otp.code);
    }

    function renderError(err) {
        crossFade($err, err.message);
    }

    function crossFade($elem, text, duration = 200) {
        $elem.fadeOut(duration, () => $elem.text(text)).fadeIn(duration);
    }

    function toggleActiveMenu(elem) {
        $('header > ul > li > a').removeClass('active');
        $(elem).addClass('active');
    }

    function toggleActiveSection(elem) {
        let $elem = $(elem);
        let $sections = $('section');
        $sections.removeClass('active visible');
        $elem.addClass('active');
        setTimeout(() => $elem.addClass('visible'), 20);
    }

    !async function updateOtp() {
        let offset = await steamTimeAligner.getOffset();
        setInterval(() => {
            let remainingSecs = Math.round(Date.now() / 1000);
            let count = (remainingSecs + offset) % 30;
            let secret = $secretStorage.val();

            $progress.css('width', `${Math.round(100 / 29 * count)}%`);
            console.log(count);

            if (count === 0 && secret !== '') {
                app.get2FaFormSecret(secret).then(otp => renderOtp(otp))
            }
        }, 1000);
    }()

});