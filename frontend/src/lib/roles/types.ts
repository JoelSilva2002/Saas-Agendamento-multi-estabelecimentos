export type Role = {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: string[];
};
