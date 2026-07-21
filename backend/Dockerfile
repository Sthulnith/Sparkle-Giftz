# ─────────────────────────────────────────────────────────────
# Sparkle Giftz — Spring Boot Dockerfile (Java 21)
# ─────────────────────────────────────────────────────────────

# Step 1: Build the JAR with Maven & OpenJDK 21
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY . .
RUN chmod +x ./mvnw
RUN ./mvnw clean package -DskipTests

# Step 2: Lightweight JRE 21 Runtime image
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
