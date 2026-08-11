import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  async current(userId: string) {
    const workspace = await this.prisma.workspace.findFirst({
      where: { ownerId: userId },
      include: { tasks: { orderBy: [{ status: 'asc' }, { sortOrder: 'asc' }] } }
    });
    if (!workspace) throw new NotFoundException('Guest workspace not found');
    return workspace;
  }
}
