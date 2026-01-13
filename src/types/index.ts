export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export interface TaskImage {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface TaskAttachment {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  mimeType: string;
  size: number;
  description?: string;
  category?: string;
  createdAt: string;
  uploadedBy: User;
}

export interface Todo {
  id: string;
  title: string;
  isCompleted: boolean;
  timeSpent?: number; // Time spent in hours
}

export interface TaskStatus {
  id: string;
  name: string;
  color: string;
  order: number;
  isDefault: boolean;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status?: string;
  color?: string;
  icon?: string;
  imageUrl?: string;
  repositoryUrl?: string;
  databaseUrl?: string;
  serverUrl?: string;
  apiUrl?: string;
  adminPanelUrl?: string;
  stagingUrl?: string;
  productionUrl?: string;
  credentials?: string;
  archived?: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdById?: string;
  createdBy?: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl?: string | null;
  };
  members?: {
    id: string;
    role: string;
    user: {
      id: string;
      name: string | null;
      email: string;
      avatarUrl?: string | null;
    };
  }[];
  tasks?: Task[]; // Revert to full Task interface here
}


export interface Task {
  id: string;
  title: string;
  description?: string;
  statusId?: string;
  priority?: string;
  dueDate?: string;
  startTime?: string;
  endTime?: string;
  estimatedHours?: number;
  createdAt: string;
  // Pola przypomnienia
  reminderEnabled?: boolean;
  reminderTime?: string;
  reminderType?: string;
  reminderValue?: number;
  project: {
    id: string;
    name: string;
    color?: string;
    archived?: boolean;
  };
  assignee?: User;
  createdBy?: User;
  taskStatus?: TaskStatus;
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
  attachments?: TaskAttachment[];
  todos?: Todo[];
  tags?: Tag[];
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface TaskUpdateData extends Partial<Task> {
  assigneeId?: string;
  statusId?: string;
  projectId?: string;
}
