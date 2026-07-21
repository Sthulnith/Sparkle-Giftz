# ─────────────────────────────────────────────────────────────
# Sparkle Giftz — Spring Boot Dockerfile (Java 21)
# Works for both Repo Root and Backend Subdirectory Build Contexts
# ─────────────────────────────────────────────────────────────

# Step 1: Build the JAR with Maven & OpenJDK 21
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY . .

# Detect if build context is root or backend directory
RUN if [ -f "./mvnw" ]; then \
        chmod +x ./mvnw && ./mvnw clean package -DskipTests; \
    elif [ -f "./backend/mvnw" ]; then \
        cd backend && chmod +x ./mvnw && ./mvnw clean package -DskipTests; \
    else \
        echo "Error: mvnw not found!" && exit 1; \
    fi

# Step 2: Lightweight JRE 21 Runtime image
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Copy the generated JAR file regardless of subfolder location
COPY --from=build /app/**/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
