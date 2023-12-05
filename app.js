const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const bcrypt = require('bcrypt')
const dbPath = path.join(__dirname, 'userData.db')
const app = express()
app.use(express.json())

let db = null
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}

initializeDBAndServer()

//API for registration
app.post('/register', async (request, response) => {
  const userDetails = request.body
  const {username, name, password, gender, location} = userDetails
  const hashedPassword = await bcrypt.hash(password, 10)
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`
  const dbUser = await db.get(selectUserQuery)
  if (dbUser === undefined) {
    if (password.length < 5) {
      response.status(400)
      response.send('Password is too short')
    } else {
      const createUserQuery = `
        INSERT INTO
          user (username, name, password, gender, location)
        VALUES ('${username}', '${name}', '${hashedPassword}', '${gender}', '${location}');`
      await db.run(createUserQuery)
      response.status(200)
      response.send('User created successfully')
    }
  } else {
    response.status(400)
    response.send('User already exists')
  }
})

//API for login
app.post('/login', async (request, response) => {
  const loginUserDetails = request.body
  const {username, password} = loginUserDetails
  const findUserQuery = `SELECT * FROM user WHERE username = '${username}';`
  const dbUser = await db.get(findUserQuery)
  if (dbUser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password)
    if (isPasswordMatched === true) {
      response.status(200)
      response.send('Login success!')
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

//update password
app.put('/change-password', async (request, response) => {
  const toUpdateDetails = request.body
  const {username, oldPassword, newPassword} = toUpdateDetails
  const userDataQuery = `SELECT * FROM user WHERE username = '${username}';`
  const userData = await db.get(userDataQuery)
  if (userData === undefined) {
    response.status(400)
    response.send('User not registered')
  } else {
    const isOldPasswordMatched = await bcrypt.compare(
      oldPassword,
      userData.password,
    )
    if (isOldPasswordMatched === true) {
      if (newPassword.length < 5) {
        response.status(400)
        response.send('Password is too short')
      } else {
        const hashedPassword = await bcrypt.hash(newPassword, 10)
        const toUpdateQuery = `UPDATE user SET password = '${hashedPassword}' WHERE username = '${username}';`
        await db.run(toUpdateQuery)
        response.send('Password updated')
      }
    } else {
      response.status(400)
      response.send('Invalid current password')
    }
  }
})

module.exports = app
