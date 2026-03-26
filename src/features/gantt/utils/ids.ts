const randomToken = (): string => Math.random().toString(36).slice(2, 10);

export const createTaskId = (): string => `t-${randomToken()}`;
export const createSubtaskId = (): string => `s-${randomToken()}`;
export const createMarkerId = (): string => `m-${randomToken()}`;
export const createTimelineTabId = (): string => `tab-${randomToken()}`;
