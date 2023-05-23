const express = require('express')
const router = express.Router()
const dogFunctions = require("../functions");

router.get('/test', (req, res) => {
  dogFunctions.wallet("new");
  // handle GET request for all users
  res.json({msg: 'test success!'})
})

router.get('/new_balance', (req, res) => {
  // handle GET request for all users
  res.json({msg: 'test success!'})
})

router.get('/get_balance', (req, res) => {
  // handle GET request for all users
  res.json({msg: 'test success!'})
})

router.get('/:id', (req, res) => {
  // handle GET request for a specific user by ID
})

// Export the router object so it can be used in other files
module.exports = router