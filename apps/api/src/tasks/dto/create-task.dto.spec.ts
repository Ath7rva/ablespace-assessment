import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateTaskDto } from './create-task.dto';

describe('CreateTaskDto', () => {
  it('accepts a valid task payload', async () => {
    const dto = plainToInstance(CreateTaskDto, {
      title: 'Prepare deployment checklist',
      dueDate: '2026-08-15T12:00:00.000Z',
      labels: ['Deployment']
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects a one-character title and more than six labels', async () => {
    const dto = plainToInstance(CreateTaskDto, {
      title: 'A',
      labels: ['a', 'b', 'c', 'd', 'e', 'f', 'g']
    });

    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(expect.arrayContaining(['title', 'labels']));
  });
});
