import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TaskStatus } from '@prisma/client';
import { CreateTaskDto } from './dto/create-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { TaskQueryDto } from './dto/task-query.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { PrismaService } from '../prisma.service';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, query: TaskQueryDto) {
    const workspace = await this.workspaceFor(userId);
    const where: Prisma.TaskWhereInput = {
      workspaceId: workspace.id,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? { OR: [{ title: { contains: query.search, mode: 'insensitive' } }, { assignee: { contains: query.search, mode: 'insensitive' } }] }
        : {}),
      ...(query.label ? { labels: { has: query.label } } : {})
    };
    return this.prisma.task.findMany({ where, orderBy: [{ status: 'asc' }, { sortOrder: 'asc' }] });
  }

  async create(userId: string, dto: CreateTaskDto) {
    const workspace = await this.workspaceFor(userId);
    const latest = await this.prisma.task.aggregate({
      where: { workspaceId: workspace.id, status: dto.status ?? TaskStatus.TODO },
      _max: { sortOrder: true }
    });
    return this.prisma.task.create({
      data: {
        workspaceId: workspace.id,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        status: dto.status ?? TaskStatus.TODO,
        assignee: dto.assignee?.trim() || 'Guest user',
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        labels: dto.labels ?? [],
        sortOrder: (latest._max.sortOrder ?? -1) + 1
      }
    });
  }

  async update(userId: string, taskId: string, dto: UpdateTaskDto) {
    const task = await this.taskFor(userId, taskId);
    return this.prisma.task.update({
      where: { id: task.id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.assignee !== undefined ? { assignee: dto.assignee.trim() } : {}),
        ...(dto.dueDate !== undefined ? { dueDate: dto.dueDate ? new Date(dto.dueDate) : null } : {}),
        ...(dto.labels !== undefined ? { labels: dto.labels } : {})
      }
    });
  }

  async move(userId: string, taskId: string, dto: MoveTaskDto) {
    const task = await this.taskFor(userId, taskId);
    return this.prisma.task.update({ where: { id: task.id }, data: { status: dto.status, sortOrder: dto.sortOrder } });
  }

  async remove(userId: string, taskId: string) {
    const task = await this.taskFor(userId, taskId);
    return this.prisma.task.delete({ where: { id: task.id } });
  }

  private async workspaceFor(userId: string) {
    const workspace = await this.prisma.workspace.findFirst({ where: { ownerId: userId } });
    if (!workspace) throw new NotFoundException('Workspace not found');
    return workspace;
  }

  private async taskFor(userId: string, taskId: string) {
    const workspace = await this.workspaceFor(userId);
    const task = await this.prisma.task.findFirst({ where: { id: taskId, workspaceId: workspace.id } });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }
}
