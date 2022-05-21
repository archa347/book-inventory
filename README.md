# Book Inventory API
## Major TODOs
- OpenAPI schema to allow for client generation, could also consider some sort of gRPC interface
- Better input validation of arguments coming in on endpoints. Fastify provides a way to do this via JSON Schema annotations on the endpoints
- Implement some kind of identity check to protect management endpoints
- Use a real DB instead of an in-memory store

## Development
### Code

This is a Typescript/NodeJS project.  It uses `fastify` to provide the HTTP API.

The `fastify` server is configured in [`src/server.ts`](src/server.ts).

The domain level service is configured in [`src/app.ts`](src/app.ts)

The [`src/domain/contracts`](src/domain/contracts) folder contains the interfaces for the
primary units of functionality and their supporting types.

All service interfaces are currently being implemented by a single class that wraps the 
in-memory data store [src/domain/services/memory-inventory-service.ts](src/domain/services/memory-inventory-service.ts).  
This was less than ideal but could pretty easily be broken down into separate implementations with a fairly painless refactor.

Testing is being provided by `tap`, a lightweight and straightforward test runner.

### Running Locally
This project has been set up to run with Docker such that the user needs a minimum of
dependencies on their local machine to get started

#### Basic Requirements
- Docker
- A somewhat recent version of NPM

#### Running the server locally
Run `npm run docker-dev` to build the dev docker image and run the server.
The `src` directory will be bound to a volume in the container and will
be watched for updates to auto-reload the server on changes.

#### Running tests locally
Run `npm run docker-test` to build the dev docker image and run the test 
suites. `npm run docker-test-watch` will bind the `src` and `test` 
directories and watch for changes, re-running the tests on changes.
A current limitation is that you must stop and re-run this command to pick up on
new test files.

## API

All API actions are submitted via HTTP `POST` requests to the specified URL
with a JSON payload following the structure specified for that action. Responses
are JSON payloads.

### The `Book` Model
The core model for data storage is the `Book`. It is found in the response of several API actions

| Parameter  | Type      | Description                                                    |
|------------|-----------|----------------------------------------------------------------|
| `id`       | `integer` | The database assigned ID for the book                          |
| `title`    | `string`  | the title of the book                                          |
| `author`   | `string`  | Author of the book                                             |
| `isbn`     | `string`  | The ISBN number of the book.  Unique between all current books |
| `category` | `string`  | The category of the book                                       |
| `notes`    | `string`  | `optional`: A free text field to add notes for internal use    |

### `/fulfill-orders`
Used to submit orders for fulfillment.  This API was designed for high DB efficiency via batch operations
by allowing the caller to submit multiple orders at once.

The semantics assumed here is that for a particular request, some orders could succeed and others could fail. Within an order,
all order items must be accepted for fulfillment to complete the order.

If an order item is `immediate`, sufficient quantity must exist to fulfill the quantity.  If an order item is `reserved`, we allow the inventory to
dip into negative. The idea here is that an employee could then order new stock for an item to fulfill the rest of the order.  This is naturally a very
simplistic way to approach this problem versus storing data on specific orders and then having them fulfilled at a later date.

#### Request
| Parameter                     | Type                           | Description                                                                                                                                                                                                      |
|-------------------------------|--------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `orders`                      | `array`                        | An array of `Order` objects.  Each order is processed separately and can succeed or fail independently                                                                                                           |
| `orders[0].orderId`           | `integer`                      | The id for this order. Must be unique per request                                                                                                                                                                |
| `orders[0].items`             | `array`                        | An array of order items. If any item in the order cannot be fulfilled                                                                                                                                            |
| `orders[0].items[0].bookId`   | `integer`                      | The id of the book to be purchased TODO: ensure uniqueness of book ids in order items                                                                                                                            |
| `orders[0].items[0].type`     | `"immediate" &#124; "reserve"` | `immediate` items must have sufficient inventory to fulfill the order item `quantity`. `reserve` items will be accepted and fulfilled at a later date.  This can cause inventory to dip below zero for that item |
| `orders[0].items[0].quantity` | `integer`                      | The quantity to fulfill for this order item.                                                                                                                                                                     |                                                                                                                                                               

#### Response
| Parameter                     | Type                        | Description                                              |
|-------------------------------|-----------------------------|----------------------------------------------------------|
| `orders`                      | `array`                     | An array of order result objects.                        |
| `orders[0].orderId`           | `integer`                   | The id for the order.                                    |
| `orders[0].status`            | `"accepted" &#124; "error"` | Whether the order successfully processed                 |
| `orders[0].message`           | `string`                    | A status message indicating problems with `error` orders |

### `/add-book`
Used to create new books in the inventory catalog of items.  New items are created with `inventory` of 0. Inventory must
be added to the items via the `update-inventory` API.

