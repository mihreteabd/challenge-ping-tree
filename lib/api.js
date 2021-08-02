var body = require('body/json')
var send = require('send-data/json')
var Targets = require('./models/target')

module.exports = {
  post: post,
  putbyid: putbyid,
  get: get,
  getbyid: getbyid,
  route: route
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

function putbyid (req, res, options, callback) {
  body(req, res, function (err, data) {
    if (err) return callback(err)
    Targets.putbyid(options.params.key, data, function (err) {
      if (err) return callback(err)
      res.statusCode = 200
      send(req, res, data)
    })
  })
}

function get (req, res, options, callback) {
  Targets.get(function (err, target) {
    if (err) return callback(err)
    send(req, res, target.map(x => JSON.parse(x)))
  })
}

function getbyid (req, res, options, callback) {
  Targets.getbyid(options.params.key, function (err, target) {
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
