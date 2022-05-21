import {Book} from "./models";

export interface SearchBooksParams {
    readonly searchString?: string
    readonly nextToken?: number
    readonly pageSize?: number
}

export interface BookPage {
    readonly books: Book[]
    readonly nextToken?: number
    readonly total: number
}

export interface FetchBooksParams {
    bookIds: number[]
}

export interface FetchBooksResult {
    books: Book[]
}

export interface CatalogViewer {
    searchBooks(params: SearchBooksParams): BookPage
    fetchBooks(params: FetchBooksParams): FetchBooksResult
}