#### Request
| Parameter  | Type     | Description                                                            |
|------------|----------|------------------------------------------------------------------------|
| `title`    | `string` | the title of the book                                                  |
| `author`   | `string` | Author of the book                                                     |
| `isbn`     | `string` | The ISBN number of the book.  Must be unique between all current books |
| `category` | `string` | The category of the book                                               |
| `notes`    | `string` | `optional`: A free text field to add notes for internal users          |

#### Response
| Parameter | Type                        | Description                                        |
|-----------|-----------------------------|----------------------------------------------------|
| `status`  | `"accepted" &#124; "error"` | Whether the new item was accepted or not           |
| `book`    | `Book`                      | The newly created book                             |
| `message` | `string`                    |  `optional`: Contains details on `error` responses |

### `/update-book-details`
Used to update metadata fields of `Book` items in the database.  Does not update the inventory.
Except the `notes` field, each field must be present and non-null to update the corresponding field
in the `Book` object specified.

#### Request
| Parameter  | Type      | Description                                                                                                                                   |
|------------|-----------|-----------------------------------------------------------------------------------------------------------------------------------------------|
| `id`       | `integer` | `required`: The database ID of the book to update.                                                                                            | 
| `title`    | `string`  | `optional`: the title of the book                                                                                                             |
| `author`   | `string`  | `optional`: Author of the book                                                                                                                |
| `isbn`     | `string`  | `optional`: The ISBN number of the book.  Must be unique between all current books                                                            |
| `category` | `string`  | `optional`: The id of the book to be purchased TODO: ensure uniqueness of book ids in order items                                             |
| `notes`    | `string`  | `optional`: A free text field to add notes for internal users. If this property is included in the payload as `null`, it will unset the value |

#### Response
| Parameter | Type                        | Description                                       |
|-----------|-----------------------------|---------------------------------------------------|
| `status`  | `"accepted" &#124; "error"` | Whether the update was accepted or not            |
| `book`    | `Book`                      | The updated data for the book                     |
| `message` | `string`                    | `optional`: Contains details on `error` responses |

### `/update-inventory`
Used by internal management to manage the inventory of existing items.
Can either increment the inventory value by some amount, or overwrite the value. 
Either `increment` or `set` must be in the payload.  If both are specified, `increment`
takes priority

#### Request
| Parameter   | Type      | Description                                                                                                                                  |
|-------------|-----------|----------------------------------------------------------------------------------------------------------------------------------------------|
| `bookId`    | `integer` | `required`: The database ID of the book to update.                                                                                           | 
| `increment` | `integer` | `optional`: Specifies a value to increment the book `inventory`.  Negative values are acceptable to do a decrement                           |
| `set`       | `integer` | `optional`: Specifies a value to overwrite the current book `inventory` value with                                                           |

#### Response
| Parameter | Type                        | Description                                       |
|-----------|-----------------------------|---------------------------------------------------|
| `bookId`  | `integer`                   | The id of the book inventory that was updated     |                                  
| `status`  | `"accepted" &#124; "error"` | Whether the update was accepted or not            |
| `book`    | `Book`                      | `optional`: The updated data for the book         |
| `message` | `string`                    | `optional`: Contains details on `error` responses |

### /search-books
Allows for browsing books and narrowing results with a search query. Returns a paginated result set.

#### Request
| Parameter      | Type      | Description                                                                                                                                                                                                                                                                                                      |
|----------------|-----------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `searchString` | `string`  | `optional`: Searches the `title`, `author`, `isbn`, and `category` fields of books in the inventory.  If not specified, returns all results                                                                                                                                                                      |
| `pageSize`     | `integer` | `optional`: The max number of results to return in a page. Defaults to `10`                                                                                                                                                                                                                                      |
| `nextToken`    | `string`  | `optional`: The `nextToken` comes from a previous response from the `/search-books` endpoint and is used to fetch the next page of results for a `searchString` and `pageSize`. The behavior is undefined if the `nextToken` is used with a different `searchString` and `pageSize` from the originating request |

#### Response
| Parameter   | Type      | Description                                                                       |
|-------------|-----------|-----------------------------------------------------------------------------------|
| `books`     | `array`   | The array of `Book` objects matching `searchString`, if provided.  Else all books |
| `total`     | `integer` | The total number of items that match this query in the database                   |
| `nextToken` | `integer` | Used to retrieve the next page of books, if any                                   |

### /fetch-books
Allows for fetching specific books by their database ID.

#### Request
| Parameter   | Type             | Description                               |
|-------------|------------------|-------------------------------------------|
| `bookIds`   | `array<integer>` | The list of book IDs to fetch from the DB |

#### Response
| Parameter   | Type          | Description                                                                                                                                                                                    |
|-------------|---------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `books`     | `array<Book>` | The array of `Book` objects for the specified `bookIds`.  If a specific `id` is not found in the database, the request will succeed but the results will not include any items for unknown IDs |

