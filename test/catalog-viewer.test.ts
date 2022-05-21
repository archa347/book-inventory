import {FastifyInstance} from "fastify";

const t = require("tap")
import { server as buildServer } from "../src/server"
import { staticData } from "../src/domain/services/memory-inventory-service";
const supertest = require("supertest")

t.test("Catalog Viewer", async (t: Tap.Test) => {
    let server: FastifyInstance
    t.beforeEach(async (t: Tap.Test) => {
        server = buildServer()

        t.teardown(() => server.close())

        await server.listen(8082, '0.0.0.0')
    })

    await t.test("search catalog", async (t: Tap.Test) => {
        let response = await supertest(server.server)
            .post("/search-books")
            .send({})
            .expect(200)

        t.same(response.body, {books: staticData, total: 6}, "full list")

        response = await supertest(server.server)
            .post("/search-books")
            .send({pageSize: 2})
            .expect(200)

        t.same(response.body, {books: staticData.slice(0,2), total: 6, nextToken: 2}, "paginated list")

        response = await supertest(server.server)
            .post("/search-books")
            .send({pageSize: 2, nextToken: 2})
            .expect(200)

        t.same(response.body, {books: staticData.slice(2,4), total: 6, nextToken: 4}, "offset")

        response = await supertest(server.server)
            .post("/search-books")
            .send({searchString: "Fun"})
            .expect(200)

        t.same(response.body, {books: staticData.slice(0,1), total: 1}, "search string")

        response = await supertest(server.server)
            .post("/search-books")
            .send({searchString: "of"})
            .expect(200)

        t.same(response.body, {
            books: [
                staticData[0], staticData[1], staticData[5]
            ],
            total: 3
        }, "search string with offset")

        response = await supertest(server.server)
            .post("/search-books")
            .send({searchString: "of", pageSize:1, nextToken: 1})
            .expect(200)

        t.same(response.body, {
            books: [
                staticData[1],
            ],
            total: 3,
            nextToken: 2
        }, "search string with offset")
    })

    await t.test("fetch item", async (t: Tap.Test) => {
        let response = await supertest(server.server)
            .post("/fetch-books")
            .send({bookIds: [1,2]})
            .expect(200)

        t.same(response.body, {
            books: [staticData[0], staticData[1]]
        }, "returns a list of items")

        response = await supertest(server.server)
            .post("/fetch-books")
            .send({bookIds: [10]})
            .expect(200)

        t.same(response.body, {
            books: []
        }, "returns an empty list when when items are not found")
    })
})