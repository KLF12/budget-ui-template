import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { addMonths, set } from 'date-fns';
import { InfiniteScrollCustomEvent, RefresherCustomEvent } from '@ionic/angular';
import { ExpenseModalComponent } from '../expense-modal/expense-modal.component';
import { Category, Expense, ExpenseCriteria, SortOption } from '../../shared/domain';
import { FormBuilder, FormGroup } from '@angular/forms';
import { CategoryService } from '../../category/category.service';
import { ToastService } from '../../shared/service/toast.service';
import { debounce, finalize, from, groupBy, interval, mergeMap, Subscription, toArray } from 'rxjs';
import { formatPeriod } from '../../shared/period';
import { ExpenseService } from '../expense.service';

interface ExpenseGroup {
  date: string;
  expenses: Expense[];
}

@Component({
  selector: 'app-expense-overview',
  templateUrl: './expense-list.component.html',
})
export class ExpenseListComponent {
  expenseGroups: ExpenseGroup[] | null = null;
  readonly initialSort = 'date,desc';
  lastPageReached = false;
  loading = false;
  searchCriteria: ExpenseCriteria = { page: 0, size: 25, sort: this.initialSort };
  date = set(new Date(), { date: 1 });
  categories: Category[] = [];
  selectedExpense: Expense | null = null;
  readonly searchForm: FormGroup;
  readonly sortOptions: SortOption[] = [
    { label: 'Created at (newest first)', value: 'createdAt,desc' },
    { label: 'Created at (oldest first)', value: 'createdAt,asc' },
    { label: 'Date (newest first)', value: 'date,desc' },
    { label: 'Date (oldest first)', value: 'date,asc' },
    { label: 'Name (A-Z)', value: 'name,asc' },
    { label: 'Name (Z-A)', value: 'name,desc' },
  ];
  private readonly searchFormSubscription: Subscription;

  constructor(
    private readonly modalCtrl: ModalController,
    private modalController: ModalController,
    private readonly formBuilder: FormBuilder,
    private readonly categoryService: CategoryService,
    private readonly toastService: ToastService,
    private readonly expenseService: ExpenseService,
  ) {
    this.searchForm = this.formBuilder.group({ name: [], sort: [this.initialSort], category: [[]] });
    this.searchFormSubscription = this.searchForm.valueChanges
      .pipe(debounce((value) => interval(value.name?.length ? 400 : 0)))
      .subscribe((value) => {
        this.searchCriteria = { ...this.searchCriteria, ...value, page: 0 };
        this.loadAllCategories();
        this.reloadExpenses();
      });
    this.searchForm.get('category')?.valueChanges.subscribe((selectedCategories: string[]) => {
      this.searchCriteria.categoryIds = selectedCategories;
      this.reloadExpenses();
    });
    this.searchForm.get('name')?.valueChanges.subscribe((searchText: string) => {
      this.searchCriteria.name = searchText;
      this.reloadExpenses();
    });
  }

  ionViewWillEnter(): void {
    this.loadExpenses();
    this.loadAllCategories();
  }

  loadNextExpensePage($event: any) {
    this.searchCriteria.page++;
    this.loadExpenses(() => ($event as InfiniteScrollCustomEvent).target.complete());
  }

  reloadExpenses($event?: any): void {
    this.searchCriteria.page = 0;
    this.loadExpenses(() => ($event ? ($event as RefresherCustomEvent).target.complete() : {}));
  }

  ionViewDidLeave(): void {
    this.searchFormSubscription.unsubscribe();
  }

  addMonths = (number: number): void => {
    this.date = addMonths(this.date, number);
    this.reloadExpenses();
  };

  async openModal() {
    const modal = await this.modalController.create({
      component: ExpenseModalComponent,
      componentProps: {},
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data === 'refresh') {
      this.loadExpenses();
    }
    this.reloadExpenses();
  }
  async openExpenseModal(expense: Expense) {
    if (expense) {
      const modal = await this.modalController.create({
        component: ExpenseModalComponent,
        componentProps: { expense },
      });
      await modal.present();
      const { data } = await modal.onWillDismiss();
      if (data === 'refresh') {
        this.loadExpenses();
      }
    }
    this.reloadExpenses();
  }
  private loadAllCategories(): void {
    this.categoryService.getAllCategories({ sort: 'name,asc' }).subscribe({
      next: (categories) => (this.categories = categories),
      error: (error) => this.toastService.displayErrorToast('Could not load categories', error),
    });
  }

  private loadExpenses(next: () => void = () => {}): void {
    this.searchCriteria.yearMonth = formatPeriod(this.date);
    if (!this.searchCriteria.categoryIds?.length) delete this.searchCriteria.categoryIds;
    if (!this.searchCriteria.name) delete this.searchCriteria.name;
    this.searchCriteria.sort = this.searchForm.get('sort')?.value;
    this.loading = true;
    const groupByDate = this.searchCriteria.sort.startsWith('date');
    this.expenseService
      .getExpenses(this.searchCriteria)
      .pipe(
        finalize(() => (this.loading = false)),
        mergeMap((expensePage) => {
          this.lastPageReached = expensePage.last;
          next();
          if (this.searchCriteria.page === 0 || !this.expenseGroups) this.expenseGroups = [];
          return from(expensePage.content).pipe(
            groupBy((expense) => (groupByDate ? expense.date : expense.id)),
            mergeMap((group) => group.pipe(toArray())),
          );
        }),
      )
      .subscribe({
        next: (expenses: Expense[]) => {
          const expenseGroup: ExpenseGroup = {
            date: expenses[0].date,
            expenses: this.sortExpenses(expenses),
          };
          const expenseGroupWithSameDate = this.expenseGroups!.find((other) => other.date === expenseGroup.date);
          if (!expenseGroupWithSameDate || !groupByDate) this.expenseGroups!.push(expenseGroup);
          else
            expenseGroupWithSameDate.expenses = this.sortExpenses([
              ...expenseGroupWithSameDate.expenses,
              ...expenseGroup.expenses,
            ]);
        },
        error: (error) => this.toastService.displayErrorToast('Could not load expenses', error),
      });
  }

  private sortExpenses = (expenses: Expense[]): Expense[] => expenses.sort((a, b) => a.name.localeCompare(b.name));
}
