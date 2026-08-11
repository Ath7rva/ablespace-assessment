import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma.service';
import { GuestLoginDto } from './dto/guest-login.dto';

const seedTasks = [
  { title: 'Write API Documentation', status: 'TODO', assignee: 'Admin', labels: ['Deployment'], dueDate: '2026-07-29T00:00:00.000Z', sortOrder: 0 },
  { title: 'Implement Search Function', status: 'TODO', assignee: 'Admin', labels: ['Development'], dueDate: '2026-07-29T00:00:00.000Z', sortOrder: 1 },
  { title: 'Deploy to Production', status: 'TODO', assignee: 'Admin', labels: ['Deployment'], dueDate: '2026-07-29T00:00:00.000Z', sortOrder: 2 },
  { title: 'Code Review Completed', status: 'DOING', assignee: 'Deployment', labels: ['Deployment'], dueDate: '2026-07-29T00:00:00.000Z', sortOrder: 0 },
  { title: 'Design Mockups Finalized', status: 'DOING', assignee: 'Designer', labels: ['Design', 'Updated'], dueDate: '2026-07-30T00:00:00.000Z', sortOrder: 1 },
  { title: 'Feature Testing Passed', status: 'COMPLETED', assignee: 'QA Team', labels: ['Testing'], dueDate: '2026-07-30T00:00:00.000Z', sortOrder: 0 },
  { title: 'UI Design Updated', status: 'COMPLETED', assignee: 'Designer', labels: ['Design', 'Updated'], dueDate: '2026-07-31T00:00:00.000Z', sortOrder: 1 },
  { title: 'Security Audit Scheduled', status: 'COMPLETED', assignee: 'Security', labels: ['Audit', 'Scheduled'], dueDate: '2026-08-01T00:00:00.000Z', sortOrder: 2 },
  { title: 'UI Review', status: 'ON_HOLD', assignee: 'Designer', labels: ['Review'], dueDate: '2026-08-02T00:00:00.000Z', sortOrder: 0 },
  { title: 'Backend Integration', status: 'ON_HOLD', assignee: 'Developer', labels: ['Development'], dueDate: '2026-08-02T00:00:00.000Z', sortOrder: 1 }
] as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async signInAsGuest(dto: GuestLoginDto) {
    const guestKey = dto.guestKey ?? randomUUID();
    const displayName = dto.displayName?.trim() || 'Guest user';
    const user = await this.prisma.user.upsert({
      where: { guestKey },
      update: { displayName },
      create: { guestKey, displayName }
    });

    let workspace = await this.prisma.workspace.findFirst({ where: { ownerId: user.id } });
    if (!workspace) {
      workspace = await this.prisma.workspace.create({
        data: {
          name: 'Dexter workspace',
          ownerId: user.id,
          tasks: {
            create: seedTasks.map((task) => ({
              ...task,
              status: task.status as 'TODO' | 'DOING' | 'COMPLETED' | 'ON_HOLD',
              labels: [...task.labels],
              dueDate: new Date(task.dueDate)
            }))
          }
        }
      });
    }

    return {
      accessToken: await this.jwtService.signAsync({ sub: user.id, workspaceId: workspace.id }),
      guestKey,
      user: { id: user.id, displayName: user.displayName },
      workspaceId: workspace.id
    };
  }
}
