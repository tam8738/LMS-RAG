package com.lmsrag.backend.config;

import javax.sql.DataSource;

import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Kiểm soát thời điểm chạy migration Flyway sau khi nguồn dữ liệu đã sẵn sàng.
 */
@Configuration
public class FlywayConfig {

    @Bean(initMethod = "migrate")
    public Flyway flyway(DataSource dataSource) {
        return Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .baselineOnMigrate(true)
                .baselineVersion("0")
                // Trong dev/docker cho phép edit migration đã apply (ví dụ V4) mà không cần repair thủ công.
                // KHÔNG dùng setting này trong production.
                .validateOnMigrate(false)
                .load();
    }

    @Bean
    public static BeanFactoryPostProcessor entityManagerDependsOnFlyway() {
        return beanFactory -> {
            if (beanFactory.containsBeanDefinition("entityManagerFactory")) {
                beanFactory.getBeanDefinition("entityManagerFactory").setDependsOn("flyway");
            }
        };
    }
}