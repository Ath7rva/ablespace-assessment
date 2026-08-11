import { TaskStatus } from '@prisma/client';
import { IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class MoveTaskDto {
  @IsEnum(TaskStatus)
  status!: TaskStatus;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder!: number;
}
