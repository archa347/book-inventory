import {FastifyInstance} from "fastify";

const t = require("tap")
import { server as buildServer } from "../src/server"
const supertest = require("supertest")

t.test("Catalog Manager", async (t: Tap.Test) => {
    let server: FastifyInstance

    t.beforeEach(async (t: Tap.Test) => {
        server = buildServer()

        t.teardown(() => server.close())

        await server.listen(8081, '0.0.0.0')
    })

    await t.test("Can create a book", async (t: Tap.Test) => {
        let response = await supertest(server.server)
            .post("/add-book")
            .send({
                "title": "Fundamentals of Wavelets 2: Electric Boogaloo",
                "author": "Goswami, Jaideva",
                "isbn": "4726362789",
                "category": "nonfiction",
                "notes": null
            })
            .expect(200)

        t.same(response.body, { status: "accepted", book: {
                "id": 7,
                "title": "Fundamentals of Wavelets 2: Electric Boogaloo",
                "author": "Goswami, Jaideva",
                "isbn": "4726362789",
                "category": "nonfiction",
                "inventory": 0,
                "notes": null
        }})

        response = await supertest(server.server)
            .post("/add-book")
            .send({
                "title": "Fundamentals of Wavelets 3: Son of wavelets",
                "author": "Goswami, Jaideva",
                "isbn": "4726362789",
                "category": "nonfiction",
                "notes": null
            })
            .expect(200)

        t.same(response.body, { status: "error", message: "ISBN already exists"}, "cannot use existing ISBN")
    })

    await t.test("Updating books", async (t: Tap.Test) => {
        let response = await supertest(server.server)
            .post("/add-book")
            .send({
                "title": "Fundamentals of Wavelets 2: Electric Boogaloo",
                "author": "Goswami, Jaideva",
                "isbn": "4726362789",
                "category": "nonfiction",
                "notes": null
            })
            .expect(200)

        const newId = response.body.book.id

        response = await supertest(server.server)
            .post("/update-book-details")
            .send({
                id: newId,
                category: "fantasy"
            })
            .expect(200)

        t.same(response.body, { status: "accepted", book: {
                "id": newId,
                "title": "Fundamentals of Wavelets 2: Electric Boogaloo",
                "author": "Goswami, Jaideva",
                "isbn": "4726362789",
                "category": "fantasy",
                "inventory": 0,
                "notes": null
        }}, "can change category")

        response = await supertest(server.server)
            .post("/update-book-details")
            .send({
                id: newId,
                isbn: "5726362789",
            })
            .expect(200)

        t.same(response.body, { status: "accepted", book: {
                "id": newId,
                "title": "Fundamentals of Wavelets 2: Electric Boogaloo",
                "author": "Goswami, Jaideva",
                "isbn": "5726362789",
                "category": "fantasy",
                "inventory": 0,
                "notes": null
            }}, "can update ISBN")

        response = await supertest(server.server)
            .post("/update-book-details")
            .send({
                id: newId,
                isbn: "3726362789",
            })
            .expect(200)

        t.same(response.body, { status: "error", message: "ISBN already exists"}, "can't use an existing ISBN")

        response = await supertest(server.server)
            .post("/update-book-details")
            .send({
                id: newId,
                notes: "stuff",
            })
            .expect(200)

        t.same(response.body, { status: "accepted", book: {
                "id": newId,
                "title": "Fundamentals of Wavelets 2: Electric Boogaloo",
                "author": "Goswami, Jaideva",
                "isbn": "5726362789",
                "category": "fantasy",
                "inventory": 0,
                "notes": "stuff"
            }}, "can update notes")

        response = await supertest(server.server)
            .post("/update-book-details")
            .send({
                id: response.body.book.id,
                notes: null,
            })
            .expect(200)

        t.same(response.body, { status: "accepted", book: {
                "id": newId,
                "title": "Fundamentals of Wavelets 2: Electric Boogaloo",
                "author": "Goswami, Jaideva",
                "isbn": "5726362789",
                "category": "fantasy",
                "inventory": 0,
                "notes": undefined
            }}, "can unset notes")

        response = await supertest(server.server)
            .post("/update-book-details")
            .send({
                id: 1000,
                notes: "stuff",
            })
            .expect(200)

        t.same(response.body, { status: "error", message: "Item 1000 does not exist"}, "can't update non-existent items")
    })

    await t.test("Update inventory", async (t: Tap.Test) => {
        let response = await supertest(server.server)
            .post("/update-inventory")
            .send({
                bookId: 1,
                increment: 1
            })
            .expect(200)

        t.same(response.body, { bookId: 1, status: "accepted", inventory: 10 }, "Can increment inventory")

        response = await supertest(server.server)
            .post("/update-inventory")
            .send({
                bookId: 1,
                set: 9
            })
            .expect(200)

        t.same(response.body, { bookId: 1, status: "accepted", inventory: 9 }, "Can set inventory")

        response = await supertest(server.server)
            .post("/update-inventory")
            .send({
                bookId: 1,
            })
            .expect(200)

        t.same(response.body, { bookId: 1, status: "error", message: "must specify one of increment or set in request" }, "`increment` or `set` must be included")

        response = await supertest(server.server)
            .post("/update-inventory")
            .send({
                bookId: 1000,
            })
            .expect(200)

        t.same(response.body, { bookId: 1000, status: "error", message: "Book 1000 does not exist" }, "Cannot update non-existent item")
    })
})