// src/content/commons/en/commonsShell.content.js
// English mirror of the Commons Engine shell copy. Scaffolded for future locale support;
// locale is hardcoded to 'he' in App.jsx today.

export const commonsShellContent = {
  appName: 'Commons',
  nav: {
    myTasks: 'Mine',
    board: 'Board',
    overview: 'Status',
    alerts: 'Alerts',
    menuAriaLabel: 'Commons navigation',
  },
  dashboard: {
    emptyTitle: 'All calm here',
    emptyBody: 'No tasks yet. We will fill this soon.',
  },
  comingSoon: {
    title: 'Coming soon',
    body: 'Still working on it.',
  },
  picker: {
    title: 'Where are we working today?',
    subtitle: 'Pick a workspace to jump in.',
    chooseAria: 'Choose a workspace',
  },
  switcher: {
    title: 'Switch workspace',
    triggerAria: 'Switch workspace',
  },
  tasks: {
    addTask: 'New task',
    addContainer: 'New folder',
    newTaskPlaceholder: 'What needs doing?',
    newContainerPlaceholder: 'Folder name',
    add: 'Add',
    cancel: 'Cancel',
    emptyTitle: 'No tasks yet',
    emptyBody: 'Add the first one below.',
    detailTitle: 'Task details',
    titleLabel: 'Title',
    description: 'Description',
    descriptionPlaceholder: 'Details, notes, links…',
    assignee: 'Owner',
    unassigned: 'Unassigned',
    dueDate: 'Due date',
    noDue: 'No date',
    save: 'Save',
    delete: 'Delete',
    addChildAria: 'Add to folder',
    toggleDoneAria: 'Mark task done',
    expandAria: 'Expand or collapse folder',
    openTaskAria: 'Open task details',
  },
  access: {
    loading: 'One sec, letting you in…',
    noAccessTitle: "Oops, you don't have access here yet",
    noAccessBody: 'This space is for team members only. Ask an admin to add you.',
    backToSite: 'Back to site',
  },
};
