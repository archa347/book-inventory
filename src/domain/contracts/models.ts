export interface Book {
    readonly id: number
    readonly title: string
    readonly author: string
    readonly isbn: string
    readonly category: string
    readonly inventory: number
    readonly notes?: string
}