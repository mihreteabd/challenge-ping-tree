var db = require('../redis')

const getTargetById = id => `target:${id}`
const hashkey = 'targets'
const hashKeyTargetCopy = 'targetsCopy'

module.exports = {
  post: post,
  putById: putById,
  get: get,
  getById: getById,
  route: route
}

function post (target, callback) {
  const multi = db.multi()
  multi.hset(hashkey, getTargetById(target.id), JSON.stringify(target))
  multi.hset(hashKeyTargetCopy, getTargetById(target.id), JSON.stringify(customizeTarget(target)))
  multi.exec(callback)
}

function putById (id, target, callback) {
  getById(id, function (err, res) {
    const multi = db.multi()
    if (err) callback(err, res)
    if (res[0] === null) callback(res)
    multi.hset(hashkey, getTargetById(id), JSON.stringify(target))
    multi.hset(hashKeyTargetCopy, getTargetById(id), JSON.stringify(customizeTarget(target)))
    multi.exec(callback)
  })
}

function get (callback) {
  db.HVALS(hashkey, function (err, value) {
    callback(err, value)
  })
}

function getById (id, callback) {
  db.hget(hashkey, getTargetById(id), callback)
}

function route (options, callback) {
  const { query } = options

  db.HVALS(hashKeyTargetCopy, function (err, value) {
    if (err) return callback(err)
    const parsedValues = value.map(t => JSON.parse(t))
    const filterdValue = parsedValues.filter(t => {
      const criteriaResultArray = Object.keys(query).map(criteria => {
        if (criteria === 'timestamp') {
          if (t.accept.hour) {
            if (t.accept.hour.$in) {
              return (t.accept.hour.$in || []).includes(`${new Date(query.timestamp).getUTCHours()}`) // this return immediately after one
            }
          } else {
            return true
          }
          return false
        }

        if (t.accept[criteria]) {
          if (t.accept[criteria].$in) {
            return (t.accept[criteria].$in || []).includes(query[criteria]) // this return immediately after one
          }
        } else {
          return true
        }
        return false
      })

      const allCriteriaMeets = criteriaResultArray.filter(x => x).length === Object.keys(query).length
      return allCriteriaMeets && (isBelowMaxRequest(t) || t.lastRequestedDate !== getCurrentDate())
    })
    var highValue = filterdValue.reduce(function (withHighValue, target) {
      return (withHighValue.value || 0) > target.value ? withHighValue : target
    }, {})
    if (Object.keys(highValue).length === 0) {
      callback(null, { decision: 'reject' })
    } else {
      db.hset(hashKeyTargetCopy, [getTargetById(highValue.id), JSON.stringify(updateRequestCount(highValue))])
      callback(null, highValue.url)
    }
  })
}

function updateRequestCount (target) {
  if (target.lastRequestedDate === getCurrentDate()) {
    target.requestCount = parseInt(target.requestCount) + 1
    return target
  }
  target.lastRequestedDate = getCurrentDate()
  target.requestCount = 1
  return target
}

function customizeTarget (target) {
  target.requestCount = 0
  target.lastRequestedDate = null
  return target
}

function getCurrentDate () {
  const current = new Date()
  const dateT = current.getDate()
  const month = current.getMonth()
  const year = current.getFullYear()
  return `${year}-${month}-${dateT}`
}

function isBelowMaxRequest (target) {
  return parseInt(target.requestCount) < parseInt(target.maxAcceptsPerDay)
}
