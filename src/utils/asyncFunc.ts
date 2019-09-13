export async function asyncFilter(arr: any[], callback: AsyncFilterCallback): Promise<any> {
    const result: any[] = [];

    for (let item of arr) {
        if (await callback(item)) result.push(item);
    }

    return result;
}