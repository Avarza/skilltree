package dev.skilltree;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class SkilltreeBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(SkilltreeBackendApplication.class, args);
	}

}
