import { SingleDataType } from './single-data-type.enum';

export class SingleData {
  id: number;
  title: string;
  description: string;
  amount: number;
  type: SingleDataType;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
}
