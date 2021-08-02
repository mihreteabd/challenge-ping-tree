process.env.NODE_ENV = 'test'

var test = require('ava')
var servertest = require('servertest')
var map = require('map-limit')

var server = require('../lib/server')()
var targets = require('./target-smaple.json')

test.serial.cb('healthcheck', function (t) {
  var url = '/health'
  servertest(server, url, { encoding: 'json' }, function (err, res) {
    t.falsy(err, 'no error')

    t.is(res.statusCode, 200, 'correct statusCode')
    t.is(res.body.status, 'OK', 'status is ok')
    t.end()
  })
})

test.serial.cb('should add target', function (t) {
  var url = '/api/targets'
  map(targets, 1, addtarget, function (err) {
    t.falsy(err, 'should not error')
    t.end()
  })
  function addtarget (target, cb) {
    var opts = { encoding: 'json', method: 'POST' }
    var stream = servertest(server, url, opts, function (err, res) {
      t.is(res.statusCode, 201, 'correct status code')
      cb(err)
    })

    stream.end(JSON.stringify(target))
  }
})

test.serial.cb('should update target', function (t) {
  var url = '/api/target/'
  map([targets[3]], 1, updatetarget, function (err) {
    t.falsy(err, 'should not error')
    t.end()
  })
  function updatetarget (target, cb) {
    var opts = { encoding: 'json', method: 'POST' }
    var stream = servertest(server, url + target.id, opts, function (err, res) {
      t.falsy(err, 'should not error')
      t.is(res.statusCode, 200, 'correct status code')
      t.is(res.body.maxAcceptsPerDay, 10)
      cb(err)
    })

    const updatetarget = { ...target, maxAcceptsPerDay: 10 }

    stream.end(JSON.stringify(updatetarget))
  }
})
