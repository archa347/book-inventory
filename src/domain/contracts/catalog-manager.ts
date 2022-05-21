import {Book} from "./models";

export interface AddBookParams {
    readonly title: string
    readonly author: string
    readonly isbn: string
    readonly category: string
    readonly notes?: string
}

export interface UpdateBookParams {
    readonly id: number
    readonly title?: string
    readonly author?: string
    readonly isbn?: string
    readonly category?: string
    readonly notes?: string
}

export interface CatalogUpdateResult {
    readonly status: "accepted" | "error"
    readonly book?: Book
    readonly message?: string
}

export interface InventoryAdjustment {
    readonly bookId: number
    readonly increment?: number
    readonly set?: number
}

export interface InventoryAdjustmentResult {
    readonly bookId: number,
    readonly status: "accepted" | "error"
    readonly inventory?: number
    readonly message?: string
}


export interface CatalogManager {
    addBook(params: AddBookParams): CatalogUpdateResult
    updateBookDetails(params: UpdateBookParams): CatalogUpdateResult
    adjustInventory(params: InventoryAdjustment): InventoryAdjustmentResult
}