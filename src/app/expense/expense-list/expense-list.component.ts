import { Component } from '@angular/core';
import { addMonths, set } from 'date-fns';
import { ModalController } from '@ionic/angular';
import { ExpenseModalComponent } from '../expense-modal/expense-modal.component';
import { Category, Expense } from '../../shared/domain';
import { FormBuilder, FormGroup } from '@angular/forms';
import { CategoryService } from '../../category/category.service';
import { ToastService } from '../../shared/service/toast.service';
import { debounce, finalize, interval } from 'rxjs';

@Component({
  selector: 'app-expense-overview',
  templateUrl: './expense-list.component.html',
})
export class ExpenseListComponent {
  categories: Category[] = [];
  date = set(new Date(), { date: 1 });

  constructor(
    private readonly modalCtrl: ModalController,
    private readonly formBuilder: FormBuilder,
    private readonly categoryService: CategoryService,
    private readonly toastService: ToastService,
  ) {}
  ionViewWillEnter(): void {
    this.loadAllCategories();
  }
  addMonths = (number: number): void => {
    this.date = addMonths(this.date, number);
  };
  loading: any;

  async openModal(expense?: Expense): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: ExpenseModalComponent,
      componentProps: { expense: expense ? { ...expense } : {} },
    });
    modal.present();
    const { role } = await modal.onWillDismiss();
    console.log('role', role);
  }
  private loadAllCategories(): void {
    this.categoryService.getAllCategories({ sort: 'name,asc' }).subscribe({
      next: (categories) => (this.categories = categories),
      error: (error) => this.toastService.displayErrorToast('Could not load categories', error),
    });
  }
}
