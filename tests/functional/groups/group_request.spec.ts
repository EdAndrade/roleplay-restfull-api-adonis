import Database from '@ioc:Adonis/Lucid/Database'
import { test } from '@japa/runner'
import { GroupFactory, userFactory } from 'Database/factories'

test.group('Group', async (group) => {
  test('it shoult create a group request', async ({ assert, client }) => {
    const plainPassword = 'test'
    const { email, id } = await userFactory.merge({ password: plainPassword }).create()

    const group = await GroupFactory.merge({ master: id }).create()
    const sessionResponse = await client.post('/sessions').json({
      email,
      password: plainPassword,
    })
    const { body } = sessionResponse.response

    const { response } = await client
      .post(`/groups/${group.id}/requests`)
      .header('Authorization', `Bearer ${sessionResponse.response.body.token.token}`)
      .json({})

    assert.exists(response.body.groupRequest)
    assert.equal(response.body.groupRequest.userId, body.user.id)
    assert.equal(response.body.groupRequest.groupId, group.id)
    assert.equal(response.body.groupRequest.status, 'PENDING')
    // assert.equal(response.statusCode, 201)
  })

  test('it should return 409 when group request already exists', async ({ assert, client }) => {
    const plainPassword = 'test'
    const { email, id } = await userFactory.merge({ password: plainPassword }).create()

    const group = await GroupFactory.merge({ master: id }).create()
    const sessionResponse = await client.post('/sessions').json({
      email,
      password: plainPassword,
    })
    await client
      .post(`/groups/${group.id}/requests`)
      .header('Authorization', `Bearer ${sessionResponse.response.body.token.token}`)
      .json({})

    const { response } = await client
      .post(`/groups/${group.id}/requests`)
      .header('Authorization', `Bearer ${sessionResponse.response.body.token.token}`)
      .json({})

    assert.equal(response.body.code, 'BAD_REQUEST')
    assert.equal(response.statusCode, 409)
  })

  test('it should return 422 when user is already in the group', async ({ assert, client }) => {
    const plainPassword = 'test'
    const { email, id } = await userFactory.merge({ password: plainPassword }).create()
    const sessionResponse = await client.post('/sessions').json({
      email,
      password: plainPassword,
    })
    const { body } = sessionResponse.response

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
      .header('Authorization', `Bearer ${body.token.token}`)
      .json(groupPayload)

    const responseToChek = await client
      .post(`/groups/${response.body.group.id}/requests`)
      .header('Authorization', `Bearer ${body.token.token}`)
      .json({})

    assert.equal(responseToChek.response.body.code, 'BAD_REQUEST')
    assert.equal(responseToChek.response.statusCode, 422)
  })

  test('it should list group request by master', async ({ assert, client }) => {
    const master = await userFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()
    const { response } = await client.get(`/groups/${group.id}/requests?master=${master.id}`)
    console.log(response.body)
    assert.equal(response.statusCode, 200)
    assert.exists(response.body.groupRequests, 'Groups request undefined')
  }).pin()

  group.each.setup(async () => {
    await Database.beginGlobalTransaction()
  })

  group.each.teardown(async () => {
    await Database.rollbackGlobalTransaction()
  })
})
