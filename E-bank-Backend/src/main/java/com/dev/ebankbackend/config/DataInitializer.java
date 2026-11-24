package com.dev.ebankbackend.config;

import com.dev.ebankbackend.entities.AccountOperation;
import com.dev.ebankbackend.entities.BankAccount;
import com.dev.ebankbackend.entities.CurrentAccount;
import com.dev.ebankbackend.entities.Customer;
import com.dev.ebankbackend.entities.SavingAccount;
import com.dev.ebankbackend.enums.AccountStatus;
import com.dev.ebankbackend.enums.OperationType;
import com.dev.ebankbackend.enums.UserRole;
import com.dev.ebankbackend.repositories.AccountOperationRepository;
import com.dev.ebankbackend.repositories.BankAccountRepository;
import com.dev.ebankbackend.repositories.CustomerRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Date;
import java.util.List;
import java.util.UUID;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final List<DemoProfile> DEMO_USERS = List.of(
            new DemoProfile("hamza", 18500, 42000, 2500, 3.2, AccountStatus.ACTIVATED),
            new DemoProfile("ayman", 9200, 15750, 1500, 3.8, AccountStatus.ACTIVATED),
            new DemoProfile("ismail", 4100, 8800, 800, 2.9, AccountStatus.SUSPENDED),
            new DemoProfile("mohamed", 27650, 61000, 4000, 4.1, AccountStatus.ACTIVATED)
    );

    private static final String[] CREDIT_DESCRIPTIONS = {
            "Salary deposit", "Client transfer", "Interest payout", "Refund"
    };
    private static final String[] DEBIT_DESCRIPTIONS = {
            "ATM withdrawal", "Card payment", "Utility bill", "Rent"
    };
    private static final double[] MONTHLY_VOLUME = {
            12500, 14800, 13200, 17600, 22100, 19850, 25400, 23900, 28100, 26450, 31200, 29750
    };

    private final CustomerRepository customerRepository;
    private final BankAccountRepository bankAccountRepository;
    private final AccountOperationRepository accountOperationRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(CustomerRepository customerRepository,
                           BankAccountRepository bankAccountRepository,
                           AccountOperationRepository accountOperationRepository,
                           PasswordEncoder passwordEncoder) {
        this.customerRepository = customerRepository;
        this.bankAccountRepository = bankAccountRepository;
        this.accountOperationRepository = accountOperationRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        DEMO_USERS.forEach(this::ensureDemoProfile);
    }

    private void ensureDemoProfile(DemoProfile profile) {
        String email = profile.name() + "@example.com";
        Customer customer = customerRepository.findByEmailIgnoreCase(email)
                .orElseGet(() -> createCustomer(profile.name(), email));

        List<BankAccount> accounts = bankAccountRepository.findByCustomer_Id(customer.getId());
        if (accounts.isEmpty()) {
            CurrentAccount current = new CurrentAccount();
            current.setId(UUID.randomUUID().toString());
            current.setBalance(profile.currentBalance());
            current.setCreatedAt(toDate(LocalDate.now().minusDays(40)));
            current.setStatus(AccountStatus.ACTIVATED);
            current.setCustomer(customer);
            current.setOverDraft(profile.overDraft());
            bankAccountRepository.save(current);

            SavingAccount saving = new SavingAccount();
            saving.setId(UUID.randomUUID().toString());
            saving.setBalance(profile.savingBalance());
            saving.setCreatedAt(toDate(LocalDate.now().minusDays(18)));
            saving.setStatus(profile.savingStatus());
            saving.setCustomer(customer);
            saving.setInterestRate(profile.interestRate());
            bankAccountRepository.save(saving);

            accounts = List.of(current, saving);
        }

        int year = LocalDate.now().getYear();
        for (BankAccount account : accounts) {
            if (accountOperationRepository.countByAccountIdAndYear(account.getId(), year) == 0) {
                seedYearOperations(account, profile.name());
            }
        }
    }

    private Customer createCustomer(String name, String email) {
        Customer customer = new Customer();
        customer.setName(name);
        customer.setEmail(email);
        customer.setRole(UserRole.ADMIN);
        customer.setPassword(passwordEncoder.encode(name + "123"));
        return customerRepository.save(customer);
    }

    private void seedYearOperations(BankAccount account, String owner) {
        LocalDate today = LocalDate.now();
        double balance = account.getBalance();
        int seed = Math.abs(owner.hashCode() + account.getId().hashCode());

        for (int month = 1; month <= today.getMonthValue(); month++) {
            double monthVolume = MONTHLY_VOLUME[month - 1] * (0.35 + (seed % 7) * 0.08);
            int opsThisMonth = 3;
            for (int i = 0; i < opsThisMonth; i++) {
                boolean credit = i != 1;
                double amount = round(monthVolume / opsThisMonth * (credit ? 1.15 : 0.55));
                int day = Math.min(4 + i * 8 + (seed % 5), month == today.getMonthValue()
                        ? Math.max(1, today.getDayOfMonth())
                        : 28);
                LocalDate opDate = LocalDate.of(today.getYear(), month, day);

                AccountOperation operation = new AccountOperation();
                operation.setOperationDate(toDate(opDate));
                operation.setAmount(amount);
                operation.setType(credit ? OperationType.CREDIT : OperationType.DEBIT);
                operation.setDescription((credit ? CREDIT_DESCRIPTIONS[i % CREDIT_DESCRIPTIONS.length]
                        : DEBIT_DESCRIPTIONS[i % DEBIT_DESCRIPTIONS.length]) + " - " + owner);
                operation.setBankAccount(account);
                accountOperationRepository.save(operation);

                balance += credit ? amount : -Math.min(amount, Math.max(balance, 0));
            }
        }

        account.setBalance(Math.max(round(balance), 250));
        bankAccountRepository.save(account);
    }

    private Date toDate(LocalDate date) {
        return Date.from(date.atStartOfDay(ZoneId.systemDefault()).toInstant());
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private record DemoProfile(
            String name,
            double currentBalance,
            double savingBalance,
            double overDraft,
            double interestRate,
            AccountStatus savingStatus
    ) {
    }
}
