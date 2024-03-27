import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Expense, ExpenseUpsertDto, ExpenseCriteria, Page } from '../../shared/domain';
import { AllCategoryCriteria, Category, CategoryCriteria } from '../../shared/domain';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ExpenseService {
  private readonly apiUrl = `${environment.backendUrl}/categories`;
  private readonly apiV2Url = `${environment.backendUrl}/v2/categories`;

  constructor(private readonly httpClient: HttpClient) {}

  // Read

  getExpenses = (pagingCriteria: CategoryCriteria): Observable<Page<Category>> =>
    this.httpClient.get<Page<Category>>(this.apiUrl, { params: new HttpParams({ fromObject: { ...pagingCriteria } }) });

  // Create & Update

  upsertExpense = (category: Category): Observable<void> => this.httpClient.put<void>(this.apiUrl, category);

  // Delete

  deleteExpense = (id: string): Observable<void> => this.httpClient.delete<void>(`${this.apiUrl}/${id}`);
}
