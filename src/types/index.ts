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

export interface Subtask {
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

export interface Client {
  id: string;
  name: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  taxId?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  createdById?: string;
  createdBy?: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl?: string | null;
  };
  projects?: { id: string; name: string; color?: string; archived?: boolean }[];
  _count?: { projects: number };
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status?: string;
  clientId?: string | null;
  client?: {
    id: string;
    name: string;
  } | null;
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
  slackChannelId?: string;
  githubRepo?: string | null;
  archived?: boolean;
  sortOrder?: number;
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
  key?: string;
  title: string;
  description?: string;
  changes?: string;
  changesSentAt?: string | null;
  changesSlackTs?: string | null;
  changesScheduledSendAt?: string | null;
  autoMoveToDoneAt?: string | null;
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
    githubRepo?: string | null;
  };
  assignee?: User;
  createdBy?: User;
  taskStatus?: TaskStatus;
  subtasks: Subtask[];
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
  todos?: Subtask[];
  tags?: Tag[];
  githubBranchName?: string | null;
  githubWorkflowError?: string | null;
  archived?: boolean;
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
