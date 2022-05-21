import {FastifyInstance} from "fastify";

const t = require("tap")
import { server as buildServer } from "../src/server"
const supertest = require("supertest")

t.test("Order Processing", async (t: Tap.Test) => {
    let server: FastifyInstance

    t.beforeEach(async (t: Tap.Test) => {
        server = buildServer()

        t.teardown(() => server.close())

        await server.listen(8080, '0.0.0.0')
    })

    await t.test("can handle multiple orders with successful and not successful results cases", async (t: Tap.Test) => {

        const response = await supertest(server.server).post("/fulfill-orders").send({
            orders: [
                {
                    orderId: 1,
                    items: [
                        {
                            bookId: 1,
                            type: "immediate",
                            quantity: 1
                        }
                    ]
                }, {
                    orderId: 2,
                    items: [
                        {
                            bookId: 2,
                            type: "immediate",
                            quantity: 100000
                        }
                    ]
                }, {
                    orderId: 3,
                    items: [
                        {
                            bookId: 1000,
                            type: "immediate",
                            quantity: 1
                        }
                    ]
                }, {
                    orderId: 4,
                    items: [
                        {
                            bookId: 3,
                            type: "reserve",
                            quantity: 1000
                        }
                    ]
                }, {
                    orderId: 5,
                    items: [
                        {
                            bookId: 1000,
                            type: "reserve",
                            quantity: 1000,
                        }
                    ]
                }
            ]
        })
        t.same(response.body, { orders: [{
                orderId: 1,
                status: "accepted"
            }, {
                orderId: 2,
                status: "error",
                message: "insufficient stock to fulfill order"
            }, {
                orderId: 3,
                status: "error",
                message: "item 1000 does not exist"
            },{
                orderId: 4,
                status: "accepted"
            }, {
                orderId: 5,
                status: "error",
                message: "item 1000 does not exist"
            }]
        })
    })

    await t.test("Properly records inventory changes", async (t: Tap.Test) => {
        let response = await supertest(server.server)
            .post("/fulfill-orders")
            .send({
                orders: [{
                    orderId: 1,
                    items: [{
                        bookId: 1,
                        type: "immediate",
                        quantity: 9
                    }]
                }]
            })
            .expect(200)
        t.same(response.body, { orders: [{orderId: 1, status: "accepted"}]}, "should accept the first order")
        response = await supertest(server.server)
            .post("/fulfill-orders")
            .send({
                orders: [{
                    orderId: 2,
                    items: [{
                        bookId: 1,
                        type: "immediate",
                        quantity: 1
                    }]
                }]
            })
            .expect(200)
        t.same(response.body, {
            orders: [{
                orderId: 2, status: "error", message: "insufficient stock to fulfill order"
            }]
        }, "should reject the second order")
    })
})