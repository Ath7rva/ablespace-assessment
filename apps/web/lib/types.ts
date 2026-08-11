export type TaskStatus = 'TODO' | 'DOING' | 'COMPLETED' | 'ON_HOLD';

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  assignee: string;
  dueDate: string | null;
  labels: string[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type Workspace = {
  id: string;
  name: string;
  tasks: Task[];
};

export type GuestSession = {
  accessToken: string;
  guestKey: string;
  user: { id: string; displayName: string };
  workspaceId: string;
};

export type TaskInput = {
  title: string;
  description?: string;
  status?: TaskStatus;
  assignee?: string;
  dueDate?: string;
  labels?: string[];
};
