import {Book} from "../contracts/models";
import {
    FulfillmentParams,
    FulfillmentResult,
    Order,
    OrderItem,
    OrderProcessor,
    OrderResult
} from "../contracts/order-processor";
import {
    AddBookParams,
    CatalogManager,
    CatalogUpdateResult,
    InventoryAdjustment,
    InventoryAdjustmentResult,
    UpdateBookParams
} from "../contracts/catalog-manager";
import {
    BookPage,
    CatalogViewer,
    FetchBooksParams,
    FetchBooksResult,
    SearchBooksParams
} from "../contracts/catalog-viewer";

export class MemoryInventoryService implements OrderProcessor, CatalogManager, CatalogViewer {
    private readonly inventory = new Map<number, Book>(inventoryBootstrap())

    fulfillOrders(params: FulfillmentParams): FulfillmentResult {
        return {
            // Each order is fulfilled independently, in order of submission
            orders: params.orders.map(order => this.fulfillOrder(order))
        }
    }

    fulfillOrder(order: Order): OrderResult {
        try {
            this.inventoryCheck(order)
            this.updateInventory(order)
        } catch (e: unknown) {
            return {
                orderId: order.orderId,
                status: "error",
                message: e instanceof Error ? e.message : "Unknown error occurred"
            }
        }

        return {
            orderId: order.orderId,
            status: "accepted",
        }
    }

    updateInventory(order: Order) {
        order.items.forEach((item) => {
            let book = this.inventory.get(item.bookId)
            // We're assuming here the inventory has already been checked and we apply the update.
            if (!!book) this.inventory.set(item.bookId, {...book, inventory: book.inventory - item.quantity})
        })
    }

    // We check the inventory for the items in order, and throw an error if any item is unabled to be
    // fulfilled.  An actual database with transactional safety and field constraints might actually make this simpler
    // TODO: validate that the order items are distinct bookIds
    inventoryCheck(order: Order): void {
        order.items.forEach(orderItem => {
            if (!this.itemInventoryCheck(orderItem)) {
                throw Error("insufficient stock to fulfill order")
            }
        })
    }

    itemInventoryCheck(item: OrderItem): boolean {
        const book = this.inventory.get(item.bookId)
        if (!!book) {
            switch (item.type) {
                case "immediate":
                    return item.quantity <= book.inventory
                case "reserve":
                    // On a reservation, we will take any quantity and apply it to the stock,
                    // allowing it to go negative if necessary
                    return true
            }
        } else {
            throw Error(`item ${item.bookId} does not exist`)
        }
    }

    addBook(params: AddBookParams): CatalogUpdateResult {
        if(!this.checkISBN(params.isbn)) {
            return {
                status: "error",
                message: "ISBN already exists"
            }
        }

        // Not the most sophisticated approach, but should work
        // since we don't currently implement a delete
        const newIndex = this.inventory.size + 1
        const newBook = {...params, id: newIndex, inventory: 0}
        this.inventory.set(newIndex, newBook)
        return {
            status: "accepted",
            book: newBook
        }
    }

    checkISBN(isbn: string | undefined): boolean {
        if (!isbn) return true
        let existing = false
        this.inventory.forEach((v, k) => existing = (existing || isbn === v.isbn))
        return !existing
    }

    updateBookDetails(params: UpdateBookParams): CatalogUpdateResult {
        const book = this.inventory.get(params.id)
        if (!book) {
            return {
                status: "error",
                message: `Item ${params.id} does not exist`
            }
        }

        if(!!params.isbn && params.isbn !== book.isbn && !this.checkISBN(params.isbn)) {
            return {
                status: "error",
                message: "ISBN already exists"
            }
        }
        const updatedBook = {
            id: book.id,
            title: params.title || book.title,
            author: params.author || book.author,
            isbn: params.isbn || book.isbn,
            category: params.category || book.category,
            // Notes is the only nullable field, so we can handle that a little differently
            notes: "notes" in params ? params.notes : book.notes,
            // Inventory is updated separately
            inventory: book.inventory
        }
        this.inventory.set(updatedBook.id, updatedBook)
        return {
            status: "accepted",
            book: updatedBook
        }
    }

    adjustInventory(params: InventoryAdjustment): InventoryAdjustmentResult {
        const book = this.inventory.get(params.bookId)
        if (!book) {
            return {
                bookId: params.bookId,
                status: "error",
                message: `Book ${params.bookId} does not exist`
            }
        } else {
            const newInventory = typeof params.increment == 'number' ? params.increment + book.inventory : params.set
            if (typeof newInventory == 'number') {
                this.inventory.set(params.bookId, {...book, inventory: newInventory})
            } else {
                return {
                    bookId: params.bookId,
                    status: "error",
                    message: `must specify one of increment or set in request`
                }
            }
            const update = this.inventory.get(params.bookId)
            return {
                bookId: params.bookId,
                status: "accepted",
                inventory: !!update ? update.inventory : undefined
            }
        }
    }

    searchBooks(params: SearchBooksParams): BookPage {
        const bookArray = Array.from(this.inventory.values())
        const searchString = params.searchString
        const nextToken = (params.nextToken || 0) + (params.pageSize || 10)
        if (!searchString) {
            return {
                books: bookArray.slice(params.nextToken, (params.pageSize || 10) + (params.nextToken || 0)),
                total: this.inventory.size,
                nextToken: nextToken < bookArray.length ? nextToken : undefined
            }
        } else {
            const result = bookArray.filter(book => this.matchBook(book, searchString))

            return {
                books: result.slice(params.nextToken, (params.pageSize || 10) + (params.nextToken || 0)),
                total: result.length,
                nextToken: nextToken < result.length ? nextToken : undefined
            }
        }
    }

    matchBook(book: Book, searchString: string): boolean {
        return book.author.indexOf(searchString) > -1 || book.title.indexOf(searchString) > -1
            || book.category.indexOf(searchString) > -1 || book.isbn.indexOf(searchString) > -1
    }

    fetchBooks(params: FetchBooksParams): FetchBooksResult {
        return {
            books: params.bookIds.map(id => this.inventory.get(id)).filter(book => !!book) as Book[]
        }
    }

}

function inventoryBootstrap(): [number, Book][] {
    return staticData.map((book) => [book.id, book as unknown as Book])
}

export const staticData = [{
    "id": 1,
    "title": "Fundamentals of Wavelets",
    "author": "Goswami, Jaideva",
    "isbn": "3726362789",
    "category": "nonfiction",
    "inventory": 9,
    "notes": null
},{
    "id": 2,
    "title": "Age of Wrath, The",
    "author": "Eraly, Abraham",
    "isbn": "3876253647",
    "category": "nonfiction",
    "inventory": 0,
    "notes": "Backordered until the end of the year"
},
{
    "id": 3,
    "title": "Slaughterhouse Five",
    "author": "Vonnegut, Kurt",
    "isbn": "09283746523",
    "category": "fiction",
    "inventory": 3,
    "notes": null
},
{
    "id": 4,
    "title": "Moon is Down, The",
    "author": "Steinbeck, John",
    "isbn": "37463567283",
    "category": "fiction",
    "inventory": 12,
    "notes": null
},
{
    "id": 5,
    "title": "Dylan on Dylan",
    "author": "Dylan, Bob",
    "isbn": "28710924383",
    "category": "nonfiction",
    "inventory": 12,
    "notes": null
},
{
    "id": 6,
    "title": "Journal of a Novel",
    "author": "Steinbeck, John",
    "isbn": "239847201093",
    "category": "fiction",
    "inventory": 8,
    "notes": "Reorder in November"
}]