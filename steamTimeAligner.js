getTime = async (url, params) => {
    const fetch = require('node-fetch');
    try {
        const res = await fetch(url, params);
        let json = await res.json();
        return json.response.server_time;
    } catch (error) {
        console.log(error);
    }
};

exports.getOffset = async () => {
    const url = "https://api.steampowered.com/ITwoFactorService/QueryTime/v1/";
    const params = {
        method: 'POST',
        headers: {
            'Content-Length': 0
        },
    };
    let start = Math.floor(Date.now() / 1000);
    let time = getTime(url, params);

    return await time - start;
};