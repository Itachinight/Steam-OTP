const app = require('./2fa.js');
const pathToConfig = 'config';
window.$ = window.jQuery = require('jquery');

$(() => {
    let $filesSelector = $('#files');
    let $opt = $('#otp p');
    let $err = $('#err p');
    let $secret = $('#secret');
    let $drop = $('#from-file');

    app.getConfigFiles(pathToConfig).then(values => values.forEach(value => {
        $filesSelector.append(`<option value="${value}">${value}</option>`);
    }));

    $filesSelector.on('change', function() {
        let file = $(this).val();
        app.get2faFromFile(pathToConfig, file).then(otp => renderOtp(otp))
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
            try {
                let otp = app.get2FaFormSecret( $(this).val() );
                renderOtp(otp);
            } catch (err) {
                renderError(err);
            }
        }
    });

    function getOtpFromFiles(path, file) {
        app.get2faFromFile(path, file).then(otp => renderOtp(otp));

    }
    function renderOtp(otp) {
        $opt.fadeOut(250, () => $opt.text(otp.code)).fadeIn(250);
    }

    function renderError(err) {
        $err.text(err.message);
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
});