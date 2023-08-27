import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { ModelQueryBuilderContract } from '@ioc:Adonis/Lucid/Orm'
import Group from 'App/Models/Group'
import CreateGroupValidator from 'App/Validators/CreateGroupValidator'

export default class GroupsController {
  public async index({ request, response }: HttpContextContract) {
    const { text, ['user']: userId } = request.qs()
    let groups = [] as any

    if (!userId) {
      if (!text) {
        groups = await Group.query()
          .preload('players')
          .preload('masterUser')
          .where('name', 'LIKE', `%${text}%`)
          .orWhere('description', 'LIKE', `%${text}%`)
      } else {
        groups = await Group.query().preload('players').preload('masterUser')
      }
    } else {
      if (!text) {
        groups = await Group.query()
          .preload('players')
          .preload('masterUser')
          .whereHas('players', (query) => {
            query.where('id', userId)
          })
      } else {
        groups = await Group.query()
          .preload('players')
          .preload('masterUser')
          .whereHas('players', (query) => {
            query.where('id', userId)
          })
          .where('name', 'LIKE', `%${text}%`)
          .orWhere('description', 'LIKE', `%${text}%`)
      }
    }
    return response.ok({ groups })
  }

  public async indexWithFilter({ request, response }: HttpContextContract) {
    const { text, ['user']: userId } = request.qs()
    const page = request.input('page', 1)
    const limit = request.input('limit', 10)

    return response.ok({
      group: await this.filterByQueryString(text, userId)?.paginate(page, limit),
    })
  }

  private filterByQueryString(text: string, userId: number) {
    const group = this.all()
    if (text && userId) {
      return this.filterByUser(this.filterByText(group, text), userId)
    } else if (text) {
      return this.filterByText(group, text)
    } else if (userId) {
      return this.filterByUser(group, userId)
    }
  }

  private all() {
    return Group.query().preload('players').preload('masterUser')
  }

  private filterByUser(group: ModelQueryBuilderContract<typeof Group, Group>, userId: number) {
    return group.whereHas('players', (query) => {
      query.where('id', userId)
    })
  }

  private filterByText(group: ModelQueryBuilderContract<typeof Group, Group>, text: string) {
    return group.where('name', 'LIKE', `%${text}%`).orWhere('description', 'LIKE', `%${text}%`)
  }

  public async store({ request, response }: HttpContextContract) {
    const groupPayload = await request.validate(CreateGroupValidator)
    const group = await Group.create(groupPayload)
    await group.related('players').attach([groupPayload.master])
    await group.load('players')
    return response.created({ group })
  }

  public async removePlayer({ request, response }: HttpContextContract) {
    const groupId = request.param('groupId') as number
    const playerId = request.param('playerId') as number

    const group = await Group.findOrFail(groupId)
    await group.related('players').detach([playerId])
    return response.ok({})
  }

  public async destroy({ request, response }: HttpContextContract) {
    const id = request.param('id')
    const group = await Group.findOrFail(id)

    await group.delete()
    // await group.related('players').detach()
    return response.ok({})
  }
}
