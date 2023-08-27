import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import BadRequestException from 'App/Exceptions/BadRequestException'
import Group from 'App/Models/Group'
import GroupRequest from 'App/Models/GroupRequest'

export default class GroupRequestsController {
  public async index({ request, response }: HttpContextContract) {
    const { master } = request.qs()
    const groupRequests = await GroupRequest.query()
      .select('id', 'groupId')
      .preload('group', (query) => {
        query.select('name')
      })
      .whereHas('group', (query) => {
        query.where('master', Number(master))
      })
      .where('status', 'PENDING')
    return response.ok({ groupRequests })
  }

  public async store({ request, response, auth }: HttpContextContract) {
    const groupId = request.param('groupId') as number
    const userId = auth.user!.id

    const exestingGroupRequest = await GroupRequest.query()
      .where('groupId', groupId)
      .andWhere('userId', userId)
      .first()

    if (exestingGroupRequest) {
      throw new BadRequestException('group request already exists', 409)
    }

    const userAlreadyInGroup = await Group.query()
      .whereHas('players', (query) => {
        query.where('id', userId)
      })
      .andWhere('id', groupId)
      .first()

    if (userAlreadyInGroup) {
      throw new BadRequestException('user already exists', 422)
    }

    const groupRequest = await GroupRequest.create({ groupId, userId })
    await groupRequest.refresh()
    return response.created({ groupRequest })
  }

  public async accept({ request, response }: HttpContextContract) {
    const groupId = request.param('groupId') as number
    const requesId = request.param('requestId') as number

    const groupRequest = await GroupRequest.query()
      .where('id', requesId)
      .andWhere('id', groupId)
      .firstOrFail()

    const updatedGroupRequest = await groupRequest.merge({ status: 'ACCEPTED' }).save()
    await groupRequest.load('group')
    await groupRequest.group.related('players').attach([groupRequest.userId])
    return response.ok({ groupRequest: updatedGroupRequest })
  }
}
