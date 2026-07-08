import { SingleData } from './domain/single-data.entity';

export interface ListSingleDataResult {
  items: SingleData[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}
