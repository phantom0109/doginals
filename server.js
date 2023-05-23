const express = require('express');
const app = express()
const port = process.env.SERVER_PORT ? parseInt(process.env.SERVER_PORT) : 3000

app.get('/tx/:txid', (req, res) => {
    extract(req.params.txid).then(result => {
        res.setHeader('content-type', result.contentType)
        res.send(result.data)
    }).catch(e => res.send(e.message))
})

app.listen(port, () => {
    console.log(`Listening on port ${port}`)
    console.log()
    console.log(`Example:`)
    console.log(`http://localhost:${port}/tx/15f3b73df7e5c072becb1d84191843ba080734805addfccb650929719080f62e`)
})