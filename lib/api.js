var body = require('body/json')
var send = require('send-data/json')
var Targets = require('./models/target')

module.exports = {
  post: post,
  putById: putById,
  get: get,
  getById: getById,
  route: route
}

function post (req, res, callback) {
  body(req, res, function (err, data) {
    if (err) return callback(err)
    Targets.post(data, function (err, response) {
      if (err) return callback(err)
      res.statusCode = 201
      send(req, res, data)
    })
  })
}

function putById (req, res, options, callback) {
  body(req, res, function (err, data) {
    if (err) return callback(err)
    Targets.putById(options.params.key, data, function (err, response) {
      if (err) return callback(err)
      res.statusCode = 200
      send(req, res, data)
    })
  })
}

function get (req, res, callback) {
  Targets.get(function (err, target) {
    if (err) return callback(err)
    res.statusCode = 200
    send(req, res, target.map(x => JSON.parse(x)))
  })
}

function getById (req, res, options, callback) {
  Targets.getById(options.params.key, function (err, target) {
    if (err) return callback(err)
    send(req, res, JSON.parse(target))
  })
}

function route (req, res, options, callback) {
  Targets.route(options, function (err, location) {
    if (err) return callback(err)
    res.statusCode = 302
    send(req, res, location)
  })
}
