import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AccountsService } from '../services/accounts.service';
import { BehaviorSubject } from 'rxjs';
import { AccountDetails } from '../model/account.model';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './accounts.component.html',
  styleUrls: ['./accounts.component.css']
})
export class AccountsComponent implements OnInit {
  accountFormGroup! : FormGroup;
  currentPage: number = 0;
  pageSize: number = 100;
  operationFromGroup! : FormGroup;
  errorMessage! :string ;
  isInitialState: boolean = true;
  isLoading: boolean = false;
  searchTerm: string = '';
  selectedFilter: string = 'all';
  private accountDetailsSubject = new BehaviorSubject<AccountDetails | null>(null);
  accountDetails$ = this.accountDetailsSubject.asObservable();
  accountId: string = '';
  notification: { type: 'success' | 'error', message: string } | null = null;
  showDeleteModal: boolean = false;
  selectedOperation: any = null;

  constructor(
    private fb: FormBuilder,
    private accountService: AccountsService,
    private route: ActivatedRoute,
    public authService: AuthService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.accountFormGroup = this.fb.group({
      accountId : this.fb.control(null)
    });
    this.operationFromGroup = this.fb.group({
      operationType : this.fb.control(null),
      amount : this.fb.control(null),
      description : this.fb.control(null),
      destinationAccountId : this.fb.control(null)
    });

    // Handle query params for direct account loading
    this.route.queryParams.subscribe(params => {
      if (params['id']) {
        this.accountFormGroup.patchValue({ accountId: params['id'] });
        this.handleSearchAccount();
      }
    });
  }

  private loadAccountData(page: number = 0) {
    if (!this.accountId) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.accountService.getAccount(this.accountId, page, this.pageSize)
      .subscribe({
        next: (data) => {
          this.ngZone.run(() => {
            this.accountDetailsSubject.next(data);
            this.isInitialState = false;
            this.currentPage = page;
            this.isLoading = false;
            this.errorMessage = '';
            this.cdr.detectChanges();
          });
        },
        error: (err) => {
          this.ngZone.run(() => {
            this.errorMessage = this.errorText(err);
            this.accountDetailsSubject.next(null);
            this.isInitialState = false;
            this.isLoading = false;
            this.cdr.detectChanges();
          });
        }
      });
  }

  handleSearchAccount() {
    this.accountId = this.accountFormGroup.value.accountId;
    this.errorMessage = '';
    window.scrollTo(0, 0);
    this.loadAccountData();
  }

  gotoPage(page: number) {
    this.loadAccountData(page);
  }

  private scrollToTransactions() {
    setTimeout(() => {
      const element = document.getElementById('transactionsTable');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }

  handleAccountOperation() {
    const accountId : string = this.accountFormGroup.value.accountId;
    const operationType = this.operationFromGroup.value.operationType;
    const amount = this.operationFromGroup.value.amount;
    const description = this.operationFromGroup.value.description;
    const destinationAccountId = this.operationFromGroup.value.destinationAccountId;

    if (!operationType || !amount) {
      this.showNotification('error', 'Please fill in all required fields');
      return;
    }

    if (operationType === 'TRANSFER' && !destinationAccountId) {
      this.showNotification('error', 'Please enter a destination account ID');
      return;
    }

    if(operationType === 'DEBIT') {
      this.accountService.debit(accountId, amount, description).subscribe({
        next : ()=>{
          this.finishOperation('Debit operation completed successfully');
        },
        error : err => {
          this.showNotification('error', this.errorText(err));
        }
      });
    } else if(operationType === 'CREDIT') {
      this.accountService.credit(accountId, amount, description).subscribe({
        next : ()=>{
          this.finishOperation('Credit operation completed successfully');
        },
        error : err => {
          this.showNotification('error', this.errorText(err));
        }
      });
    } else if(operationType === 'TRANSFER') {
      this.accountService.transfer(accountId, destinationAccountId, amount, description).subscribe({
        next : ()=>{
          this.finishOperation('Transfer completed successfully');
        },
        error : err => {
          this.showNotification('error', this.errorText(err));
        }
      });
    }
  }

  private finishOperation(message: string) {
    this.loadAccountData();
    this.operationFromGroup.reset();
    this.operationFromGroup.patchValue({ operationType: null });
    this.showNotification('success', message);
    this.scrollToTransactions();
  }

  private errorText(err: any): string {
    return err?.error?.message || err?.message || 'Operation failed';
  }

  showNotification(type: 'success' | 'error', message: string) {
    this.notification = { type, message };
    setTimeout(() => this.clearNotification(), 5000);
  }

  clearNotification() {
    this.notification = null;
  }

  resetSearch() {
    this.accountFormGroup.reset();
    this.operationFromGroup.reset();
    this.accountDetailsSubject.next(null);
    this.errorMessage = '';
    this.isInitialState = true;
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      // You could add a toast notification here if you want
      console.log('Copied to clipboard');
    });
  }

  filterOperations(filter: string) {
    this.selectedFilter = filter;
    // The actual filtering will be done in the template using a pipe
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedFilter = 'all';
  }

  get filteredOperations() {
    if (!this.accountDetailsSubject.value?.accountOperationDTOS) return [];

    let operations = [...this.accountDetailsSubject.value.accountOperationDTOS];

    // Apply search filter first
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      operations = operations.filter(op =>
        op.description?.toLowerCase().includes(term) ||
        op.type?.toLowerCase().includes(term) ||
        op.id?.toString().includes(term) ||
        op.amount?.toString().includes(term)
      );
    }

    // Sort all operations by ID in descending order (most recent first)
    operations.sort((a, b) => b.id - a.id);

    // Apply type filter if not "all" or "recent"
    if (this.selectedFilter !== 'all' && this.selectedFilter !== 'recent') {
      operations = operations.filter(op =>
        op.type?.toLowerCase() === this.selectedFilter
      );
    }

    return operations;
  }

  selectOperationType(type: string) {
    this.operationFromGroup.patchValue({ operationType: type });
  }

}
