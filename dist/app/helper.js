"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
async function asyncFilter(arr, callback) {
    const result = [];
    for await (let item of arr) {
        if (callback(item))
            result.push(item);
    }
    return result;
}
exports.asyncFilter = asyncFilter;
async function asyncForEach(arr, callback) {
    for (let i = 0; i < arr.length; i++) {
        await callback(arr[i], i, arr);
    }
}
exports.asyncForEach = asyncForEach;
