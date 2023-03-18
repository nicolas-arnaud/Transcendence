import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { type CreateChannelDto } from './dto/create-channel.dto'
import { UsersService } from 'src/users/users.service'

import type User from 'src/users/entity/user.entity'
import Channel from './entity/channel.entity'
import { Cron } from '@nestjs/schedule'

@Injectable()
export class ChatService {
  constructor (
    @InjectRepository(Channel)
    private readonly ChannelRepository: Repository<Channel>,
    private readonly usersService: UsersService
  ) {}

  async createChannel (channel: CreateChannelDto): Promise<Channel> {
    const user: User | null = await this.usersService.findUser(channel.owner)
    if (user == null) {
      throw new BadRequestException(`User #${channel.owner} not found`)
    }

    let newChannel: Channel
    if (channel.isDM) {
      const otherUser: User | null = await this.usersService.findUserByName(
        channel.otherDMedUsername
      )
      if (otherUser == null) {
        throw new BadRequestException(
          `User #${channel.otherDMedUsername} not found`
        )
      }
      if (otherUser.id === user.id) {
        throw new BadRequestException('Cannot DM yourself')
      }

      const channels = await this.getChannelsForUser(user.id)
      const dmAlreadyExists = channels.find((channel: Channel) => {
        return (
          (channel.name === `${user.ftId}&${otherUser.ftId}` ||
            channel.name === `${otherUser.ftId}&${user.ftId}`) &&
          (channel.password === undefined || channel.password === '') &&
          channel.isPrivate
        )
      })
      if (dmAlreadyExists !== undefined) {
        throw new BadRequestException('DM already exists')
      }

      newChannel = this.createDM(user, otherUser)
    } else {
      newChannel = new Channel()
      newChannel.owner = user
      newChannel.users = [user]
      newChannel.admins = [user]
      newChannel.name = channel.name
      newChannel.isPrivate = channel.isPrivate
      newChannel.password = channel.password
    }
    return await this.ChannelRepository.save(newChannel)
  }

  createDM (user: User, otherUser: User): Channel {
    const newDM = new Channel()
    newDM.isPrivate = true
    newDM.password = ''
    newDM.owner = user
    newDM.users = [user, otherUser]
    newDM.admins = []
    newDM.name = `${user.ftId}&${otherUser.ftId}`
    return newDM
  }

  async updatePassword (id: number, password: string): Promise<void> {
    const channel: Channel | null = await this.ChannelRepository.findOneBy({
      id
    })
    if (channel === null) {
      throw new BadRequestException(`Channel #${id} not found`)
    }
    channel.password = password
    await this.update(channel)
  }

  async getChannelsForUser (ftId: number): Promise<Channel[]> {
    let rooms: Channel[] = []
    rooms = [
      ...(await this.ChannelRepository.createQueryBuilder('room')
        .where('room.isPrivate = false')
        .orderBy('room.id', 'DESC')
        .getMany())
    ]

    rooms = [
      ...rooms,
      ...(await this.ChannelRepository.createQueryBuilder('room')
        .innerJoin('room.users', 'users')
        .where('room.isPrivate = true')
        .andWhere('users.ftId = :ftId', { ftId })
        .getMany())
    ]
    return rooms
  }

  @Cron('*/6 * * * * *')
  async updateMutelists (): Promise<void> {
    const channels = await this.ChannelRepository.find({})
    channels.forEach((channel) => {
      channel.muted = channel.muted.filter((data) => {
        return Date.now() - data[1] > 0
      })
      void this.update(channel)
    })
  }

  @Cron('*/6 * * * * *')
  async updateBanlists (): Promise<void> {
    console.log('checking bans')
    const channels = await this.ChannelRepository.find({})
    for (const channel of channels) {
      console.log((channel.banned.length) > 0)
      channel.banned = channel.banned.filter((data) => {
        return Date.now() - data[1] > 0
      })
      void this.update(channel)
    }
  }

  async addUserToChannel (channel: Channel, user: User): Promise<Channel> {
    channel.users.push(user)
    await this.save(channel)
    return channel
  }

  async getChannel (id: number): Promise<Channel> {
    const channel = await this.ChannelRepository.findOneBy({ id })
    if (channel == null) {
      throw new BadRequestException(`Channel #${id} not found`)
    }
    return channel
  }

  // Warning: those channels users contains socketKey.
  // they have to be hidden before returned from a route
  // but not save them without the key.
  async getFullChannel (id: number): Promise<Channel> {
    const channel = await this.ChannelRepository.findOne({
      where: { id },
      relations: ['users', 'admins', 'owner']
    })
    if (channel == null) {
      throw new BadRequestException(`Channel #${id} not found`)
    }
    return channel
  }

  async update (channel: Channel): Promise<void> {
    await this.ChannelRepository.update(channel.id, channel)
  }

  async save (channel: Channel): Promise<void> {
    await this.ChannelRepository.save(channel)
  }

  async removeChannel (channelId: number): Promise<void> {
    await this.ChannelRepository.delete(channelId)
  }

  async isOwner (id: number, userId: number): Promise<boolean> {
    const channel = await this.ChannelRepository.findOne({
      where: { id },
      relations: { owner: true }
    })
    if (channel === null) {
      throw new BadRequestException(`Channel #${id} not found`)
    }
    return channel.owner.ftId === userId
  }

  async isAdmin (id: number, userId: number): Promise<boolean> {
    const channel = await this.ChannelRepository.findOne({
      where: { id },
      relations: { admins: true }
    })
    if (channel === null) {
      throw new BadRequestException(`Channel #${id} not found`)
    }
    return channel.admins.findIndex((user) => user.ftId === userId) !== -1
  }

  async isUser (id: number, userId: number): Promise<boolean> {
    const channel = await this.ChannelRepository.findOne({
      where: { id },
      relations: { users: true }
    })
    if (channel === null) {
      throw new BadRequestException(`Channel #${id} not found`)
    }
    return channel.users.findIndex((user) => user.ftId === userId) !== -1
  }

  async isBanned (id: number, userId: number): Promise<boolean> {
    const channel = await this.ChannelRepository.findOne({
      where: { id }
    })
    if (channel === null) {
      throw new BadRequestException(`Channel #${id} not found`)
    }
    return channel.banned.findIndex((ban) => ban[0] === userId) !== -1
  }

  async getMuteDuration (id: number, userId: number): Promise<number> {
    const channel = await this.ChannelRepository.findOne({
      where: { id }
    })
    if (channel === null) {
      throw new BadRequestException(`Channel #${id} not found`)
    }

    const mutation: number[] | undefined = channel.muted.find(
      (mutation) => mutation[0] === userId
    )
    if (mutation == null) return 0
    return mutation[1]
  }
}
