import * as jQuery from 'jquery';
import * as mCustomScrollbar from 'malihu-custom-scrollbar-plugin';
import CustomScrollbarOptions = MCustomScrollbar.CustomScrollbarOptions;
import {ParsedPath, format} from "path";
import {ipcRenderer, clipboard} from "electron";
import {PromiseResult} from "promise.allsettled";
import MainController from '../controllers/MainController';
import {Messages, CompositeMessages} from "../messages";

jQuery(async ($) => {
    mCustomScrollbar($);
    const $body = $("body");
    const $filesSelector: JQuery<Element> = $("#files");
    const $filesSection = $("#from-config-dir");
    const $otp: JQuery<Element> = $("#otp p");
    const $msg: JQuery<Element> = $("#msg-area p");
    const $dropZone: JQuery<Element> = $("#from-file");
    const $progressBar: JQuery<Element> = $("#progress > div");
    const $secret: JQuery<HTMLInputElement> = $("#secret");
    const $loginInput: JQuery<HTMLInputElement> = $("input[name='login']");
    const $passwordInput: JQuery<HTMLInputElement> = $("input[name='password']");
    const $modalWrapper: JQuery<Element> = $("#modal-wrapper");
    const $close: JQuery<Element> = $("#close-btn");
    const $minimize: JQuery<Element> = $("#minimize-btn");
    const scrollBarOpts: CustomScrollbarOptions = {
        theme: "minimal",
        scrollInertia: 350,
        mouseWheel: {
            preventDefault: true,
            scrollAmount: 150,
        },
        advanced: {
            autoUpdateTimeout: 5,
        }
    };

    const app: MainController = await MainController.getInstance();

    async function toggleActiveFile($elem: JQuery<Element>) {
        const fullPath: string = <string> $elem.data("fullPath");
        $filesSelector.find("li.active-file").removeClass("active-file");
        $elem.addClass("active-file");

        const elemId: number = Number.parseInt(<string> $elem.attr("id"));
        const idToScroll: number = elemId > 5 ? elemId - 4 : 1;
        $filesSelector.mCustomScrollbar("scrollTo", $(`li[id ="${idToScroll}"]`));

        try {
            const otp: string = await app.get2FaFromFile(fullPath);
            $loginInput.val(app.maFile.account_name);
            $passwordInput.val("");
            renderOtp(otp);
        } catch (err) {
            renderMessage(Messages.missingFiles);
            await updateFilesList();
        }
    }

    async function uploadFiles(files: WebKitFile[]) {
        const results: PromiseResult<Promise<void>, unknown>[] = await app.saveToConfig(files.map(file => file.path));

        let successfulFiles: number = 0;

        if (results.length === 1) {
            const [result] = results;
            if (result.status === "fulfilled") {
                renderMessage(Messages.fileSaved);
                await updateFilesList();
            } else {
                const {message} = <Error> result.reason;
                renderMessage(message);
            }
        } else {
            results.forEach((result: PromiseResult<Promise<void>, unknown>) => {
                if (result.status === "rejected") return;
                successfulFiles++;
            });

            renderMessage(CompositeMessages.filesSaved(successfulFiles, results.length));
            if (successfulFiles !== 0) await updateFilesList();
        }
    }

    async function updateFilesList(): Promise<void> {
        $filesSection
            .css("opacity", 0)
            .css("visibility", "hidden");
        $filesSelector.mCustomScrollbar("destroy").empty();

        const filesPaths: ParsedPath[] = await app.getConfigFilesList();

        if(filesPaths.length !== 0) {
            let i: number = 1;

            filesPaths.forEach(filePath => {
                $filesSelector.append(`<li id="${i++}" data-full-path="${format(filePath)}">${filePath.base}</li>`);
            });

            $filesSelector.mCustomScrollbar(scrollBarOpts);

            await toggleActiveFile($filesSelector.find("li:first-of-type"));
        }

        setTimeout(() => {
            $filesSection
                .css("visibility", "visible")
                .css("opacity", 1)
        }, 425);

    }

    function renderOtp(otp: string) {
        $otp.fadeOut(125, () => $otp.text(otp)).fadeIn(125);
    }

    function renderMessage(message: string) {
        $msg.text(message).fadeIn(500, () => {
            setTimeout(() => $msg.fadeOut(500, () => $msg.empty()), 2000)
        });
    }

    function switchSection($link: JQuery): void {
        toggleActiveMenu($link);
        toggleActiveSection(<string> $link.attr("href"));
    }

    function toggleActiveMenu($elem: JQuery): void {
        $('header > ul > li > a').removeClass("active");
        $elem.addClass("active");
    }

    function toggleActiveSection(elem: string): void {
        let $elem: JQuery = $(elem);
        let $sections: JQuery = $("section");

        $sections.removeClass("active visible");
        $elem.addClass("active");
        setTimeout(() => $elem.addClass("visible"), 20);
    }

    (function updateOtp($progressBar: JQuery<Element>): void {
        setInterval(() => {
            const time: number = Date.timestamp() + app.steamTimeOffset;
            const count: number = time % 30;

            $progressBar.css("width", `${Math.round(100 / 29 * count)}%`);

            if (count === 1) {
                (function reload(): void {
                    const otp: string = app.refresh2Fa();
                    if (otp !== $otp.text()) {
                        renderOtp(otp)
                    } else setTimeout(reload, 1000);
                }());
            }
        }, 1000);
    }($progressBar));

    await updateFilesList();

    $('#loader').fadeOut(700);

    // Events //

    $body.on("dragenter", () => {
        switchSection($("#nav li:nth-of-type(2) a"));
    });

    $dropZone
        .on("dragover", function(event: Event) {
            event.preventDefault();
            $dropZone.addClass("file-over");
        })
        .on("dragleave",function(event: Event) {
            event.preventDefault();
            $dropZone.removeClass("file-over");
        })
        .on("drop", async function (event: any) {
            event.preventDefault();
            $dropZone.removeClass("file-over");

            const originalEvent: WebKitDragEvent = event.originalEvent;
            const files: WebKitFile[] = Object.values(originalEvent.dataTransfer.files);

            await uploadFiles(files);
        });

    $("#nav li a").on("click" , function (event) {
        event.preventDefault();
        const $link = $(this);

        if ($link.hasClass("active")) return false;
        switchSection($link);
    });

    $body.on("click contextmenu dblclick", $body.not($("li.active-file")), () => {
        $("#context-menu").css("visibility", "hidden");
    });


    $filesSelector
        .on("click contextmenu", "li:not(.active-file)", async function () {
            await toggleActiveFile($(this));
        })
        .on("click dblclick", "li.active-file", (event: JQuery.Event) => event.stopPropagation())
        .on("contextmenu", "li.active-file", (event: JQuery.Event) => {
            event.stopPropagation();
            const clientX: number = <number>event.clientX;
            const x: number = document.documentElement.clientWidth - clientX > 120 ? clientX : clientX - 180;
            const y: number = <number>event.clientY;
            const $contextMenu = $("#context-menu");

            $contextMenu
                .css("visibility", "visible")
                .css("top", `${y}px`)
                .css("left", `${x}px`);
        });

    $secret
        .on("keydown", function (event: JQuery.Event) {
            if (event.key === "Enter" && $secret.hasClass("valid")) {
                const secret: string = <string> $(this).val();

                try {
                    const otp: string = app.get2FaFromSecret(secret);
                    $filesSelector.find("li.active-file").removeClass("active-file");
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

    $('#trades').on("click", () => ipcRenderer.send("open-trades", app.maFile));

    $('#refresh-session').on("click", async () => {
        try {
            await app.refreshSession();
            renderMessage(Messages.sesRefreshed);
        } catch (err) {
            renderMessage(err.message);
        }
    });

    $("#delete").on("click", async () => {
        try {
            const fileName: string = await app.deleteFile();
            renderMessage(CompositeMessages.deletedFile(fileName));
        } catch (err) {
            renderMessage(err.message);
        } finally {
            const $activeFile: JQuery<Element> = $("li.active-file");
            const $newActive: JQuery<Element> = <string> $activeFile.attr("id") === "1" ? $activeFile.next() : $activeFile.prev();

            await $activeFile.animate({height: "0", padding: "0"}, 300).promise();
            $activeFile.remove();

            await toggleActiveFile($newActive);

            let id = 1;
            $filesSelector.find("li").each(function() {
                $(this).attr("id", id++)
            });

            if (Number.parseInt(<string> $filesSelector.find("li:last-of-type").attr("id")) < 10) {
                $filesSelector.mCustomScrollbar("destroy");
            }
        }
    });

    $(".auth-data").on("click", (event: JQuery.ClickEvent) => event.stopPropagation());

    $("#login").on("click", () => $modalWrapper.fadeIn(400));

    $modalWrapper.on("click", () => $modalWrapper.fadeOut(300));

    $("#send").on("click", async () => {
        const login: string = <string> $loginInput.val();
        const password: string = <string> $passwordInput.val();

        $modalWrapper.fadeOut(400);
        try {
            await app.login(login, password);
            renderMessage(Messages.accLoggedIn)
        } catch (err) {
            renderMessage(err.message);
        }
    });

    $otp.on("click", () => {
        const $wrapper: JQuery<Element> = $otp.parent();
        const otp: string = $otp.text();
        clipboard.writeText(otp);
        $wrapper.removeClass("copied");
        setTimeout(() => $wrapper.addClass("copied"),20);
    });

    $close
        .on("mouseleave mouseup", () => $close.trigger("blur"))
        .on("click", () => window.close());

    $minimize
        .on("mouseleave mouseup", () => $minimize.trigger("blur"))
        .on("click", () => ipcRenderer.send("main-minimize"));

});