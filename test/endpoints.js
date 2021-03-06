process.env.NODE_ENV = 'test'

var test = require('ava')
var servertest = require('servertest')
var map = require('map-limit')
var querystring = require('querystring')

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
  map(targets, 1, addTarget, function (err) {
    t.falsy(err, 'should not error')
    t.end()
  })
  function addTarget (target, cb) {
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
  map(targets, 1, getTargets, function (err) {
    t.falsy(err, 'should not error')
    t.end()
  })
  function getTargets (e = null, cb) {
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
  var sampleTargetId = [1, 31]
  var expected = [{
    id: '1',
    url: 'http://example.com',
    value: '0.50',
    maxAcceptsPerDay: '12',
    accept: {
      geoState: {
        $in: ['ca', 'md']
      },
      hour: {
        $in: ['13', '14', '15']
      }
    }
  }, null]
  var url = '/api/target/'
  map(sampleTargetId, 1, getTargetById, function (err, body) {
    t.falsy(err, 'should not error')
    t.deepEqual(body, expected, 'targets should match')
    t.end()
  })
  function getTargetById (targetId, cb) {
    var opts = { encoding: 'json' }
    servertest(server, url + targetId, opts, function (err, res) {
      if (err) return cb(err)
      t.is(res.statusCode, 200, 'correct status code')
      cb(err, res.body)
    })
  }
})

test.serial.cb('should update target', function (t) {
  var nonExistentTarget = {
    id: '21', // this id is not found so should not update
    url: 'http://example.com',
    value: '0.50',
    maxAcceptsPerDay: '12',
    accept: {
      geoState: {
        $in: ['ca', 'md']
      },
      hour: {
        $in: ['13', '14', '15']
      }
    }
  }

  // We assume targets[3] is already in the db.
  var sampleTargets = [targets[3], nonExistentTarget]
  var url = '/api/target/'

  const expected = [
    10,
    undefined // Should fail because the target does not exist
  ]

  map(sampleTargets, 1, updateTargets, function (err, body) {
    t.falsy(err, 'should not error')
    const maxAcc = body.map(x => x.maxAcceptsPerDay)
    t.deepEqual(maxAcc, expected, 'routes should match')
    t.end()
  })
  function updateTargets (target, cb) {
    var opts = { encoding: 'json', method: 'POST' }
    var stream = servertest(server, url + target.id, opts, function (err, res) {
      t.falsy(err, 'should not error')
      cb(err, res.body)
    })

    const updateTarget = { ...target, maxAcceptsPerDay: 10 }

    stream.end(JSON.stringify(updateTarget))
  }
})

test.serial.cb('should not update target', function (t) {
  var sampleTarget = {
    id: '21', // this id is not found so should not update
    url: 'http://example.com',
    value: '0.50',
    maxAcceptsPerDay: '12',
    accept: {
      geoState: {
        $in: ['ca', 'md']
      },
      hour: {
        $in: ['13', '14', '15']
      }
    }
  }
  var url = '/api/target/'
  map([sampleTarget], 1, updateTargets, function (err) {
    t.falsy(err, 'should not error')
    t.end()
  })
  function updateTargets (target, cb) {
    var opts = { encoding: 'json', method: 'POST' }
    var stream = servertest(server, url + target.id, opts, function (err, res) {
      t.falsy(err, 'should not error')
      t.is(res.statusCode, 200, 'correct status code')
      t.deepEqual(res.body, {}, 'should body empty')
      cb(err)
    })

    const updateTarget = { ...target, maxAcceptsPerDay: 10 }

    stream.end(JSON.stringify(updateTarget))
  }
})

test.serial.cb('should route traffic', function (t) {
  var requests = [
    {
      geoState: 'ca',
      publisher: 'abc',
      timestamp: '2017-03-12T13:30:00.000Z' // 13hr
    },
    {
      geoState: 'ny',
      publisher: 'ded',
      timestamp: '2017-03-12T09:30:00.000Z' // 09 hr
    },
    {
      geoState: 'nv',
      publisher: 'dedd',
      timestamp: '2017-03-12T03:30:00.000Z' // 03 hr
    }
  ]

  var expected = [
    'http://example.com',
    'http://example2.com',
    'http://example3.com'
  ]

  map(requests, 1, routeTraffic, function (err, routes) {
    t.falsy(err, 'should not error')
    t.deepEqual(routes, expected, 'routes should match')
    t.end()
  })

  function routeTraffic (request, cb) {
    var opts = { encoding: 'json', method: 'GET' }

    var url = '/api/route?' + querystring.stringify(request)
    servertest(server, url, opts, function (err, res) {
      if (err) return cb(err)
      t.is(res.statusCode, 302, 'correct statusCode')
      cb(null, res.body)
    })
  }
})

