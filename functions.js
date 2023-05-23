
const dogecore = require('bitcore-lib-doge')
const axios = require('axios')
const fs = require('fs')
const dotenv = require('dotenv')
const mime = require('mime-types')
const express = require('express')
const { PrivateKey, Address, Transaction, Script, Opcode } = dogecore
const { Hash, Signature } = dogecore.crypto

const dogFunctions = {};



dotenv.config()

if (process.env.TESTNET == 'true') {
    dogecore.Networks.defaultNetwork = dogecore.Networks.testnet
}

if (process.env.FEE_PER_KB) {
    Transaction.FEE_PER_KB = parseInt(process.env.FEE_PER_KB)
} else {
    Transaction.FEE_PER_KB = 100000000
}

const WALLET_PATH = process.env.WALLET || '.wallet.json'


async function main() {
    let cmd = process.argv[2]

    if (fs.existsSync('pending-txs.json')) {
        console.log('found pending-txs.json. rebroadcasting...')
        const txs = JSON.parse(fs.readFileSync('pending-txs.json'))
        await broadcastAll(txs.map(tx => new Transaction(tx)), false)
        return 
    }

    if (cmd == 'mint') {
        await mint()
    } else if (cmd == 'wallet') {
        await wallet()
    } else if (cmd == 'server') {
        await server()
    } else {
        throw new Error(`unknown command: ${cmd}`)
    }
}

dogFunctions.wallet = (subcmd) => {
    if (subcmd == 'new') {
        walletNew()
    } 
    else if (subcmd == 'sync') {
        walletSync()
    } else if (subcmd == 'balance') {
        walletBalance()
    } else if (subcmd == 'send') {
        walletSend()
    } else if (subcmd == 'split') {
        walletSplit()
    } 
    else {
        return;
    }
}


function walletNew() {
    if (!fs.existsSync(WALLET_PATH)) {
        const privateKey = new PrivateKey()
        const privkey = privateKey.toWIF()
        const address = privateKey.toAddress().toString()
        const json = { privkey, address, utxos: [] }
        fs.writeFileSync(WALLET_PATH, JSON.stringify(json, 0, 2))
        console.log('address', address)
    } else {
        throw new Error('wallet already exists')
    }
}


async function walletSync() {
    if (process.env.TESTNET == 'true') throw new Error('no testnet api')

    let wallet = JSON.parse(fs.readFileSync(WALLET_PATH))

    console.log('syncing utxos with dogechain.info api')

    let response = await axios.get(`https://dogechain.info/api/v1/address/unspent/${wallet.address}`)
    wallet.utxos = response.data.unspent_outputs.map(output => {
        return {
            txid: output.tx_hash,
            vout: output.tx_output_n,
            script: output.script,
            satoshis: output.value
        }
    })

    fs.writeFileSync(WALLET_PATH, JSON.stringify(wallet, 0, 2))

    let balance = wallet.utxos.reduce((acc, curr) => acc + curr.satoshis, 0)

    console.log('balance', balance)
}


function walletBalance() {
    let wallet = JSON.parse(fs.readFileSync(WALLET_PATH))

    let balance = wallet.utxos.reduce((acc, curr) => acc + curr.satoshis, 0)

    console.log(wallet.address, balance)
}


async function walletSend() {
    const argAddress = process.argv[4]
    const argAmount = process.argv[5]

    let wallet = JSON.parse(fs.readFileSync(WALLET_PATH))

    let balance = wallet.utxos.reduce((acc, curr) => acc + curr.satoshis, 0)
    if (balance == 0) throw new Error('no funds to send')

    let receiver = new Address(argAddress)
    let amount = parseInt(argAmount)

    let tx = new Transaction()
    if (amount) {
        tx.to(receiver, amount)
        fund(wallet, tx)
    } else {
        tx.from(wallet.utxos)
        tx.change(receiver)
        tx.sign(wallet.privkey)
    }

    await broadcast(tx, true)

    console.log(tx.hash)
}


async function walletSplit() {
    let splits = parseInt(process.argv[4])

    let wallet = JSON.parse(fs.readFileSync(WALLET_PATH))

    let balance = wallet.utxos.reduce((acc, curr) => acc + curr.satoshis, 0)
    if (balance == 0) throw new Error('no funds to split')

    let tx = new Transaction()
    tx.from(wallet.utxos)
    for (let i = 0; i < splits - 1; i++) {
        tx.to(wallet.address, Math.floor(balance / splits))
    }
    tx.change(wallet.address)
    tx.sign(wallet.privkey)

    await broadcast(tx, true)

    console.log(tx.hash)
}

module.exports = dogFunctions;
