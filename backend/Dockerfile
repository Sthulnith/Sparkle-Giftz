# ─────────────────────────────────────────────────────────────
# Sparkle Giftz — Spring Boot Dockerfile (Java 21 + Maven)
# ─────────────────────────────────────────────────────────────

# Step 1: Build the JAR using JDK 21 & Maven
FROM eclipse-temurin:21-jdk-alpine AS build
RUN apk add --no-cache maven

WORKDIR /app
COPY . .

# Build from root or backend directory depending on context
RUN if [ -f "pom.xml" ]; then \
        mvn clean package -DskipTests; \
    elif [ -f "backend/pom.xml" ]; then \
        cd backend && mvn clean package -DskipTests; \
    fi

# Step 2: Lightweight JRE 21 Runtime image
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Copy the compiled jar
COPY --from=build /app/**/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
