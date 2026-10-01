export enum RIDER_ROLES {
  RIDER= 0,
  DRIVER= 1,
}

export type ProcessEnvironment = {
  [key: string]: string | undefined;
}