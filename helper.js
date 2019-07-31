exports.asyncFilter = async (arr, callback) => {
    const result = [];

    for (let item of arr) {
        if (await callback(item)) result.push(item);
    }

    return result;
};

exports.asyncForEach = async (arr, callback) => {
    for (let i = 0; i < arr.length; i++) {
        await callback(arr[i], i, arr);
    }
};