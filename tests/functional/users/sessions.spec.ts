import Database from '@ioc:Adonis/Lucid/Database'
import { test } from '@japa/runner'
import { userFactory } from 'Database/factories'

test.group('Session', (group) => {
  test('it should authenticate an user', async ({ assert, client }) => {
    const plainPassword = 'test'
    const { id, email } = await userFactory.merge({ password: plainPassword }).create()
    const { response } = await client.post('/sessions').json({
      email,
      password: plainPassword,
    })
    assert.equal(response.statusCode, 201)
    assert.isDefined(response.body.user, 'User undefined')
    assert.equal(response.body.user.id, id)
  })

  test('it should return an api token when session is created', async ({ assert, client }) => {
    const plainPassword = 'test'
    const { id, email } = await userFactory.merge({ password: plainPassword }).create()
    const { response } = await client.post('/sessions').json({
      email,
      password: plainPassword,
    })
    assert.equal(response.statusCode, 201)
    assert.isDefined(response.body.token, 'Token undefined')
    assert.equal(response.body.user.id, id)
  })

  test('it should return 400 when credetials are not provided', async ({ assert, client }) => {
    const { response } = await client.post('/sessions').json({})
    assert.equal(response.statusCode, 400)
    assert.equal(response.body.code, 'BAD_REQUEST')
  })

  test('it should return 404 when credetials are not invalid', async ({ assert, client }) => {
    const { email } = await userFactory.create()
    const { response } = await client.post('/sessions').json({
      email,
      password: 'tesr',
    })
    assert.equal(response.statusCode, 400)
    assert.equal(response.body.code, 'BAD_REQUEST')
    assert.equal(response.body.message, 'invalid credentials')
  })

  test('it should return 200 when user signout', async ({ assert, client }) => {
    const plainPassword = 'test'
    const { email } = await userFactory.merge({ password: plainPassword }).create()
    const { response } = await client.post('/sessions').json({
      email,
      password: plainPassword,
    })
    const { token } = response.body
    const logoutResponse = await client
      .delete('/sessions')
      .header('Authorization', `Bearer ${token.token}`)

    assert.equal(logoutResponse.response.statusCode, 200)
  })

  test('it should revoke token when user signout', async ({ assert, client }) => {
    const plainPassword = 'test'
    const { email } = await userFactory.merge({ password: plainPassword }).create()
    const { response } = await client.post('/sessions').json({
      email,
      password: plainPassword,
    })
    const { token } = response.body

    const logoutResponse = await client
      .delete('/sessions')
      .header('Authorization', `Bearer ${token.token}`)

    assert.equal(logoutResponse.response.statusCode, 200)
    const revokedToken = await Database.query().select('*').from('api_tokens')

    assert.isEmpty(revokedToken)
  })

  group.each.setup(async () => {
    await Database.beginGlobalTransaction()
  })

  group.each.teardown(async () => {
    await Database.rollbackGlobalTransaction()
  })
})
