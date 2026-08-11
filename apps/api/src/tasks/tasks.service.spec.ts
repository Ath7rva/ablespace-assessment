import { NotFoundException } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  const prisma = {
    workspace: { findFirst: jest.fn() },
    task: { aggregate: jest.fn(), create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn(), delete: jest.fn() }
  };
  const service = new TasksService(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it('adds a task at the end of its requested column', async () => {
    prisma.workspace.findFirst.mockResolvedValue({ id: 'workspace-1' });
    prisma.task.aggregate.mockResolvedValue({ _max: { sortOrder: 2 } });
    prisma.task.create.mockResolvedValue({ id: 'task-1', title: 'Draft release notes' });

    await expect(
      service.create('user-1', { title: 'Draft release notes', status: TaskStatus.DOING, labels: ['Development'] })
    ).resolves.toEqual({ id: 'task-1', title: 'Draft release notes' });

    expect(prisma.task.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ workspaceId: 'workspace-1', sortOrder: 3, status: TaskStatus.DOING }) })
    );
  });

  it('scopes search and status filters to the current workspace', async () => {
    prisma.workspace.findFirst.mockResolvedValue({ id: 'workspace-1' });
    prisma.task.findMany.mockResolvedValue([]);

    await service.list('user-1', { status: TaskStatus.DOING, search: 'api', label: 'Development' });

    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          workspaceId: 'workspace-1',
          status: TaskStatus.DOING,
          labels: { has: 'Development' },
          OR: [
            { title: { contains: 'api', mode: 'insensitive' } },
            { assignee: { contains: 'api', mode: 'insensitive' } }
          ]
        })
      })
    );
  });

  it('updates and moves only a task inside the current workspace', async () => {
    prisma.workspace.findFirst.mockResolvedValue({ id: 'workspace-1' });
    prisma.task.findFirst.mockResolvedValue({ id: 'task-1', workspaceId: 'workspace-1' });
    prisma.task.update.mockResolvedValue({ id: 'task-1' });

    await service.update('user-1', 'task-1', { title: '  Updated task  ', assignee: '  Atharva  ' });
    await service.move('user-1', 'task-1', { status: TaskStatus.COMPLETED, sortOrder: 1 });

    expect(prisma.task.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ data: expect.objectContaining({ title: 'Updated task', assignee: 'Atharva' }) })
    );
    expect(prisma.task.update).toHaveBeenNthCalledWith(
      2,
      { where: { id: 'task-1' }, data: { status: TaskStatus.COMPLETED, sortOrder: 1 } }
    );
  });

  it('deletes a task only after ownership is confirmed', async () => {
    prisma.workspace.findFirst.mockResolvedValue({ id: 'workspace-1' });
    prisma.task.findFirst.mockResolvedValue({ id: 'task-1', workspaceId: 'workspace-1' });
    prisma.task.delete.mockResolvedValue({ id: 'task-1' });

    await expect(service.remove('user-1', 'task-1')).resolves.toEqual({ id: 'task-1' });
    expect(prisma.task.delete).toHaveBeenCalledWith({ where: { id: 'task-1' } });
  });

  it('rejects an update for a task outside the current workspace', async () => {
    prisma.workspace.findFirst.mockResolvedValue({ id: 'workspace-1' });
    prisma.task.findFirst.mockResolvedValue(null);

    await expect(service.update('user-1', 'other-workspace-task', { title: 'No access' })).rejects.toBeInstanceOf(NotFoundException);
  });
});
