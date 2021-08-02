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

test.serial.cb('should get all targets', function (t) {
  var url = '/api/targets'
  map(targets, 1, gettargets, function (err) {
    t.falsy(err, 'should not error')
    t.end()
  })
  function gettargets (e = null, cb) {
    var opts = { encoding: 'json', method: 'GET' }
    servertest(server, url, opts, function (err, res) {
      if (err) return cb(err)
      t.is(res.statusCode, 200, 'correct status code')
      t.deepEqual(res.body, targets, 'targets should match')
      cb()
    })
  }
})

test.serial.cb('should get target by id', function (t) {
  var url = '/api/target/'
  map(targets, 1, getTargetById, function (err) {
    t.falsy(err, 'should not error')
    t.end()
  })
  function getTargetById (target, cb) {
    var opts = { encoding: 'json' }
    servertest(server, url + target.id, opts, function (err, res) {
      if (err) return cb(err)
      t.is(res.statusCode, 200, 'correct status code')
      t.deepEqual(res.body, target, 'targets should match')
      cb()
    })
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
