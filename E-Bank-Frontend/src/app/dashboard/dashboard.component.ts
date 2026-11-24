import { ChangeDetectorRef, Component, effect, inject, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../services/dashboard.service';
import { Router } from '@angular/router';
import { NumberFormatPipe } from '../pipes/number-format.pipe';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  Title,
  Tooltip,
  CategoryScale,
  DoughnutController,
  ArcElement,
  Filler,
} from 'chart.js';
import {AuthService} from "../services/auth.service";
import { AccountService } from '../services/account.service';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, NumberFormatPipe],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  dashboardData: any = {};
  searchTerm: string = '';
  filteredAccounts: any[] = [];
  dashboardChartsInfo: any;
  transactionChart: Chart | null = null;
  bankAccountChart: Chart | null = null;
  private transactionChartLabels: string[] = [];
  private transactionChartData: number[] = [];
  private bankChartLabels: string[] = [];
  private bankChartData: number[] = [];
  private readonly themeService = inject(ThemeService);
  showFilters: boolean = false;
  accountTypes: string[] = ['SavingAccount', 'CurrentAccount'];
  accountStatuses: string[] = ['ACTIVATED', 'SUSPENDED', 'CREATED'];
  balanceRanges = [
    { label: '< $1000', value: 'low' },
    { label: '$1000 - $5000', value: 'medium' },
    { label: '> $5000', value: 'high' }
  ];
  selectedFilters = {
    type: '',
    status: '',
    balanceRange: ''
  };
  userName: string = '';
  currentTime: string = '';
  showNotification: boolean = false;

  constructor(
    private dashboardService: DashboardService,
    private accountService: AccountService,
    private router: Router,
    private authService: AuthService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {
    effect(() => {
      this.themeService.resolvedTheme();
      this.ngZone.run(() => this.refreshChartsForTheme());
    });
  }

  ngOnInit(): void {
    this.loadDashboardData();
    this.getDashboardChartsInfo();

    // Check if user just logged in
    const justLoggedIn = localStorage.getItem('justLoggedIn');
    if (justLoggedIn === 'true') {
      this.showWelcomeNotification();
      // Remove the flag so notification won't show on subsequent visits
      localStorage.removeItem('justLoggedIn');
    }
  }

  loadDashboardData() {
    this.dashboardService.getDashboardInfo().subscribe({
      next: (data) => {
        this.ngZone.run(() => {
          this.dashboardData = this.formatDashboardData(data);
          this.setRecentAccounts(data?.latestBankAccounts);
          if (!this.filteredAccounts.length) {
            this.loadRecentAccountsFallback();
          }
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error("Error fetching dashboard data: ", err);
        this.ngZone.run(() => {
          this.filteredAccounts = [];
          this.loadRecentAccountsFallback();
          this.cdr.detectChanges();
        });
      }
    });
  }

  private setRecentAccounts(accounts: any): void {
    const list = Array.isArray(accounts) ? accounts : [];
    const sorted = [...list].sort((a, b) => {
      const aTime = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
    this.dashboardData = {
      ...this.dashboardData,
      latestBankAccounts: sorted.slice(0, 5)
    };
    this.filteredAccounts = this.dashboardData.latestBankAccounts;
  }

  private loadRecentAccountsFallback(): void {
    this.accountService.getAllAccounts().subscribe({
      next: (accounts) => {
        this.ngZone.run(() => {
          this.setRecentAccounts(accounts);
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('Error fetching accounts fallback: ', err);
        this.ngZone.run(() => {
          this.filteredAccounts = [];
          this.cdr.detectChanges();
        });
      }
    });
  }

  private formatNumber(num: number): string {
    if (num < 10000) {
      return num.toString();
    } else if (num >= 10000 && num < 1000000) {
      return (num / 1000).toFixed(1) + "K";
    } else {
      return (num / 1000000).toFixed(1) + "M";
    }
  }

  private formatDashboardData(data: any): any {
    const formattedData = { ...data };

    // Skip formatting totalBalanceSum to preserve decimal precision
    if (formattedData.monthlyTransactionSum) {
      formattedData.monthlyTransactionSum = this.formatNumber(formattedData.monthlyTransactionSum);
    }
    if (formattedData.totalNumberOfBankAccounts) {
      formattedData.totalNumberOfBankAccounts = this.formatNumber(formattedData.totalNumberOfBankAccounts);
    }
    if (formattedData.totalNumberOfCustomers) {
      formattedData.totalNumberOfCustomers = this.formatNumber(formattedData.totalNumberOfCustomers);
    }

    return formattedData;
  }

  onSearch(): void {
    if (!this.searchTerm) {
      this.filteredAccounts = this.dashboardData.latestBankAccounts || [];
      return;
    }

    const searchTermLower = this.searchTerm.toLowerCase();
    this.filteredAccounts = (this.dashboardData.latestBankAccounts || []).filter((account: any) => {
      return (
        this.accountName(account).toLowerCase().includes(searchTermLower) ||
        (account.type || '').toLowerCase().includes(searchTermLower) ||
        (account.status || '').toLowerCase().includes(searchTermLower) ||
        String(account.balance ?? '').includes(searchTermLower)
      );
    });
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.filteredAccounts = this.dashboardData.latestBankAccounts || [];
  }

  getDashboardChartsInfo(): void {
    this.dashboardService.getDashboardChartsInfo().subscribe({
      next: (data) => {
        this.dashboardChartsInfo = data;

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const volume = data.dailyTransactionVolume || [];
        const types = data.bankAccountsByType || [];
        const chart1Labels = volume.map((item: any) => monthNames[item.month - 1] || String(item.month));
        const chart1Data = volume.map((item: any) => item.volume);

        const chart2Labels = types.map((item: any) => item.type);
        const chart2Data = types.map((item: any) => item.count);

        this.transactionChartLabels = chart1Labels;
        this.transactionChartData = chart1Data;
        this.bankChartLabels = chart2Labels;
        this.bankChartData = chart2Data;

        this.ngZone.run(() => {
          this.createTransactionChart(chart1Labels, chart1Data);
          this.createBankAccountChart(chart2Labels, chart2Data);
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error("Error fetching dashboard chart data: ", err);
      }
    });
  }

  private readCssVar(name: string, fallback: string): string {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  }

  private chartPalette(): { primary: string; secondary: string; warning: string; text: string; grid: string; fill: string } {
    const primary = this.readCssVar('--bs-primary', '#0d6efd');
    const text = this.readCssVar('--bs-body-color', '#212529');
    const grid = this.readCssVar('--bs-border-color', '#dee2e6');
    return {
      primary,
      secondary: this.readCssVar('--bs-success', '#20c997'),
      warning: this.readCssVar('--bs-warning', '#ffc107'),
      text,
      grid,
      fill: this.withAlpha(primary, 0.15),
    };
  }

  private withAlpha(hexColor: string, alpha: number): string {
    if (hexColor.startsWith('rgb')) {
      return hexColor;
    }
    const normalized = hexColor.replace('#', '');
    const full = normalized.length === 3
      ? normalized.split('').map((c) => c + c).join('')
      : normalized;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private refreshChartsForTheme(): void {
    if (!this.transactionChartLabels.length && !this.bankChartLabels.length) {
      return;
    }
    if (this.transactionChart) {
      this.transactionChart.destroy();
      this.transactionChart = null;
    }
    if (this.bankAccountChart) {
      this.bankAccountChart.destroy();
      this.bankAccountChart = null;
    }
    if (this.transactionChartLabels.length) {
      this.createTransactionChart(this.transactionChartLabels, this.transactionChartData);
    }
    if (this.bankChartLabels.length) {
      this.createBankAccountChart(this.bankChartLabels, this.bankChartData);
    }
  }

  createTransactionChart(labels: string[], data: number[]) {
    Chart.register(LineController, LineElement, PointElement, LinearScale, Title, Tooltip, CategoryScale, Filler);

    const colors = this.chartPalette();
    if (this.transactionChart) {
      this.transactionChart.destroy();
    }

    this.transactionChart = new Chart('transactionChart', {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Transaction Volume',
          data: data,
          fill: true,
          borderColor: colors.primary,
          backgroundColor: colors.fill,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Monthly Transaction Volume',
            color: colors.text,
          },
          tooltip: {
            enabled: true
          },
          legend: {
            labels: { color: colors.text },
          },
        },
        scales: {
          x: {
            type: 'category',
            title: {
              display: true,
              text: 'Months',
              color: colors.text,
            },
            ticks: { color: colors.text },
            grid: { color: colors.grid },
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Volume',
              color: colors.text,
            },
            ticks: { color: colors.text },
            grid: { color: colors.grid },
          }
        }
      }
    });
  }

  createBankAccountChart(labels: string[], data: number[]) {
    Chart.register(DoughnutController, ArcElement, Tooltip, Title);

    const colors = this.chartPalette();
    if (this.bankAccountChart) {
      this.bankAccountChart.destroy();
    }

    this.bankAccountChart = new Chart('segmentChart', {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: [colors.primary, colors.secondary, colors.warning]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Bank Accounts',
            color: colors.text,
          },
          tooltip: {
            enabled: true
          },
          legend: {
            labels: { color: colors.text },
          },
        }
      }
    });
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  filterByType(type: string): void {
    this.selectedFilters.type = this.selectedFilters.type === type ? '' : type;
    this.applyFilters();
  }

  filterByStatus(status: string): void {
    this.selectedFilters.status = this.selectedFilters.status === status ? '' : status;
    this.applyFilters();
  }

  filterByBalance(range: string): void {
    this.selectedFilters.balanceRange = this.selectedFilters.balanceRange === range ? '' : range;
    this.applyFilters();
  }

  clearFilters(): void {
    this.selectedFilters = {
      type: '',
      status: '',
      balanceRange: ''
    };
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = this.dashboardData.latestBankAccounts || [];

    if (this.selectedFilters.type) {
      filtered = filtered.filter((account: any) =>
        account.type === this.selectedFilters.type
      );
    }

    if (this.selectedFilters.status) {
      filtered = filtered.filter((account: any) =>
        account.status === this.selectedFilters.status
      );
    }

    if (this.selectedFilters.balanceRange) {
      filtered = filtered.filter((account: any) => {
        const balance = account.balance;
        switch (this.selectedFilters.balanceRange) {
          case 'low':
            return balance < 1000;
          case 'medium':
            return balance >= 1000 && balance <= 5000;
          case 'high':
            return balance > 5000;
          default:
            return true;
        }
      });
    }

    if (this.searchTerm) {
      const searchTermLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter((account: any) => {
        return (
          this.accountName(account).toLowerCase().includes(searchTermLower) ||
          (account.type || '').toLowerCase().includes(searchTermLower) ||
          (account.status || '').toLowerCase().includes(searchTermLower) ||
          String(account.balance ?? '').includes(searchTermLower)
        );
      });
    }

    this.filteredAccounts = filtered;
    this.cdr.detectChanges();
  }

  showWelcomeNotification() {
    // Get username from auth service
    this.userName = this.authService.username || 'User';

    // Set current time greeting
    const hour = new Date().getHours();
    if (hour < 12) {
      this.currentTime = 'Good Morning';
    } else if (hour < 18) {
      this.currentTime = 'Good Afternoon';
    } else {
      this.currentTime = 'Good Evening';
    }

    // Show notification
    this.showNotification = true;

    // Hide notification after 5 seconds
    setTimeout(() => {
      this.showNotification = false;
    }, 5000);
  }

  viewAccountDetails(accountId: string) {
    this.router.navigate(['/admin/accounts'], {
      queryParams: { id: accountId },
      fragment: 'top'
    });
  }

  accountName(account: any): string {
    return account?.customerDTO?.name || account?.customer?.name || 'Customer';
  }
}
