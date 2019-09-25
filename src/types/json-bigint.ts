declare module "json-bigint" {
    export function parse(text: string, reviver?: (this: any, key: string, value: any) => any): any;
    
    export function stringify(value: any, replacer?: ((this: any, key: string, value: any) => any) | null, space?: string | number): string;
}