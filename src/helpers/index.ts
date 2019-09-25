export = function () {
    if (void 0 === Array.prototype.asyncFilter) {
        Array.prototype.asyncFilter = async function<T>(callback: AsyncFilterCallback): Promise<T[]> {
            const result: T[] = [];

            for (const item of this) {
                if (await callback(item)) result.push(item);
            }

            return result;
        };
    }

    if (void 0 === Date.timestamp) {
        Date.timestamp = function(): number {
            return Math.floor(Date.now() / 1000);
        };
    }
};