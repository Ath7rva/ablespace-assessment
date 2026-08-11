import { AuthService } from './auth.service';

describe('AuthService', () => {
  const prisma = {
    user: { upsert: jest.fn() },
    workspace: { findFirst: jest.fn(), create: jest.fn() }
  };
  const jwtService = { signAsync: jest.fn() };
  const service = new AuthService(prisma as never, jwtService as never);

  beforeEach(() => jest.clearAllMocks());

  it('creates a seeded workspace and returns a guest session', async () => {
    prisma.user.upsert.mockResolvedValue({ id: 'user-1', displayName: 'Atharva' });
    prisma.workspace.findFirst.mockResolvedValue(null);
    prisma.workspace.create.mockResolvedValue({ id: 'workspace-1' });
    jwtService.signAsync.mockResolvedValue('guest-jwt');

    await expect(
      service.signInAsGuest({ guestKey: 'c6ffb75d-a990-47d9-af68-f4cfbc4f91ed', displayName: 'Atharva' })
    ).resolves.toEqual({
      accessToken: 'guest-jwt',
      guestKey: 'c6ffb75d-a990-47d9-af68-f4cfbc4f91ed',
      user: { id: 'user-1', displayName: 'Atharva' },
      workspaceId: 'workspace-1'
    });

    expect(prisma.workspace.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ownerId: 'user-1',
          tasks: expect.objectContaining({ create: expect.arrayContaining([expect.objectContaining({ title: 'Write API Documentation' })]) })
        })
      })
    );
    expect(jwtService.signAsync).toHaveBeenCalledWith({ sub: 'user-1', workspaceId: 'workspace-1' });
  });

  it('restores an existing guest workspace without reseeding it', async () => {
    prisma.user.upsert.mockResolvedValue({ id: 'user-1', displayName: 'Guest user' });
    prisma.workspace.findFirst.mockResolvedValue({ id: 'workspace-1' });
    jwtService.signAsync.mockResolvedValue('guest-jwt');

    await service.signInAsGuest({ guestKey: 'c6ffb75d-a990-47d9-af68-f4cfbc4f91ed' });

    expect(prisma.workspace.create).not.toHaveBeenCalled();
    expect(jwtService.signAsync).toHaveBeenCalledWith({ sub: 'user-1', workspaceId: 'workspace-1' });
  });
});
