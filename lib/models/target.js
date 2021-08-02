var db = require('../redis')

const getTargetById = id => `target:${id}`

module.exports = {
  post: post,
  putById: putById,
  get: get,
  getById: getById,
  route: route
}

function post (target, callback) {
  const multi = db.multi()
  multi.set(getTargetById(target.id), JSON.stringify(target))

  Object.keys(target.accept).forEach(criteria => {
    target.accept[criteria].$in.forEach(value => {
      // geoState:ca = url
      multi.sadd(`${criteria}:${value}`, target.url)
    })
  })
  multi.exec(callback)
}

function putById (id, target, callback) {
  const multi = db.multi()
  multi.set(getTargetById(target.id), JSON.stringify(target))
  multi.zadd('url', target.maxAcceptsPerday, target.url)
  Object.keys(target.accept).forEach(criteria => {
    target.accept[criteria].$in.forEach(value => {
      // geoState:ca = url
      multi.sadd(`${criteria}:${value}`, target.url)
    })
  })
  multi.exec(e => {
    db.get(getTargetById(id), function (err, value) {
      if (err) return err
      callback(e, value)
    })
  })
}

function get (callback) {
  db.keys('target:*', function (err, keys) {
    if (err) return err
    db.mget(keys, function (err, value) {
      if (err) return callback(err)
      callback(null, value)
    })
  })
}

function getById (id, callback) {
  db.get(getTargetById(id), callback)
}

const updateAndGetLatestTargetTraffic = (target, callback) => {
  const maxAccept = Number(target.maxAcceptsPerDay)

  const date = new Date(Date.now())
  const dateT = date.getDate()
  const month = date.getMonth()
  const year = date.getFullYear()

  // target:{id}:{date} = counter
  // target:3:2021-3-2: check for previous counter, if no set it to 1

  const dateText = `${dateT}:${month}:${year}`
  const getTraficCounterText = `${getTargetById(target.id)}:${dateText}`

  db.get(getTraficCounterText, function (err, todayTrafficCounter) {
    if (err) console.log(err)
    if (!todayTrafficCounter) {
      db.set(getTraficCounterText, 1)
      callback(null, target.url)
    }
    if (todayTrafficCounter && maxAccept > todayTrafficCounter) {
      db.set(getTraficCounterText, Number(todayTrafficCounter) + 1)
      callback(null, target.url)
    }
    if (todayTrafficCounter && todayTrafficCounter >= maxAccept) {
      callback(null, { decision: 'reject' })
    }
  })
}

function route (options, callback) {
  const { query } = options
  const { timestamp, geoState } = query
  const date = new Date(timestamp)
  const hour = date.getUTCHours()

  const intersectBy = [`hour:${hour}`, `geoState:${geoState}`]

  const multi = db.multi()
  multi
    .zrangebyscore('url', '-inf', '+inf')
    .sinter(intersectBy)
    .exec(function (err, result) {
      if (err) return callback(err)

      db.keys('target:*', function (err, keys) {
        if (err) return console.log(err)
        db.mget(keys, function (err, value) {
          if (err) return console.log(err)
          const parsedTargets = value.map(x => JSON.parse(x))

          const matchedTarget = parsedTargets.filter(target => {
            return (
              target.url === result[1][0] &&
              target.accept.geoState.$in.includes(geoState) &&
              target.accept.hour.$in
                .map(x => Number(x))
                .includes(Number(hour))
            )
          })

          updateAndGetLatestTargetTraffic(matchedTarget[0], callback)
        })
      })
    })
}
