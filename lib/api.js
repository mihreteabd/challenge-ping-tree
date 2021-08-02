var body = require('body/json')
var send = require('send-data/json')
var Targets = require('./models/target')

module.exports = {
  post: post
}

function post (req, res, options, callback) {
  body(req, res, function (err, data) {
    if (err) return callback(err)
    Targets.post(data, function (err) {
      if (err) return callback(err)
      res.statusCode = 201
      send(req, res, data)
    })
  })
}
