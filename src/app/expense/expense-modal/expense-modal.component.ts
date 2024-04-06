import { Component } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';
import { filter, finalize, from, mergeMap, tap } from 'rxjs';
import { CategoryModalComponent } from '../../category/category-modal/category-modal.component';
import { ActionSheetService } from '../../shared/service/action-sheet.service';
import { Category, Expense } from '../../shared/domain';
import { CategoryService } from '../../category/category.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastService } from '../../shared/service/toast.service';
import { save } from 'ionicons/icons';
import { ExpenseService } from '../expense.service';
import { formatISO, parseISO } from 'date-fns';

@Component({
  selector: 'app-expense-modal',
  templateUrl: './expense-modal.component.html',
})
export class ExpenseModalComponent {
  readonly expenseForm: FormGroup;
  submitting = false;
  // Passed into the component by the ModalController, available in the ionViewWillEnter
  expense: Expense = {} as Expense;
  categories: Category[] = [];

  constructor(
    private readonly actionSheetService: ActionSheetService,
    private readonly modalCtrl: ModalController,
    private readonly categoryService: CategoryService,
    private readonly formBuilder: FormBuilder,
    private readonly toastService: ToastService,
    private readonly expenseService: ExpenseService,
  ) {
    this.expenseForm = this.formBuilder.group({
      id: [], // hidden
      categoryId: [],
      amount: [],
      date: [formatISO(new Date())],
      name: ['', [Validators.required, Validators.maxLength(40)]],
    });
  }

  cancel(): void {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  ionViewWillEnter(): void {
    this.expenseForm.patchValue(this.expense);
    this.loadAllCategories();
  }
  save(): void {
    this.submitting = true;
    console.log(this.expenseForm.value);
    const expenseData = {
      ...this.expenseForm.value,
      date: formatISO(parseISO(this.expenseForm.value.date), { representation: 'date' }),
    };

    this.expenseService
      .upsertExpense(expenseData)
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: () => {
          this.toastService.displaySuccessToast('Expense saved');
          this.modalCtrl.dismiss(null, 'refresh');
        },
        error: (error) => this.toastService.displayErrorToast('Could not save expense', error),
      });
  }

  delete(): void {
    from(this.actionSheetService.showDeletionConfirmation('Are you sure you want to delete this expense?'))
      .pipe(
        filter((action) => action === 'delete'),
        tap(() => (this.submitting = true)),
        mergeMap(() => this.expenseService.deleteExpense(this.expense.id!)),
        finalize(() => (this.submitting = false)),
      )
      .subscribe({
        next: () => {
          this.toastService.displaySuccessToast('Expense deleted');
          this.modalCtrl.dismiss(null, 'refresh');
        },
        error: (error) => this.toastService.displayErrorToast('Could not delete expense', error),
      });
  }

  async showCategoryModal(): Promise<void> {
    const categoryModal = await this.modalCtrl.create({ component: CategoryModalComponent });
    await categoryModal.present();
    const { role } = await categoryModal.onWillDismiss();
    console.log('role', role);
  }
  private loadAllCategories(): void {
    this.categoryService.getAllCategories({ sort: 'name,asc' }).subscribe({
      next: (categories) => (this.categories = categories),
      error: (error) => this.toastService.displayErrorToast('Could not load categories', error),
    });
  }
}
