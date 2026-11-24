package com.dev.ebankbackend.repositories;


import com.dev.ebankbackend.entities.BankAccount;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface BankAccountRepository extends JpaRepository<BankAccount,String> {
    List<BankAccount> findByCustomer_Id(Long customerId);

    @Query("SELECT COALESCE(SUM(b.balance), 0) FROM BankAccount b")
    Double getTotalBalanceSum();

    @Query("SELECT COUNT(b) FROM BankAccount b")
    Long getTotalNumberOfBankAccounts();

    @EntityGraph(attributePaths = "customer")
    List<BankAccount> findTop5ByOrderByCreatedAtDesc();

    @Query("SELECT TYPE(b) AS type, COUNT(b) " +
            "FROM BankAccount b " +
            "GROUP BY TYPE(b)")
    List<Object[]> countBankAccountsByType();


}
