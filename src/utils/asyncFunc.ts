export async function asyncFilter(arr: any[], callback: AsyncFilterCallback): Promise<any> {
    const result: any[] = [];

    for (let item of arr) {
        if (await callback(item)) result.push(item);
    }

    return result;
}

export async function asyncForEach(arr: any[], callback: AsyncForEachCallback): Promise<void> {
    for (let i: number = 0; i < arr.length; i++) {
        await callback(arr[i], i, arr);
    }
}