test.serial.cb('should correctly handle max traffic', function (t) {
  var requests = [
    {
      geoState: 'mn',
      publisher: 'abc',
      timestamp: '2017-03-12T18:30:00.000Z' // 18hr
    },
    {
      geoState: 'mn',
      publisher: 'abc',
      timestamp: '2017-03-12T18:30:00.000Z' // 18hr
    },
    {
      geoState: 'mn',
      publisher: 'abc',
      timestamp: '2017-03-12T18:30:00.000Z' // 18hr
    }
  ]

  var expected = [
    'http://example5.com',
    'http://example5.com',
    { decision: 'reject' } // because the maxAccept is only 2 and this is the third call
  ]

  map(requests, 1, routeTraffic, function (err, routes) {
    t.falsy(err, 'should not error')
    t.deepEqual(routes, expected, 'routes should match')
    t.end()
  })

  function routeTraffic (request, cb) {
    var opts = { encoding: 'json', method: 'GET' }
    var url = '/api/route?' + querystring.stringify(request)
    servertest(server, url, opts, function (err, res) {
      if (err) return cb(err)
      t.is(res.statusCode, 302, 'correct statusCode')
      cb(null, res.headers.location || res.body)
    })
  }
})
test.serial.cb('should choose route with high value', function (t) {
  var requests = [
    {
      geoState: 'va',
      publisher: 'abc',
      timestamp: '2017-03-12T18:30:00.000Z' // 18hr
    }
  ]

  var expected = [
    'http://example6.com'
  ]

  map(requests, 1, routeTraffic, function (err, routes) {
    t.falsy(err, 'should not error')
    t.deepEqual(routes, expected, 'routes should match')
    t.end()
  })

  function routeTraffic (request, cb) {
    var opts = { encoding: 'json', method: 'GET' }
    var url = '/api/route?' + querystring.stringify(request)
    servertest(server, url, opts, function (err, res) {
      if (err) return cb(err)
      t.is(res.statusCode, 302, 'correct statusCode')
      cb(null, res.headers.location || res.body)
    })
  }
})

test.serial.cb('target should ignore non-exitent query criterias', function (t) {
  var requests = [
    {
      geoState: 'oh',
      publisher: 'abc',
      timestamp: '2017-03-12T18:30:00.000Z'
    }
  ]

  var expected = [
    'http://example8.com'
  ]

  map(requests, 1, routeTraffic, function (err, routes) {
    t.falsy(err, 'should not error')
    t.deepEqual(routes, expected, 'routes should match')
    t.end()
  })

  function routeTraffic (request, cb) {
    var opts = { encoding: 'json', method: 'GET' }
    var url = '/api/route?' + querystring.stringify(request)
    servertest(server, url, opts, function (err, res) {
      if (err) return cb(err)
      t.is(res.statusCode, 302, 'correct statusCode')
      cb(null, res.headers.location || res.body)
    })
  }
})

test.serial.cb('should reject if non of the targets meet criteria', function (t) {
  var requests = [
    {
      geoState: 'ok',
      publisher: 'abc',
      timestamp: '2017-03-12T18:30:00.000Z'
    }
  ]

  var expected = [
    { decision: 'reject' } // because there is no target that has "ok" as geoState
  ]

  map(requests, 1, routeTraffic, function (err, routes) {
    t.falsy(err, 'should not error')
    t.deepEqual(routes, expected, 'routes should match')
    t.end()
  })

  function routeTraffic (request, cb) {
    var opts = { encoding: 'json', method: 'GET' }
    var url = '/api/route?' + querystring.stringify(request)
    servertest(server, url, opts, function (err, res) {
      if (err) return cb(err)
      t.is(res.statusCode, 302, 'correct statusCode')
      cb(null, res.headers.location || res.body)
    })
  }
})

test.serial.cb('should reject if some query criterias are meet but some are no', function (t) {
  var requests = [
    {
      geoState: 'mi',
      publisher: 'abc',
      timestamp: '2017-03-12T12:30:00.000Z'
    }
  ]

  var expected = [
    { decision: 'reject' }
  ]

  map(requests, 1, routeTraffic, function (err, routes) {
    t.falsy(err, 'should not error')
    t.deepEqual(routes, expected, 'routes should match')
    t.end()
  })

  function routeTraffic (request, cb) {
    var opts = { encoding: 'json', method: 'GET' }
    var url = '/api/route?' + querystring.stringify(request)
    servertest(server, url, opts, function (err, res) {
      if (err) return cb(err)
      t.is(res.statusCode, 302, 'correct statusCode')
      cb(null, res.headers.location || res.body)
    })
  }
})
