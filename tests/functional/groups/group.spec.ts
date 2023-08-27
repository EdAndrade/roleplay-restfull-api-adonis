import Database from '@ioc:Adonis/Lucid/Database'
import { test } from '@japa/runner'
import { userFactory } from 'Database/factories'

test.group('Group', async (group) => {
  test('it shoult create a group', async ({ assert, client }) => {
    const plainPassword = 'test'
    const { email, id } = await userFactory.merge({ password: plainPassword }).create()
    const sessionResponse = await client.post('/sessions').json({
      email,
      password: plainPassword,
    })
    const groupPayload = {
      name: 'test',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronic: 'test',
      master: id,
    }
    const { response } = await client
      .post('/groups')
      .header('Authorization', `Bearer ${sessionResponse.response.body.token.token}`)
      .json(groupPayload)

    assert.equal(response.statusCode, 201)
    assert.equal(response.body.group.name, groupPayload.name)
    assert.equal(response.body.group.description, groupPayload.description)
    assert.equal(response.body.group.schedule, groupPayload.schedule)
    assert.equal(response.body.group.location, groupPayload.location)
    assert.equal(response.body.group.chronic, groupPayload.chronic)
    assert.equal(response.body.group.master, groupPayload.master)

    assert.exists(response.body.group.players, 'Players undefined')
    assert.equal(response.body.group.players.length, 1)
    assert.equal(response.body.group.players[0].id, groupPayload.master)
  })

  test('it should return 422 when required data is not provided', async ({ assert, client }) => {
    const plainPassword = 'test'
    const { email } = await userFactory.merge({ password: plainPassword }).create()
    const sessionResponse = await client.post('/sessions').json({
      email,
      password: plainPassword,
    })
    const { response } = await client
      .post('/groups')
      .header('Authorization', `Bearer ${sessionResponse.response.body.token.token}`)
      .json({})

    assert.equal(response.body.code, 'BAD_REQUEST')
    assert.equal(response.statusCode, 422)
  })

  group.each.setup(async () => {
    await Database.beginGlobalTransaction()
  })

  group.each.teardown(async () => {
    await Database.rollbackGlobalTransaction()
  })
})
