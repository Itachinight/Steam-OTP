const fetch = require('node-fetch');

async function getTime() {
    const controller = new AbortController();
    const { signal } = controller;
    let url = "https://api.steampowered.com/ITwoFactorService/QueryTime/v1/";
    let params = {
        signal,
        method: 'POST',
        headers: {
            'Content-Length': 0
        },
    };

    setTimeout(() => controller.abort(), 1500);
    const res = await fetch(url, params);
    const json = await res.json();
    return json.response.server_time;
}

exports.getOffset = async () => {
    try {
        let time = await getTime();
        return time - Math.round(Date.now() / 1000);
    } catch (err) {
        console.error(err.message);
        return 0;
    }
};