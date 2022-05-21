const server = require("../dist/src/server")

server.server().listen(8080, '0.0.0.0',  (err, address) => {
    if (err) {
        console.error(err)
        process.exit(1)
    }
    console.log(`Server listening at ${address}`)
})