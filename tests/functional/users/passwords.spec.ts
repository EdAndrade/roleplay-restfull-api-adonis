import Mail from '@ioc:Adonis/Addons/Mail'
import Database from '@ioc:Adonis/Lucid/Database'
import { test } from '@japa/runner'
import { userFactory } from 'Database/factories'
import Hash from '@ioc:Adonis/Core/Hash'
import { DateTime, Duration } from 'luxon'

test.group('Password', (group) => {
  test('it should send an email with forgot password instructions', async ({ assert, client }) => {
    const user = await userFactory.create()
    const mailer = Mail.fake()

    const { response } = await client.post('/forgot-password').json({
      email: user.email,
      resetPasswordUrl: 'url',
    })
    assert.equal(response.statusCode, 204)
    assert.isTrue(mailer.exists({ to: [{ address: user.email }] }))
    assert.isTrue(mailer.exists({ from: { address: 'no-reply@roleplay.com' } }))
    assert.isTrue(mailer.exists({ subject: 'Roleplay: Recuperacão de Senha' }))
    assert.isTrue(
      mailer.exists((mail) => {
        return Boolean(mail.html?.includes(user.username))
      })
    )
    Mail.restore()
  })

  test('it should create a reset password token', async ({ assert, client }) => {
    const user = await userFactory.create()

    await client.post('/forgot-password').json({
      email: user.email,
      resetPassword: 'url',
    })
    const tokens = (await user).related('tokens').query()
    assert.isNotEmpty(tokens)
  })

  test('it should return 422 when required data is not provided or is invalid', async ({
    assert,
    client,
  }) => {
    const { response } = await client.post('/forgot-password').json({})
    assert.equal(response.statusCode, 422)
    assert.equal(response.body.code, 'BAD_REQUEST')
  })

  test('it should be able to reset password', async ({ assert, client }) => {
    const user = await userFactory.create()
    const { token } = await user.related('tokens').create({ token: 'token' })
    const { response } = await client.post('/reset-password').json({
      token,
      password: '123456',
    })
    assert.equal(response.statusCode, 204)
    await user.refresh()
    const checkPassword = await Hash.verify(user.password, '123456')
    assert.isTrue(checkPassword)
  })

  test('it should return 422 when required data is not provided or is invalid', async ({
    assert,
    client,
  }) => {
    const { response } = await client.post('/reset-password').json({})
    assert.equal(response.statusCode, 422)
    assert.equal(response.body.code, 'BAD_REQUEST')
  })

  test('it should return 404 when using the same token twice', async ({ assert, client }) => {
    const user = await userFactory.create()
    const { token } = await user.related('tokens').create({ token: 'token' })
    const { response } = await client.post('/reset-password').json({
      token,
      password: '123456',
    })
    assert.equal(response.statusCode, 204)

    const secondResponse = await client.post('/reset-password').json({
      token,
      password: '123456',
    })
    assert.equal(secondResponse.response.statusCode, 404)
    assert.equal(secondResponse.response.body.code, 'BAD_REQUEST')
  })

  test('it cannot reset password is expired after 2 hours', async ({ client, assert }) => {
    const user = await userFactory.create()
    const date = DateTime.now().minus(Duration.fromISOTime('02:01'))
    const { token } = await user.related('tokens').create({ token: 'token', createdAt: date })
    const { response } = await client.post('/reset-password').json({
      token,
      password: '123456',
    })
    assert.equal(response.statusCode, 410)
    assert.equal(response.body.code, 'TOKEN_EXPIRED')
    assert.equal(response.body.message, 'token has expired')
  })

  group.each.setup(async () => {
    await Database.beginGlobalTransaction()
  })

  group.each.teardown(async () => {
    await Database.rollbackGlobalTransaction()
  })
})
