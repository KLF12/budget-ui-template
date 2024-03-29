import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Expense, ExpenseUpsertDto, ExpenseCriteria, Page } from '../../shared/domain';
import { AllCategoryCriteria, Category, CategoryCriteria } from '../../shared/domain';
import { environment } from '../../../environments/environment';

class expenseForm {}

@Injectable({ providedIn: 'root' })
export class ExpenseService {
  private readonly apiUrl = `${environment.backendUrl}/expenses`;
  private readonly apiV2Url = `${environment.backendUrl}/v2/expenses`;

  constructor(private readonly httpClient: HttpClient) {}

  // Read

  getExpenses = (pagingCriteria: ExpenseCriteria): Observable<Page<Expense>> =>
    this.httpClient.get<Page<Expense>>(this.apiUrl, { params: new HttpParams({ fromObject: { ...pagingCriteria } }) });

  // Create & Update

  upsertExpense = (Expense: expenseForm): Observable<void> => this.httpClient.put<void>(this.apiUrl, Expense);

  // Delete

  deleteExpense = (id: string): Observable<void> => this.httpClient.delete<void>(`${this.apiUrl}/${id}`);
}
