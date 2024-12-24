export type Result<T extends Record<string, unknown>> = {
    [K in keyof T]: { type: K } & T[K];
}[keyof T];

export type Attempt<T, E> = {
    success: T extends void ? {} : { value: T };
    failure: E extends void ? {} : { error: E };
} extends infer R extends Record<string, unknown>
    ? Result<R>
    : never;

/**
 * Above is equivalent to:
 export type Attempt<T, E> = Result<{
 success: T extends void ? {} : { value: T };
 failure: E extends void ? {} : { error: E };
 }>;
 */

/**
 // Usage:
 type MyResult = Result<{
 success: { value: string },
 failure: { error: string },
 pending: { startTime: number }
 }>

 const success: MyResult = { type: 'success', value: 'Hello!' };
 const failure: MyResult = { type: 'failure', error: 'Something went wrong!' };
 const pending: MyResult = { type: 'pending', startTime: 1643723900 };
 **/
