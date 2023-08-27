import Database from '@ioc:Adonis/Lucid/Database'
import { test } from '@japa/runner'
import { userFactory } from 'Database/factories'
import Hash from '@ioc:Adonis/Core/Hash'

let token = ''

test.group('User', (group) => {
  test('it should create an user', async ({ assert, client }) => {
    const userPayload = {
      email: 'test@test.com',
      username: 'test',
      password: 'test',
      avatar: 'https://images.com/image/1',
    }
    const { response } = await client.post('/users').json(userPayload)
    assert.exists(response.body.user, 'User undefined')
    assert.exists(response.body.user.id, 'iD undefined')
    assert.equal(response.body.user.email, userPayload.email)
    assert.equal(response.body.user.username, userPayload.username)
    assert.notExists(response.body.user.password, 'Password defined')
    assert.equal(response.body.user.avatar, userPayload.avatar)
  })

  test('it should return 409 when email is already in use', async ({ assert, client }) => {
    const { email } = await userFactory.create()
    const { response } = await client.post('/users').json({
      username: 'test',
      email,
      password: 'test',
    })
    assert.equal(response.statusCode, 409)
    assert.include(response.body.message, 'email')
    assert.equal(response.body.code, 'BAD_REQUEST')
  })

  test('it should return 409 when username is already in use', async ({ assert, client }) => {
    const { username } = await userFactory.create()
    const { response } = await client.post('/users').json({
      username,
      email: 'test@test.com',
      password: 'test',
    })
    assert.equal(response.statusCode, 409)
    assert.include(response.body.message, 'username')
    assert.equal(response.body.code, 'BAD_REQUEST')
  })

  test('it should return 422 when required data is not provided', async ({ assert, client }) => {
    const { response } = await client.post('/users').send()
    assert.equal(response.body.code, 'BAD_REQUEST')
    assert.equal(response.body.status, 422)
  })

  test('it should return 422 when provided invalid email', async ({ assert, client }) => {
    const { username } = await userFactory.create()
    const { response } = await client.post('/users').json({
      email: 'test@',
      password: 'test',
      username,
    })
    assert.equal(response.body.code, 'BAD_REQUEST')
    assert.equal(response.body.status, 422)
  })

  test('it should return 422 when provided invalid password', async ({ assert, client }) => {
    const { username, email } = await userFactory.create()
    const { response } = await client.post('/users').json({
      email,
      password: 'tes',
      username,
    })
    assert.equal(response.body.code, 'BAD_REQUEST')
    assert.equal(response.body.status, 422)
  })

  test('it should update an user', async ({ assert, client }) => {
    const plainPassword = 'test'
    const { id, email } = await userFactory.merge({ password: plainPassword }).create()
    const sessionResponse = await client.post('/sessions').json({
      email,
      password: plainPassword,
    })

    token = sessionResponse.response.body.token.token

    const updatedEmail = 'test@test.com'
    const avatar = 'https://github.com/edAndrade'

    const { response } = await client
      .put(`/users/${id}`)
      .json({
        email: updatedEmail,
        avatar,
        password: plainPassword,
      })
      .header('Authorization', `Bearer ${token}`)

    assert.equal(response.statusCode, 200)
    assert.exists(response.body.user, 'User undefined')
    assert.equal(response.body.user.email, updatedEmail)
    assert.equal(response.body.user.avatar, avatar)
    assert.equal(response.body.user.id, id)
  })

  test('it should update the password of the user', async ({ assert, client }) => {
    const password = 'test'
    const user = await userFactory.merge({ password }).create()

    const sessionResponse = await client.post('/sessions').json({
      email: user.email,
      password,
    })

    const { response } = await client
      .put(`/users/${user.id}`)
      .json({
        email: user.email,
        avatar: user.avatar,
        password,
      })
      .header('Authorization', `Bearer ${sessionResponse.response.body.token.token}`)
    assert.equal(response.statusCode, 200)
    assert.exists(response.body.user, 'User undefined')
    assert.equal(response.body.user.id, user.id)

    await user.refresh()
    assert.isTrue(await Hash.verify(user.password, password))
  })

  test('it should return 422 when required data is nor provided', async ({ assert, client }) => {
    const { id } = await userFactory.create()
    const { response } = await client
      .put(`/users/${id}`)
      .json({})
      .header('Authorization', `Bearer ${token}`)

    assert.equal(response.statusCode, 422)
    assert.equal(response.body.code, 'BAD_REQUEST')
  })

  test('it should return 422 when provided an invalid email', async ({ assert, client }) => {
    const { id, password, avatar } = await userFactory.create()
    const { response } = await client
      .put(`/users/${id}`)
      .json({
        password,
        avatar,
        email: 'test@',
      })
      .header('Authorization', `Bearer ${token}`)

    assert.equal(response.statusCode, 422)
    assert.equal(response.body.code, 'BAD_REQUEST')
  })

  test('it should return 422 when provided an invalid password', async ({ assert, client }) => {
    const { id, email, avatar } = await userFactory.create()
    const { response } = await client
      .put(`/users/${id}`)
      .json({
        email,
        avatar,
        password: 'tes',
      })
      .header('Authorization', `Bearer ${token}`)

    assert.equal(response.statusCode, 422)
    assert.equal(response.body.code, 'BAD_REQUEST')
  })

  test('it should return 422 when provided an invalid avatar', async ({ assert, client }) => {
    const { id, email, password } = await userFactory.create()
    const { response } = await client
      .put(`/users/${id}`)
      .json({
        email,
        password,
        avatar: '3fasdf',
      })
      .header('Authorization', `Bearer ${token}`)

    assert.equal(response.statusCode, 422)
    assert.equal(response.body.code, 'BAD_REQUEST')
  })

  group.each.setup(async () => {
    await Database.beginGlobalTransaction()
  })

  group.each.teardown(async () => {
    await Database.rollbackGlobalTransaction()
  })
})
