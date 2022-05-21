import fastify from 'fastify'
import {FulfillmentParams} from "./domain/contracts/order-processor";
import appBuilder from "./app"
import {AddBookParams, InventoryAdjustment, UpdateBookParams} from "./domain/contracts/catalog-manager";
import {FetchBooksParams, SearchBooksParams} from "./domain/contracts/catalog-viewer";

function buildServer() {
    const server = fastify()
    const app = appBuilder()
    server.post<{
        Body: FulfillmentParams
    }>('/fulfill-orders', async (request, reply) => {
        return app.fulfillOrders(request.body)
    })

    server.post<{
        Body: AddBookParams
    }>('/add-book', async (request, reply) => {
        return app.addBook(request.body)
    })

    server.post<{
        Body: UpdateBookParams
    }>('/update-book-details', async (request, reply) => {
        return app.updateBookDetails(request.body)
    })

    server.post<{
        Body: SearchBooksParams
    }>('/search-books', async (request, reply) => {
        return app.searchBooks(request.body)
    })

    server.post<{
        Body: FetchBooksParams
    }>('/fetch-books', async (request, reply) => {
        return app.fetchBooks(request.body)
    })

    server.post<{
        Body: InventoryAdjustment
    }>('/update-inventory', async (request, reply) => {
        return app.adjustInventory(request.body)
    })

    return server
}

export const server = buildServer