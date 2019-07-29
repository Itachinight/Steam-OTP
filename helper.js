exports.asyncFilter = async (arr, callback) => {
    let returnArr = [];

    for (let item of arr) {
        if (await callback(item)) returnArr.push(item);
    }

    return returnArr;
};

exports.asyncForEach = async (arr, callback) => {
    for (let i = 0; i < arr.length; i++) {
        await callback(arr[i], i, arr);
    }
};