package com.sparklegiftz.store;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.MutablePropertySources;
import org.springframework.core.env.PropertySource;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.HashMap;
import java.util.Map;

@SpringBootApplication
public class StoreApplication {

    public static void main(String[] args) {
        SpringApplication app = new SpringApplication(StoreApplication.class);
        app.addInitializers(new DatabaseUrlInitializer());
        app.run(args);
    }

    /**
     * Initializer to dynamically translate DATABASE_URL (standard Postgres URL format)
     * into Spring Boot JDBC configuration properties.
     */
    public static class DatabaseUrlInitializer implements ApplicationContextInitializer<ConfigurableApplicationContext> {
        @Override
        public void initialize(ConfigurableApplicationContext applicationContext) {
            String databaseUrl = System.getenv("DATABASE_URL");
            if (databaseUrl == null || databaseUrl.isEmpty()) {
                // If not set, let application.yml default values take over
                return;
            }

            try {
                // Replace postgres:// with hierarchy-friendly format if needed
                if (databaseUrl.startsWith("postgres://")) {
                    databaseUrl = databaseUrl.replace("postgres://", "postgresql://");
                }
                
                URI uri = new URI(databaseUrl);
                String username = "";
                String password = "";
                
                if (uri.getUserInfo() != null) {
                    String[] userInfo = uri.getUserInfo().split(":");
                    username = userInfo[0];
                    if (userInfo.length > 1) {
                        password = userInfo[1];
                    }
                }

                String host = uri.getHost();
                int port = uri.getPort();
                if (port == -1) {
                    port = 5432;
                }
                String path = uri.getPath();
                
                // Construct the JDBC URL. For Supabase/Render, we mandate SSL mode (require)
                String jdbcUrl = String.format("jdbc:postgresql://%s:%d%s?sslmode=require", host, port, path);

                Map<String, Object> dbProperties = new HashMap<>();
                dbProperties.put("spring.datasource.url", jdbcUrl);
                dbProperties.put("spring.datasource.username", username);
                dbProperties.put("spring.datasource.password", password);

                MutablePropertySources propertySources = applicationContext.getEnvironment().getPropertySources();
                PropertySource<?> databasePropertySource = new MapPropertySource("dbUrlProperties", dbProperties);
                propertySources.addFirst(databasePropertySource);
                
                System.out.println("Successfully initialized JDBC connection from DATABASE_URL.");
            } catch (URISyntaxException | IllegalArgumentException e) {
                System.err.println("Failed to parse DATABASE_URL: " + e.getMessage());
            }
        }
    }
}
