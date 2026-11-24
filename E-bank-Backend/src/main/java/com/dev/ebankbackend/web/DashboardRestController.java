package com.dev.ebankbackend.web;

import com.dev.ebankbackend.dtos.BankAccountDTO;
import com.dev.ebankbackend.exceptions.BankAccountNotFoundException;
import com.dev.ebankbackend.services.BankAccountService;
import com.dev.ebankbackend.services.CustomerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@CrossOrigin("*")
public class DashboardRestController {

    @Autowired
    private BankAccountService bankAccountService;

    @Autowired
    private CustomerService customerService;

    @GetMapping("/dashboard/dataV1")
    public Map<String, Object> getDashboardDataV1() {
        Map<String, Object> dashboardData = new HashMap<>();

        List<BankAccountDTO> latestBankAccounts;
        try {
            latestBankAccounts = bankAccountService.getLatestBankAccounts();
        } catch (Exception ex) {
            latestBankAccounts = List.of();
            System.err.println("Failed to load latest bank accounts: " + ex.getMessage());
        }
        dashboardData.put("latestBankAccounts", latestBankAccounts != null ? latestBankAccounts : List.of());

        Double monthlyTransactionSum = bankAccountService.getMonthlyTransactionSum();
        dashboardData.put("monthlyTransactionSum", monthlyTransactionSum != null ? monthlyTransactionSum : 0.0);

        Double totalBalanceSum = bankAccountService.getTotalBalanceSum();
        dashboardData.put("totalBalanceSum", totalBalanceSum != null ? totalBalanceSum : 0.0);

        Long totalNumberOfBankAccounts = bankAccountService.getTotalNumberOfBankAccounts();
        dashboardData.put("totalNumberOfBankAccounts", totalNumberOfBankAccounts != null ? totalNumberOfBankAccounts : 0L);

        Long totalNumberOfCustomers = customerService.getTotalNumberOfCustomers();
        dashboardData.put("totalNumberOfCustomers", totalNumberOfCustomers != null ? totalNumberOfCustomers : 0L);

        return dashboardData;
    }

    @GetMapping("/dashboard/dataV2")
    public Map<String, Object> getDashboardDataV2() throws BankAccountNotFoundException {
        Map<String, Object> dashboardData = new HashMap<>();

        List<Map<String, Object>> dailyTransactionVolume = bankAccountService.getMonthlyTransactionVolume();
        List<Map<String, Object>> BankAccountsByType = bankAccountService.BankAccountsByType();
        dashboardData.put("dailyTransactionVolume", dailyTransactionVolume);
        dashboardData.put("bankAccountsByType", BankAccountsByType);


        return dashboardData;
    }
}

