var db = require('../redis')

const getTargetById = id => `target:${id}`

module.exports = {
  post: post,
  putbyid: putbyid
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

function putbyid (id, target, callback) {
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
