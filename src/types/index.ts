export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface TaskImage {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface Todo {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface TaskStatus {
  id: string;
  name: string;
  color: string;
  order: number;
  isDefault: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  statusId?: string;
  priority?: string;
  dueDate?: string;
  estimatedHours?: number;
  createdAt: string;
  project: {
    id: string;
    name: string;
    color?: string;
    archived?: boolean;
    team: {
      id: string;
      name: string;
    };
  };
  assignee?: User;
  createdBy?: User;
  subtasks: {
    id: string;
    title: string;
    isCompleted: boolean;
  }[];
  comments: {
    id: string;
    content: string;
    createdAt: string;
    author: {
      id: string;
      name: string;
      avatarUrl?: string;
    };
  }[];
  timeEntries?: {
    id: string;
    hours: number;
    description?: string;
    date: string;
    user: User;
  }[];
  images?: TaskImage[];
  todos?: Todo[];
}
