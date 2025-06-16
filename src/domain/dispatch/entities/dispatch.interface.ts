import {
  DispatchPlatform,
  DispatchState,
  DispatchType,
} from 'src/common/enums';

export interface IDispatchKey {
  dispatchKey: string; // partitionKey ENROLLMENT#1,ANNOUNCEMENT#4, SURVEY#2
  targetKey: string; // sortKey  SCHOOL#schoolId#STUDENT#studentId or SCHOOL#schoolId#SAM#samId ex) SCHOOL#1#STUDENT#101, SCHOOL#1#SAM#59
}

export interface IDispatch extends IDispatchKey {
  dispatchId: number;
  targetId: number; // studentId or samId
  type: DispatchType;
  sentAt?: number;
  state?: DispatchState;
  phone: string;
  requestId?: string;
  isRead?: boolean;
  platform: DispatchPlatform;
  createdAt?: number;
  updatedAt?: number;
}
